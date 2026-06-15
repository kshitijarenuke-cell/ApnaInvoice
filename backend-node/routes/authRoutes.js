const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth route connected",
  });
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const userResult = await pool.query(
      "SELECT * FROM user_profiles WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = userResult.rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    delete user.password;

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
});

router.post("/register", async (req, res) => {
  try {
    console.log("REGISTER BODY:", req.body);

    const {
      email,
      password,
      name,
      phone,
      whatsapp,
      strong_areas,
      strongAreas,
      signup_code,
      signupCode,
      roleCode,
    } = req.body;

    const finalSignupCode = signup_code || signupCode || roleCode;

    if (!email || !password || !name || !finalSignupCode) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and signup code are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = finalSignupCode.trim().toUpperCase();

    let roleToStore;

    if (normalizedCode === "ADMIN2026") {
      roleToStore = "admin";
    } else if (normalizedCode === "USER2026") {
      roleToStore = "user";
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid signup code",
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM user_profiles WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userResult = await pool.query(
      `INSERT INTO user_profiles
       (email, password, name, phone, whatsapp, strong_areas, role, designation, company_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, email, name, phone, whatsapp, strong_areas, role, designation, company_name, created_at, updated_at`,
      [
        normalizedEmail,
        hashedPassword,
        name,
        phone || null,
        whatsapp || null,
        strong_areas || strongAreas || null,
        roleToStore,
        roleToStore === "admin" ? "Admin" : "User",
        null,
      ]
    );

    const newUser = userResult.rows[0];

    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: newUser,
    });
  } catch (error) {
    console.error("Register full error:", error);

    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message || String(error),
    });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT id, email, name, phone, whatsapp, strong_areas, role, designation, company_name, signature_url, created_at, updated_at
       FROM user_profiles
       WHERE id = $1`,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: userResult.rows[0],
    });
  } catch (error) {
    console.error("Get me error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message,
    });
  }
});

router.put("/profile/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, whatsapp, strong_areas, signature_url } = req.body;

    if (req.user.id !== id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this profile",
      });
    }

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    const existingEmail = await pool.query(
      "SELECT id FROM user_profiles WHERE email = $1 AND id != $2",
      [email.trim().toLowerCase(), id]
    );

    if (existingEmail.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already used by another account",
      });
    }
const updatedUser = await pool.query(
  `UPDATE user_profiles
   SET name = $1,
       email = $2,
       phone = $3,
       whatsapp = $4,
       strong_areas = $5,
       signature_url = $6,
       updated_at = NOW()
   WHERE id = $7
   RETURNING id,
             email,
             name,
             phone,
             whatsapp,
             strong_areas,
             role,
             designation,
             company_name,
             signature_url,
             created_at,
             updated_at`,
  [
    name,
    email.trim().toLowerCase(),
    phone || null,
    whatsapp || null,
    strong_areas || null,
    signature_url || null,
    id,
  ]
);

    if (updatedUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser.rows[0],
    });
  } catch (error) {
    console.error("Update profile error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
});

router.get("/users", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "project_manager") {
      return res.status(403).json({
        success: false,
        message: "Only admin or project manager can view all users",
      });
    }

    const usersResult = await pool.query(
      `SELECT id, email, name, phone, whatsapp, strong_areas, role, designation, company_name, created_at, updated_at
FROM user_profiles
ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      users: usersResult.rows,
    });
  } catch (error) {
    console.error("Fetch users error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
});

router.put("/users/:id/role", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can update user roles",
      });
    }

    const allowedRoles = [
      "admin",
      "project_manager",
      "team_leader",
      "team_member",
      "provider",
      "user",
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }
const updatedUser = await pool.query(
  `UPDATE user_profiles
   SET role = $1,
       updated_at = NOW()
   WHERE id = $2
   RETURNING id, email, name, phone, whatsapp, strong_areas,
             role, designation, company_name, created_at, updated_at`,
  [role, id]
);
    
    if (updatedUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User role updated successfully",
      user: updatedUser.rows[0],
    });
  } catch (error) {
    console.error("Update role error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update role",
      error: error.message,
    });
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const userResult = await pool.query(
      "SELECT id, email FROM user_profiles WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    return res.status(200).json({
      success: true,
      exists: userResult.rows.length > 0,
    });
  } catch (error) {
    console.error("Verify email error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to verify email",
      error: error.message,
    });
  }
});

router.get("/users/:id/todos", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id !== id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const result = await pool.query(
      `SELECT id, title, completed, due_date, created_at
       FROM personal_todos
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    res.json({ success: true, todos: result.rows });
  } catch (error) {
    console.error("Fetch todos error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch todos" });
  }
});

router.post("/users/:userId/todos", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { title, due_date, completed } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Todo title is required",
      });
    }

    const result = await pool.query(
      `INSERT INTO personal_todos
       (user_id, title, due_date, completed, created_at)
       VALUES ($1::uuid, $2::text, $3::date, COALESCE($4::boolean, false), NOW())
       RETURNING *`,
      [
        userId,
        title,
        due_date || null,
        typeof completed === "boolean" ? completed : false,
      ]
    );

    res.status(201).json({
      success: true,
      todo: result.rows[0],
    });
  } catch (error) {
    console.error("Add todo error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add todo",
      error: error.message,
    });
  }
});

router.put("/users/:userId/todos/:todoId", authMiddleware, async (req, res) => {
  try {
    const { userId, todoId } = req.params;
    const { title, due_date, completed } = req.body;

   const result = await pool.query(
  `UPDATE personal_todos
   SET title = COALESCE($1::text, title),
       due_date = $2::date,
       completed = COALESCE($3::boolean, completed)
   WHERE id = $4::uuid AND user_id = $5::uuid
   RETURNING *`,
  [
    title ?? null,
    due_date || null,
    typeof completed === "boolean" ? completed : null,
    todoId,
    userId,
  ]
);


    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    res.json({
      success: true,
      todo: result.rows[0],
    });
  } catch (error) {
    console.error("Update todo error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update todo",
      error: error.message,
    });
  }
});

router.delete("/users/:id/todos/:todoId", authMiddleware, async (req, res) => {
  try {
    const { id, todoId } = req.params;

    if (req.user.id !== id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    await pool.query(
      `DELETE FROM personal_todos WHERE id = $1 AND user_id = $2`,
      [todoId, id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Delete todo error:", error);
    res.status(500).json({ success: false, message: "Failed to delete todo" });
  }
});


router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const userResult = await pool.query(
      "SELECT id FROM user_profiles WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Email address not found",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE user_profiles
       SET password = $1,
        
       WHERE email = $2`,
      [hashedPassword, email.trim().toLowerCase()]
    );

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
});

router.delete("/users/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can delete users",
      });
    }

    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const result = await pool.query(
      `DELETE FROM user_profiles
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
});

module.exports = router;