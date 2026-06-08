require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = require('../src/models/User');
const Project = require('../src/models/Project');
const CategoryEntity = require('../src/models/CategoryEntity');
const Payment = require('../src/models/Payment');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/siteledger';

const seed = async () => {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    console.error('Seed script must not run in production.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB for seeding...');

  const email = 'demo@siteledger.app';
  await User.deleteOne({ email });
  const existingUser = await User.findOne({ email });

  let user = existingUser;
  if (!user) {
    const passwordHash = await bcrypt.hash('Demo1234', 10);
    user = await User.create({
      name: 'Demo User',
      email,
      phone: '3001234567',
      country: 'PK',
      phoneCode: '+92',
      currency: 'PKR',
      passwordHash,
      companyName: 'SiteLedger Demo',
    });
    console.log('Created demo user:', email, '/ password: Demo1234');
  }

  await Payment.deleteMany({ userId: user._id });
  await CategoryEntity.deleteMany({ userId: user._id });
  await Project.deleteMany({ userId: user._id });

  const [projectA, projectB] = await Project.create([
    {
      userId: user._id,
      projectName: 'Gulberg Heights Tower',
      clientName: 'Ahmed Khan',
      clientPhone: '+92 300 1112233',
      location: 'Gulberg, Lahore',
      projectType: 'Residential',
      estimatedBudget: 5000000,
      status: 'active',
      startDate: new Date('2025-01-01'),
      expectedDays: 365,
    },
    {
      userId: user._id,
      projectName: 'DHA Commercial Plaza',
      clientName: 'Sara Builders',
      clientPhone: '+92 321 9988776',
      location: 'DHA Phase 5, Lahore',
      projectType: 'Commercial',
      estimatedBudget: 8500000,
      status: 'active',
      startDate: new Date('2025-03-01'),
      expectedDays: 540,
    },
  ]);

  const [contractor, material, labour] = await CategoryEntity.create([
    {
      userId: user._id,
      name: 'Ali Contractor',
      phone: '+92 333 4455667',
      category: 'Contractor',
      subCategory: 'Main Contractor',
    },
    {
      userId: user._id,
      name: 'Cement Supplier Co.',
      phone: '+92 342 1122334',
      category: 'Material',
      subCategory: 'Cement & Steel',
    },
    {
      userId: user._id,
      name: 'Mason Labour Team',
      phone: '+92 301 5566778',
      category: 'Labour',
      subCategory: 'Masonry',
    },
  ]);

  await Payment.create([
    {
      userId: user._id,
      projectId: projectA._id,
      paymentType: 'incoming_client_payment',
      clientName: 'Ahmed Khan',
      title: 'Advance Payment',
      totalAmount: 5000000,
      paidAmount: 2000000,
      remainingAmount: 3000000,
      paymentMethod: 'Bank Transfer',
      paymentDate: new Date('2025-02-01'),
      paidBy: 'Ahmed Khan',
      status: 'Partial',
    },
    {
      userId: user._id,
      projectId: projectA._id,
      paymentType: 'outgoing_payment',
      category: 'Contractor',
      categoryEntityId: contractor._id,
      title: 'Foundation Work',
      totalAmount: 800000,
      paidAmount: 500000,
      remainingAmount: 300000,
      paymentMethod: 'Cash',
      paymentDate: new Date('2025-02-15'),
      paidBy: 'Demo User',
      paidTo: 'Ali Contractor',
      status: 'Partial',
    },
    {
      userId: user._id,
      projectId: projectA._id,
      paymentType: 'outgoing_payment',
      category: 'Material',
      categoryEntityId: material._id,
      title: 'Cement Supply Batch 1',
      totalAmount: 350000,
      paidAmount: 350000,
      remainingAmount: 0,
      paymentMethod: 'Raast',
      paymentDate: new Date('2025-02-20'),
      paidBy: 'Demo User',
      paidTo: 'Cement Supplier Co.',
      status: 'Paid',
    },
    {
      userId: user._id,
      projectId: projectB._id,
      paymentType: 'incoming_client_payment',
      clientName: 'Sara Builders',
      title: 'Mobilization Payment',
      totalAmount: 8500000,
      paidAmount: 3000000,
      remainingAmount: 5500000,
      paymentMethod: 'Cheque',
      paymentDate: new Date('2025-03-10'),
      status: 'Partial',
    },
    {
      userId: user._id,
      projectId: projectB._id,
      paymentType: 'outgoing_payment',
      category: 'Labour',
      categoryEntityId: labour._id,
      title: 'Week 1 Labour',
      totalAmount: 120000,
      paidAmount: 120000,
      remainingAmount: 0,
      paymentMethod: 'Cash',
      paymentDate: new Date('2025-03-12'),
      paidBy: 'Demo User',
      paidTo: 'Mason Labour Team',
      status: 'Paid',
    },
    {
      userId: user._id,
      projectId: projectB._id,
      paymentType: 'outgoing_payment',
      category: 'Contractor',
      categoryEntityId: contractor._id,
      title: 'Structure Phase 1',
      totalAmount: 600000,
      paidAmount: 200000,
      remainingAmount: 400000,
      paymentMethod: 'Bank Transfer',
      paymentDate: new Date('2025-03-18'),
      paidBy: 'Demo User',
      paidTo: 'Ali Contractor',
      status: 'Partial',
    },
  ]);

  console.log('Seed complete:');
  console.log('- 2 projects');
  console.log('- 3 entities (Contractor, Material, Labour)');
  console.log('- 2 incoming + 4 outgoing payments');
  console.log('\nLogin: demo@siteledger.app / Demo1234');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
