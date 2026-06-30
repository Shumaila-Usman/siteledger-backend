require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/siteledger';

const SUB_CATEGORIES = {
  'Project Services': [
    'Land Purchase', 'Land Transfer / Registry', 'Site Survey', 'Soil Investigation',
    'Soil Test', 'Concrete Test', 'Cube Test', 'Steel Test', 'Water Test',
    'Architectural Design', 'Structural Design', 'MEP Design', 'Interior Design',
    'Drawings', 'Shop Drawings', 'BOQ Preparation', 'Quantity Surveying',
    'Printing & Plotting', 'Documentation', 'Government Fees', 'NOC Fees',
    'Approval Fees', 'Consultancy Fees', 'Laboratory Testing', 'Site Inspection',
    'Drone Survey', 'Miscellaneous Services',
  ],
  'Contractor': [
    'Excavation Contractor', 'Grey Structure Contractor', 'Masonry Contractor',
    'Concrete Contractor', 'Steel Fixing Contractor', 'Formwork Contractor',
    'Waterproofing Contractor', 'Marble Contractor', 'Tile Contractor',
    'Ceiling Contractor', 'Paint Contractor', 'Aluminium Contractor',
    'Glass Contractor', 'Woodwork Contractor', 'Joinery Contractor',
    'Kitchen Contractor', 'Electrical Contractor', 'Plumbing Contractor',
    'HVAC Contractor', 'Fire Fighting Contractor', 'Lift Contractor',
    'Solar Contractor', 'Landscaping Contractor', 'Boundary Wall Contractor',
    'Road Works Contractor', 'Other Contractors',
  ],
  'Material': [
    'Cement', 'Sand', 'Crush', 'Aggregate', 'Concrete', 'Steel Reinforcement',
    'Binding Wire', 'Bricks', 'Blocks', 'Stone', 'Waterproofing Material',
    'Electrical Material', 'Plumbing Material', 'Sanitary Material', 'HVAC Material',
    'Fire Fighting Material', 'Paint Material', 'Ceiling Material', 'Gypsum Board',
    'Tile & Adhesive', 'Marble & Granite', 'Glass', 'Aluminium', 'Wood & Timber',
    'Doors & Frames', 'Windows', 'Hardware & Fittings', 'Chemicals & Admixtures',
    'Insulation Material', 'Roofing Material', 'Landscaping Material',
    'Miscellaneous Material',
  ],
  'Labour': [
    'Mason', 'Helper', 'Carpenter', 'Steel Fixer', 'Shuttering Carpenter',
    'Electrician', 'Plumber', 'Tile Mason', 'Marble Mason', 'Painter', 'Welder',
    'Fabricator', 'Aluminium Installer', 'Glass Installer', 'Ceiling Installer',
    'Waterproofing Labour', 'HVAC Technician', 'Fire Fighting Technician',
    'Machine Operator', 'Excavator Operator', 'Surveyor', 'Site Supervisor',
    'General Labour', 'Cleaning Labour', 'Security Staff', 'Other Labour',
  ],
  'Overhead': [
    'Office Rent', 'Site Office', 'Electricity', 'Water', 'Internet', 'Telephone',
    'Fuel', 'Vehicle Expenses', 'Generator', 'Equipment Rental', 'Machinery Rental',
    'Office Supplies', 'Stationery', 'Printing', 'Software Subscription',
    'Staff Salaries', 'Accommodation', 'Food & Refreshments', 'Security', 'Cleaning',
    'Government Fees', 'Bank Charges', 'Insurance', 'Medical Expenses',
    'Miscellaneous Expenses',
  ],
};

const run = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB Atlas...\n');

  const db = mongoose.connection.db;
  const col = db.collection('subcategories');

  // Remove all existing global subcategories
  const deleted = await col.deleteMany({ userId: null });
  console.log(`Removed ${deleted.deletedCount} old global subcategories\n`);

  let totalInserted = 0;

  for (const [category, subCats] of Object.entries(SUB_CATEGORIES)) {
    const docs = subCats.map(name => ({
      userId: null,
      category,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    await col.insertMany(docs);
    console.log(`✅ ${category}: ${docs.length} sub-types added`);
    totalInserted += docs.length;
  }

  console.log(`\n✅ Done! Total: ${totalInserted} sub-types seeded across 5 categories.`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
