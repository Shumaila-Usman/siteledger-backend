require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = require('../src/models/User');
const Category = require('../src/models/Category');
const SubCategory = require('../src/models/SubCategory');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/siteledger';

const ADMIN_EMAIL = 'admin@siteledger.app';
const ADMIN_PASSWORD = 'SiteLedger@Admin1';

const DEFAULT_CATEGORIES = ['Contractor', 'Material', 'Labour', 'Overhead', 'Project Services'];

const run = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB...');

  // Create or update admin user
  let admin = await User.findOne({ email: ADMIN_EMAIL });
  if (admin) {
    admin.role = 'admin';
    admin.passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await admin.save();
    console.log('Admin account updated.');
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    admin = await User.create({
      name: 'Admin',
      email: ADMIN_EMAIL,
      phone: '0000000000',
      country: 'PK',
      phoneCode: '+92',
      currency: 'PKR',
      passwordHash,
      companyName: 'SiteLedger',
      role: 'admin',
    });
    console.log('Admin account created.');
  }

  // Seed global categories (userId: null)
  for (const name of DEFAULT_CATEGORIES) {
    const exists = await Category.findOne({ userId: null, name });
    if (!exists) {
      await Category.create({ userId: null, name });
      console.log(`Category created: ${name}`);
    }
  }

  console.log('\n✅ Done!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Admin Email   : ${ADMIN_EMAIL}`);
  console.log(`Admin Password: ${ADMIN_PASSWORD}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
