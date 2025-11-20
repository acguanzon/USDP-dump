import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

const signToken = (user) => {
  const payload = { id: user._id, role: user.role, name: user.name };
  const secret = process.env.JWT_SECRET || 'devsecret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn });
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });
    await User.create({ name, email, password, role: role === 'admin' ? 'admin' : 'user' });
    res.status(201).json({ message: 'Registered successfully' });
  } catch (e) { next(e); }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });
    const token = signToken(user);
    res.json({ token });
  } catch (e) { next(e); }
};

export const me = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json(user);
};


