import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/userModel.js';

dotenv.config();

async function ensureUser({ name, email, password, role }) {
  let user = await User.findOne({ email }).select('+password');
  if (!user) {
    await User.create({ name, email, password, role });
    console.log(`Created ${role} → ${email}`);
  } else {
    user.name = name;
    user.role = role;
    user.password = password; // will hash via pre-save hook
    await user.save();
    console.log(`Updated ${role} → ${email}`);
  }
}

async function run() {
  try {
    await connectDB();
    await ensureUser({
      name: 'UNOR Admin',
      email: 'admin@unor-ssg.edu',
      password: 'Admin123!',
      role: 'admin'
    });
    await ensureUser({
      name: 'UNOR Student',
      email: 'student@unor-ssg.edu',
      password: 'Student123!',
      role: 'user'
    });
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();


