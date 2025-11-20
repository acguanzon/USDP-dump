import User from '../models/userModel.js';
import Discount from '../models/discountModel.js';
import Token from '../models/tokenModel.js';
import crypto from 'crypto';

export const listUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (e) { next(e); }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already exists' });
    const user = await User.create({ name, email, password, role: role === 'admin' ? 'admin' : 'user' });
    res.status(201).json({ id: user._id });
  } catch (e) { next(e); }
};

export const updateUser = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.password) delete updates.password;
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    res.json(user);
  } catch (e) { next(e); }
};

export const deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
};

export const createDiscount = async (req, res, next) => {
  try {
    const discount = await Discount.create(req.body);
    res.status(201).json(discount);
  } catch (e) { next(e); }
};

export const listDiscounts = async (req, res, next) => {
  try {
    const discounts = await Discount.find();
    res.json(discounts);
  } catch (e) { next(e); }
};

export const updateDiscount = async (req, res, next) => {
  try {
    const discount = await Discount.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(discount);
  } catch (e) { next(e); }
};

export const deleteDiscount = async (req, res, next) => {
  try {
    await Discount.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
};

const generateCode = (prefix = 'UNOR') => {
  const bytes = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${bytes}`;
};

export const generateTokensForDiscount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { count = 1, prefix = 'UNOR', expiresAt } = req.body || {};
    const discount = await Discount.findById(id);
    if (!discount) return res.status(404).json({ message: 'Discount not found' });
    const toCreate = Math.max(1, Math.min(Number(count) || 1, 1000));
    const docs = [];
    for (let i = 0; i < toCreate; i++) {
      let code;
      // Ensure uniqueness attempts
      for (let tries = 0; tries < 5; tries++) {
        code = generateCode(prefix);
        const exists = await Token.findOne({ code });
        if (!exists) break;
      }
      docs.push({ code, discount: discount._id, issuedBy: req.user._id, expiresAt: expiresAt ? new Date(expiresAt) : null });
    }
    const created = await Token.insertMany(docs);
    res.status(201).json({ tokens: created.map(t => ({ code: t.code, expiresAt: t.expiresAt })) });
  } catch (e) { next(e); }
};

export const listTokensForDiscount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tokens = await Token.find({ discount: id }).select('-__v').sort({ createdAt: -1 });
    res.json(tokens);
  } catch (e) { next(e); }
};


