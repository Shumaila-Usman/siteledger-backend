require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/siteledger';

mongoose.connect(MONGODB_URI).then(async () => {
  const result = await User.updateMany(
    { status: 'pending', role: { $ne: 'admin' } },
    { status: 'active' }
  );
  console.log(`✅ Updated ${result.modifiedCount} pending users to active`);
  await mongoose.disconnect();
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
