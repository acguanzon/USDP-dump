import User from '../models/userModel.js';
import Discount from '../models/discountModel.js';
import Token from '../models/tokenModel.js';

export const listActiveDiscounts = async (req, res, next) => {
  try {
    const discounts = await Discount.find({ isActive: true }).select('-applications');
    res.json(discounts);
  } catch (e) { next(e); }
};

export const applyToDiscount = async (req, res, next) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount || !discount.isActive) return res.status(404).json({ message: 'Discount not found' });
    const already = discount.applications.find(a => a.user.toString() === req.user._id.toString());
    if (already) return res.status(400).json({ message: 'Already applied' });
    discount.applications.push({ user: req.user._id, status: 'pending' });
    await discount.save();
    res.status(201).json({ message: 'Application submitted' });
  } catch (e) { next(e); }
};

export const myApplications = async (req, res, next) => {
  try {
    const discounts = await Discount.find({ 'applications.user': req.user._id })
      .select('title applications');
    const result = [];
    discounts.forEach(d => {
      d.applications.forEach(a => {
        if (a.user.toString() === req.user._id.toString()) {
          result.push({
            discountId: d._id,
            title: d.title,
            status: a.status,
            appliedAt: a.appliedAt
          });
        }
      });
    });
    res.json(result);
  } catch (e) { next(e); }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (e) { next(e); }
};

export const updateProfile = async (req, res, next) => {
  try {
    const allowed = { name: req.body.name };
    const user = await User.findByIdAndUpdate(req.user._id, allowed, { new: true }).select('-password');
    res.json(user);
  } catch (e) { next(e); }
};

export const redeemToken = async (req, res, next) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ message: 'Code is required' });
    const token = await Token.findOne({ code });
    if (!token) return res.status(404).json({ message: 'Invalid code' });
    if (token.isUsed) return res.status(400).json({ message: 'Code already used' });
    if (token.expiresAt && token.expiresAt < new Date()) return res.status(400).json({ message: 'Code expired' });
    const discount = await Discount.findById(token.discount);
    if (!discount || !discount.isActive) return res.status(400).json({ message: 'Discount not available' });
    const already = discount.applications.find(a => a.user.toString() === req.user._id.toString());
    if (already) return res.status(400).json({ message: 'You already applied for this discount' });

    token.isUsed = true;
    token.usedBy = req.user._id;
    token.usedAt = new Date();
    await token.save();

    discount.applications.push({ user: req.user._id, status: 'approved' });
    await discount.save();

    res.json({ message: 'Token redeemed. Application approved.' });
  } catch (e) { next(e); }
};


