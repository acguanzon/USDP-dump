import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  discount: { type: mongoose.Schema.Types.ObjectId, ref: 'Discount', required: true },
  isUsed: { type: Boolean, default: false },
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  usedAt: { type: Date, default: null },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  issuedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  expiresAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Token', tokenSchema);


