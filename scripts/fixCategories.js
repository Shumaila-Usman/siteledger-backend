require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/siteledger';

const CORRECT_CATEGORIES = ['Contractor', 'Material', 'Labour', 'Overhead', 'Project Services'];

const run = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB Atlas...');

  const db = mongoose.connection.db;

  // ── 1. Fix global categories (userId: null) ────────────────────────────
  const CatCollection = db.collection('categories');

  // Delete all global categories and recreate correctly
  await CatCollection.deleteMany({ userId: null });
  console.log('Deleted old global categories');

  for (const name of CORRECT_CATEGORIES) {
    await CatCollection.insertOne({ userId: null, name, createdAt: new Date(), updatedAt: new Date() });
    console.log(`Created category: ${name}`);
  }

  // ── 2. Rename "Drawing" → "Project Services" in all collections ────────
  const collections = [
    { name: 'categories', field: 'name' },
    { name: 'subcategories', field: 'category' },
    { name: 'categoryentities', field: 'category' },
    { name: 'payments', field: 'category' },
  ];

  for (const col of collections) {
    const collection = db.collection(col.name);
    const result = await collection.updateMany(
      { [col.field]: 'Drawing' },
      { $set: { [col.field]: 'Project Services' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`Updated ${result.modifiedCount} docs in ${col.name}: Drawing → Project Services`);
    }
  }

  // ── 3. Remove "Other" category from all collections ───────────────────
  for (const col of collections) {
    const collection = db.collection(col.name);
    const result = await collection.deleteMany({ [col.field]: 'Other' });
    if (result.deletedCount > 0) {
      console.log(`Removed ${result.deletedCount} "Other" docs from ${col.name}`);
    }
  }

  // ── 4. Activate all pending users (non-admin) ─────────────────────────
  const users = db.collection('users');
  const activateResult = await users.updateMany(
    { status: 'pending', role: { $ne: 'admin' } },
    { $set: { status: 'active' } }
  );
  if (activateResult.modifiedCount > 0) {
    console.log(`Activated ${activateResult.modifiedCount} pending users`);
  }

  console.log('\n✅ All done!');
  console.log('Categories:', CORRECT_CATEGORIES.join(', '));

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
