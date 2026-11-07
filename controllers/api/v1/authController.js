import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import db from '../../../config/database.js';
import { sendSuccess, sendError } from '../../../services/api/responseService.js';

export async function apiLogin(req, res) {
  const { username, password, client_type } = req.body;

  if (!username || !password) {
    return sendError(res, 'Username and password are required', 'VALIDATION_ERROR', 422);
  }

  // client_type validate karein (desktop ya android)
  const validClients = ['desktop', 'android'];
  const clientType = validClients.includes(client_type) ? client_type : 'desktop';

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
    
    if (!user) {
      return sendError(res, 'Invalid credentials', 'UNAUTHORIZED', 401);
    }

    const isValid = await argon2.verify(user.password_hash, password);
    if (!isValid) {
      return sendError(res, 'Invalid credentials', 'UNAUTHORIZED', 401);
    }

    // Token payload
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      display_name: user.display_name,
      client_type: clientType // Desktop ya Android yahan save ho raha hai
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-jwt-secret', { expiresIn: '12h' });

    return sendSuccess(res, { token, user: payload }, 'Login successful');
  } catch (err) {
    console.error('API Login Error:', err);
    return sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
}