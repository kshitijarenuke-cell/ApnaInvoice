const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const smsService = require('../mailService');

const router = express.Router();


const pendingOtps = {}; // key: pendingToken (we'll use phone), value: { otp, expiresAt, name }
const OTP_EXPIRY_MS = (Number(process.env.OTP_EXPIRY_MIN) || 5) * 60 * 1000;

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth route connected",
  });
});


router.post('/signup-send-otp', async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone is required' });
    const pendingToken = phone.trim();
    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const expiresAt = Date.now() + OTP_EXPIRY_MS;
    pendingOtps[pendingToken] = { otp, expiresAt, name: name ? String(name).trim() : '' };

    const expiryMinutes = Math.round(OTP_EXPIRY_MS / 60000);
    const smsResult = await smsService.sendOtpToPhone(pendingToken, otp, { expiryMinutes });

    const resp = { success: true, pendingToken, maskedPhone: smsService.maskPhone(pendingToken) };
    if (smsResult && smsResult.debug) resp.debugOtp = otp;
    return res.json(resp);
  } catch (err) {
    console.error('signup-send-otp error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});



router.post('/verify-otp', async (req, res) => {
  try {
    const { pendingToken, otp } = req.body;

    if (!pendingToken || !otp) {
      return res.status(400).json({ success: false, message: 'Pending token and OTP are required' });
    }

    
    if (pendingOtps[pendingToken]) {
      const entry = pendingOtps[pendingToken];
      if (Date.now() > entry.expiresAt) {
        delete pendingOtps[pendingToken];
        return res.status(400).json({ success: false, message: 'OTP expired' });
      }
      if (String(entry.otp) !== String(otp)) {
        return res.status(401).json({ success: false, message: 'Invalid OTP' });
      }
      // Success - issue a demo JWT and return a minimal user object
      const token = jwt.sign({ phone: pendingToken, name: entry.name, demo: true }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
      const user = { phone: pendingToken, name: entry.name };
      delete pendingOtps[pendingToken];
      return res.json({ success: true, message: 'Verified', token, user });
    }

    const rowRes = await pool.query('SELECT * FROM otp_codes WHERE pending_token = $1', [pendingToken]);
    if (rowRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    const row = rowRes.rows[0];

    if (new Date(row.expires_at) < new Date()) {
      // cleanup
      await pool.query('DELETE FROM otp_codes WHERE id = $1', [row.id]);
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    const isMatch = await bcrypt.compare(String(otp), row.otp_hash);

    if (!isMatch) {
      await pool.query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1', [row.id]);
      const attempts = row.attempts + 1;
      if (attempts >= (Number(process.env.MAX_OTP_ATTEMPTS) || 5)) {
        await pool.query('DELETE FROM otp_codes WHERE id = $1', [row.id]);
        return res.status(403).json({ success: false, message: 'Too many failed attempts' });
      }
      return res.status(401).json({ success: false, message: 'Invalid OTP' });
    }

    // OTP valid - issue JWT
    const userResult = await pool.query('SELECT id, email, name, phone, whatsapp, strong_areas, role, designation, company_name, created_at, updated_at FROM user_profiles WHERE id = $1', [row.user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userResult.rows[0];

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });

    // cleanup OTP row
    await pool.query('DELETE FROM otp_codes WHERE id = $1', [row.id]);

    return res.json({ success: true, message: 'Verified', token, user });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
  }
});

// Resend OTP for a pending token
router.post('/resend-otp', async (req, res) => {
  try {
    const { pendingToken } = req.body;
    if (!pendingToken) return res.status(400).json({ success: false, message: 'Pending token required' });

    const rowRes = await pool.query('SELECT * FROM otp_codes WHERE pending_token = $1', [pendingToken]);
    if (rowRes.rows.length === 0) return res.status(400).json({ success: false, message: 'Invalid token' });

    const row = rowRes.rows[0];
    // generate new OTP
    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const otpHash = await bcrypt.hash(otp, 10);
    const expiryMinutes = Number(process.env.OTP_EXPIRY_MIN || 5);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await pool.query('UPDATE otp_codes SET otp_hash = $1, attempts = 0, expires_at = $2 WHERE id = $3', [otpHash, expiresAt, row.id]);

    try {
      const userRes = await pool.query('SELECT phone, whatsapp FROM user_profiles WHERE id = $1', [row.user_id]);
      if (userRes.rows.length) {
        const phone = userRes.rows[0].phone || userRes.rows[0].whatsapp || null;
        if (phone) {
          await smsService.sendOtpToPhone(phone, otp, { expiryMinutes });
        } else {
          // fallback to dev preview
          await smsService.sendOtpToPhone(process.env.DEV_RECEIVER_PHONE || '+0000000000', otp, { expiryMinutes });
        }
      }
    } catch (smsErr) {
      console.error('Error resending OTP SMS:', smsErr);
    }

    return res.json({ success: true, message: 'OTP resent' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ success: false, message: 'Resend failed', error: error.message });
  }
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

    // Generate OTP and store pending verification (phone-based OTP)
    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const pendingToken = uuidv4();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiryMinutes = Number(process.env.OTP_EXPIRY_MIN || 5);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await pool.query(
      `INSERT INTO otp_codes (user_id, otp_hash, pending_token, expires_at) VALUES ($1,$2,$3,$4)`,
      [user.id, otpHash, pendingToken, expiresAt]
    );

    try {
      // prefer phone number if available
      const phone = user.phone || user.whatsapp || null;
      if (phone) {
        await smsService.sendOtpToPhone(phone, otp, { expiryMinutes });
      } else {
        // fallback to email preview if no phone
        await smsService.sendOtpToPhone(process.env.DEV_RECEIVER_PHONE || '+0000000000', otp, { expiryMinutes });
      }
    } catch (smsErr) {
      console.error('Error sending OTP SMS:', smsErr);
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent',
      pendingToken,
      maskedPhone: smsService.maskPhone(user.phone || user.whatsapp || ''),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error && error.message ? error.message : String(error),
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
      `SELECT id, email, name, phone, whatsapp, strong_areas, role, designation, company_name, created_at, updated_at
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
    const { name, email, phone, whatsapp, strong_areas } = req.body;

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
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, email, name, phone, whatsapp, strong_areas, role, designation, company_name, created_at, updated_at`,
      [
        name,
        email.trim().toLowerCase(),
        phone || null,
        whatsapp || null,
        strong_areas || null,
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
       RETURNING id, email, name, phone, whatsapp, strong_areas, role, designation, company_name, created_at, updated_at`,
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