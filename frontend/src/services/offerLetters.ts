export interface OfferLetter {
  id: string;
  created_by: string;
  candidate_name: string;
  candidate_email: string;
  position_title: string;
  department: string;
  issue_date: string;
  acceptance_deadline: string;
  status: string;
  pdf_url: string | null;
  created_at: string;
}

export interface CreateOfferLetterData {
  candidate_name: string;
  candidate_email: string;
  position_title: string;
  department: string;
  issue_date: string;
  acceptance_deadline: string;
  status?: string;
  pdf_url?: string | null;
}

export interface UpdateOfferLetterData {
  candidate_name?: string;
  candidate_email?: string;
  position_title?: string;
  department?: string;
  issue_date?: string;
  acceptance_deadline?: string;
  status?: string;
  pdf_url?: string | null;
}

const API_URL = 'http://localhost:5001/api';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const getOfferLetters = async () => {
  const response = await fetch(`${API_URL}/offer-letters`, {
    headers: getHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch offer letters');
  }

  return data.offerLetters as OfferLetter[];
};

export const getOfferLetterById = async (id: string) => {
  const response = await fetch(`${API_URL}/offer-letters/${id}`, {
    headers: getHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch offer letter');
  }

  return data.offerLetter as OfferLetter | null;
};

export const createOfferLetter = async (offerData: CreateOfferLetterData) => {
  const response = await fetch(`${API_URL}/offer-letters`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(offerData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to create offer letter');
  }

  return data.offerLetter as OfferLetter;
};

export const updateOfferLetter = async (
  id: string,
  offerData: UpdateOfferLetterData
) => {
  const response = await fetch(`${API_URL}/offer-letters/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(offerData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to update offer letter');
  }

  return data.offerLetter as OfferLetter;
};

export const deleteOfferLetter = async (id: string) => {
  const response = await fetch(`${API_URL}/offer-letters/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete offer letter');
  }

  return { success: true };
};