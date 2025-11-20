import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  appliedAt: { type: Date, default: Date.now }
}, { _id: false });

const discountSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  eligibility: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  applications: [applicationSchema],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Discount', discountSchema);


