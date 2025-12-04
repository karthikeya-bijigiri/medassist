/**
 * Seed Demo Data Script
 * 
 * Seeds the MongoDB database with demo data for testing and development.
 * Run with: node scripts/seed_demo_data.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medassist';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  name: String,
  password_hash: String,
  roles: [{ type: String, enum: ['user', 'admin', 'pharmacist', 'driver'] }],
  is_verified: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  addresses: [{
    label: String,
    address_line: String,
    city: String,
    pincode: String,
    lat: Number,
    lon: Number
  }],
  cart: [{
    medicine_id: mongoose.Schema.Types.ObjectId,
    pharmacy_id: mongoose.Schema.Types.ObjectId,
    qty: Number,
    price_at_add: Number
  }],
  wallet_balance: { type: Number, default: 0 }
});

// Pharmacy Schema
const pharmacySchema = new mongoose.Schema({
  pharmacist_user_id: mongoose.Schema.Types.ObjectId,
  name: String,
  address: String,
  geo: {
    type: { type: String, default: 'Point' },
    coordinates: [Number] // [longitude, latitude]
  },
  opening_hours: String,
  is_active: { type: Boolean, default: true },
  contact_phone: String,
  rating: { type: Number, default: 0 },
  rating_count: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

pharmacySchema.index({ geo: '2dsphere' });

// Medicine Schema
const medicineSchema = new mongoose.Schema({
  name: String,
  brand: String,
  generic_name: String,
  salt: String,
  dosage_form: String,
  strength: String,
  prescription_required: { type: Boolean, default: false },
  hsn_code: String,
  tags: [String],
  search_synonyms: [String],
  created_at: { type: Date, default: Date.now }
});

// Inventory Schema
const inventorySchema = new mongoose.Schema({
  pharmacy_id: mongoose.Schema.Types.ObjectId,
  medicine_id: mongoose.Schema.Types.ObjectId,
  batch_no: String,
  expiry_date: Date,
  quantity_available: Number,
  mrp: Number,
  selling_price: Number,
  reserved_qty: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

inventorySchema.index({ pharmacy_id: 1, medicine_id: 1, batch_no: 1 }, { unique: true });

// Define models
const User = mongoose.model('User', userSchema);
const Pharmacy = mongoose.model('Pharmacy', pharmacySchema);
const Medicine = mongoose.model('Medicine', medicineSchema);
const Inventory = mongoose.model('Inventory', inventorySchema);

// Demo Users
const demoUsers = [
  {
    email: 'admin@medassist.com',
    phone: '+919999990001',
    name: 'Admin User',
    password: 'admin123',
    roles: ['admin'],
    is_verified: true
  },
  {
    email: 'pharmacist@medassist.com',
    phone: '+919999990002',
    name: 'John Pharmacist',
    password: 'pharma123',
    roles: ['pharmacist'],
    is_verified: true
  },
  {
    email: 'driver_001@medassist.com',
    phone: '+919999990003',
    name: 'Driver One',
    password: 'driver123',
    roles: ['driver'],
    is_verified: true
  },
  {
    email: 'user1@example.com',
    phone: '+919999990004',
    name: 'Regular User 1',
    password: 'user123',
    roles: ['user'],
    is_verified: true,
    addresses: [{
      label: 'Home',
      address_line: '123 Main Street, Apartment 4B',
      city: 'Mumbai',
      pincode: '400001',
      lat: 19.0760,
      lon: 72.8777
    }]
  },
  {
    email: 'user2@example.com',
    phone: '+919999990005',
    name: 'Regular User 2',
    password: 'user123',
    roles: ['user'],
    is_verified: true,
    addresses: [{
      label: 'Office',
      address_line: '456 Business Park, Tower A',
      city: 'Bangalore',
      pincode: '560001',
      lat: 12.9716,
      lon: 77.5946
    }]
  }
];

// Demo Medicines (30 medicines with synonyms)
const demoMedicines = [
  // Pain Relief
  { name: 'Paracetamol 500mg', brand: 'Crocin', generic_name: 'Paracetamol', salt: 'Acetaminophen', dosage_form: 'Tablet', strength: '500mg', prescription_required: false, hsn_code: '3004', tags: ['pain-relief', 'fever', 'headache'], search_synonyms: ['crocin', 'tylenol', 'fever medicine', 'dolo'] },
  { name: 'Ibuprofen 400mg', brand: 'Brufen', generic_name: 'Ibuprofen', salt: 'Ibuprofen', dosage_form: 'Tablet', strength: '400mg', prescription_required: false, hsn_code: '3004', tags: ['pain-relief', 'anti-inflammatory'], search_synonyms: ['brufen', 'advil', 'pain killer'] },
  { name: 'Diclofenac 50mg', brand: 'Voveran', generic_name: 'Diclofenac', salt: 'Diclofenac Sodium', dosage_form: 'Tablet', strength: '50mg', prescription_required: true, hsn_code: '3004', tags: ['pain-relief', 'anti-inflammatory', 'arthritis'], search_synonyms: ['voveran', 'voltaren', 'muscle pain'] },
  { name: 'Aspirin 75mg', brand: 'Ecosprin', generic_name: 'Aspirin', salt: 'Acetylsalicylic Acid', dosage_form: 'Tablet', strength: '75mg', prescription_required: false, hsn_code: '3004', tags: ['pain-relief', 'blood-thinner', 'heart'], search_synonyms: ['ecosprin', 'disprin', 'blood thinner'] },
  
  // Cold & Flu
  { name: 'Cetirizine 10mg', brand: 'Zyrtec', generic_name: 'Cetirizine', salt: 'Cetirizine Hydrochloride', dosage_form: 'Tablet', strength: '10mg', prescription_required: false, hsn_code: '3004', tags: ['cold-flu', 'allergy', 'antihistamine'], search_synonyms: ['zyrtec', 'alerid', 'allergy medicine'] },
  { name: 'Levocetirizine 5mg', brand: 'Xyzal', generic_name: 'Levocetirizine', salt: 'Levocetirizine Dihydrochloride', dosage_form: 'Tablet', strength: '5mg', prescription_required: false, hsn_code: '3004', tags: ['cold-flu', 'allergy'], search_synonyms: ['xyzal', 'levocet'] },
  { name: 'Chlorpheniramine 4mg', brand: 'Avil', generic_name: 'Chlorpheniramine', salt: 'Chlorpheniramine Maleate', dosage_form: 'Tablet', strength: '4mg', prescription_required: false, hsn_code: '3004', tags: ['cold-flu', 'allergy', 'sedating'], search_synonyms: ['avil', 'polaramine'] },
  { name: 'Montelukast 10mg', brand: 'Singulair', generic_name: 'Montelukast', salt: 'Montelukast Sodium', dosage_form: 'Tablet', strength: '10mg', prescription_required: true, hsn_code: '3004', tags: ['cold-flu', 'asthma', 'allergy'], search_synonyms: ['singulair', 'montair', 'asthma medicine'] },
  
  // Vitamins & Supplements
  { name: 'Vitamin C 500mg', brand: 'Celin', generic_name: 'Ascorbic Acid', salt: 'Ascorbic Acid', dosage_form: 'Tablet', strength: '500mg', prescription_required: false, hsn_code: '3004', tags: ['vitamins', 'immunity', 'supplements'], search_synonyms: ['celin', 'limcee', 'vitamin c'] },
  { name: 'Vitamin D3 60000IU', brand: 'Calcirol', generic_name: 'Cholecalciferol', salt: 'Cholecalciferol', dosage_form: 'Capsule', strength: '60000IU', prescription_required: false, hsn_code: '3004', tags: ['vitamins', 'bone-health'], search_synonyms: ['calcirol', 'd3 60k', 'sunshine vitamin'] },
  { name: 'B-Complex', brand: 'Becosules', generic_name: 'Vitamin B Complex', salt: 'Multiple B Vitamins', dosage_form: 'Capsule', strength: 'Standard', prescription_required: false, hsn_code: '3004', tags: ['vitamins', 'energy', 'supplements'], search_synonyms: ['becosules', 'b complex', 'energy booster'] },
  { name: 'Iron + Folic Acid', brand: 'Autrin', generic_name: 'Ferrous Fumarate', salt: 'Ferrous Fumarate + Folic Acid', dosage_form: 'Tablet', strength: '100mg+0.5mg', prescription_required: false, hsn_code: '3004', tags: ['vitamins', 'anemia', 'supplements'], search_synonyms: ['autrin', 'iron tablet', 'folic acid'] },
  { name: 'Omega-3 Fish Oil', brand: 'Seven Seas', generic_name: 'Omega-3 Fatty Acids', salt: 'EPA+DHA', dosage_form: 'Capsule', strength: '1000mg', prescription_required: false, hsn_code: '3004', tags: ['vitamins', 'heart', 'supplements'], search_synonyms: ['seven seas', 'fish oil', 'omega 3'] },
  
  // Diabetes Care
  { name: 'Metformin 500mg', brand: 'Glycomet', generic_name: 'Metformin', salt: 'Metformin Hydrochloride', dosage_form: 'Tablet', strength: '500mg', prescription_required: true, hsn_code: '3004', tags: ['diabetes', 'blood-sugar'], search_synonyms: ['glycomet', 'glucophage', 'sugar medicine'] },
  { name: 'Glimepiride 2mg', brand: 'Amaryl', generic_name: 'Glimepiride', salt: 'Glimepiride', dosage_form: 'Tablet', strength: '2mg', prescription_required: true, hsn_code: '3004', tags: ['diabetes'], search_synonyms: ['amaryl', 'glimstar'] },
  { name: 'Sitagliptin 100mg', brand: 'Januvia', generic_name: 'Sitagliptin', salt: 'Sitagliptin Phosphate', dosage_form: 'Tablet', strength: '100mg', prescription_required: true, hsn_code: '3004', tags: ['diabetes', 'dpp4-inhibitor'], search_synonyms: ['januvia', 'istavel'] },
  
  // Heart Health
  { name: 'Atorvastatin 10mg', brand: 'Lipitor', generic_name: 'Atorvastatin', salt: 'Atorvastatin Calcium', dosage_form: 'Tablet', strength: '10mg', prescription_required: true, hsn_code: '3004', tags: ['heart', 'cholesterol'], search_synonyms: ['lipitor', 'atorva', 'cholesterol medicine'] },
  { name: 'Amlodipine 5mg', brand: 'Norvasc', generic_name: 'Amlodipine', salt: 'Amlodipine Besylate', dosage_form: 'Tablet', strength: '5mg', prescription_required: true, hsn_code: '3004', tags: ['heart', 'blood-pressure'], search_synonyms: ['norvasc', 'amlong', 'bp medicine'] },
  { name: 'Telmisartan 40mg', brand: 'Micardis', generic_name: 'Telmisartan', salt: 'Telmisartan', dosage_form: 'Tablet', strength: '40mg', prescription_required: true, hsn_code: '3004', tags: ['heart', 'blood-pressure'], search_synonyms: ['micardis', 'telma', 'blood pressure'] },
  { name: 'Clopidogrel 75mg', brand: 'Plavix', generic_name: 'Clopidogrel', salt: 'Clopidogrel Bisulfate', dosage_form: 'Tablet', strength: '75mg', prescription_required: true, hsn_code: '3004', tags: ['heart', 'blood-thinner'], search_synonyms: ['plavix', 'clopilet', 'blood thinner'] },
  
  // Skin Care
  { name: 'Clotrimazole Cream', brand: 'Candid', generic_name: 'Clotrimazole', salt: 'Clotrimazole', dosage_form: 'Cream', strength: '1%', prescription_required: false, hsn_code: '3004', tags: ['skincare', 'antifungal'], search_synonyms: ['candid', 'clotrimazole', 'fungal cream'] },
  { name: 'Betamethasone Cream', brand: 'Betnovate', generic_name: 'Betamethasone', salt: 'Betamethasone Valerate', dosage_form: 'Cream', strength: '0.1%', prescription_required: true, hsn_code: '3004', tags: ['skincare', 'steroid', 'anti-inflammatory'], search_synonyms: ['betnovate', 'steroid cream'] },
  { name: 'Ketoconazole Shampoo', brand: 'Nizoral', generic_name: 'Ketoconazole', salt: 'Ketoconazole', dosage_form: 'Shampoo', strength: '2%', prescription_required: false, hsn_code: '3004', tags: ['skincare', 'antifungal', 'dandruff'], search_synonyms: ['nizoral', 'ketoconazole', 'dandruff shampoo'] },
  
  // Gastrointestinal
  { name: 'Omeprazole 20mg', brand: 'Prilosec', generic_name: 'Omeprazole', salt: 'Omeprazole', dosage_form: 'Capsule', strength: '20mg', prescription_required: false, hsn_code: '3004', tags: ['gastrointestinal', 'acid-reflux'], search_synonyms: ['prilosec', 'omez', 'acidity medicine'] },
  { name: 'Pantoprazole 40mg', brand: 'Protonix', generic_name: 'Pantoprazole', salt: 'Pantoprazole Sodium', dosage_form: 'Tablet', strength: '40mg', prescription_required: false, hsn_code: '3004', tags: ['gastrointestinal', 'acid-reflux'], search_synonyms: ['protonix', 'pan 40', 'acid reducer'] },
  { name: 'Domperidone 10mg', brand: 'Motilium', generic_name: 'Domperidone', salt: 'Domperidone', dosage_form: 'Tablet', strength: '10mg', prescription_required: false, hsn_code: '3004', tags: ['gastrointestinal', 'nausea'], search_synonyms: ['motilium', 'domstal', 'vomiting medicine'] },
  { name: 'Ondansetron 4mg', brand: 'Zofran', generic_name: 'Ondansetron', salt: 'Ondansetron Hydrochloride', dosage_form: 'Tablet', strength: '4mg', prescription_required: true, hsn_code: '3004', tags: ['gastrointestinal', 'nausea', 'vomiting'], search_synonyms: ['zofran', 'emeset', 'anti-nausea'] },
  
  // Antibiotics
  { name: 'Amoxicillin 500mg', brand: 'Amoxil', generic_name: 'Amoxicillin', salt: 'Amoxicillin Trihydrate', dosage_form: 'Capsule', strength: '500mg', prescription_required: true, hsn_code: '3004', tags: ['antibiotic'], search_synonyms: ['amoxil', 'mox', 'antibiotic'] },
  { name: 'Azithromycin 500mg', brand: 'Zithromax', generic_name: 'Azithromycin', salt: 'Azithromycin Dihydrate', dosage_form: 'Tablet', strength: '500mg', prescription_required: true, hsn_code: '3004', tags: ['antibiotic'], search_synonyms: ['zithromax', 'azee', 'azithral'] },
  { name: 'Ciprofloxacin 500mg', brand: 'Cipro', generic_name: 'Ciprofloxacin', salt: 'Ciprofloxacin Hydrochloride', dosage_form: 'Tablet', strength: '500mg', prescription_required: true, hsn_code: '3004', tags: ['antibiotic', 'uti'], search_synonyms: ['cipro', 'ciplox', 'fluoroquinolone'] }
];

// Demo Pharmacies
const demoPharmacies = [
  {
    name: 'HealthPlus Pharmacy',
    address: '123 Medical Street, Andheri West, Mumbai 400058',
    geo: {
      type: 'Point',
      coordinates: [72.8311, 19.1197] // [lon, lat]
    },
    opening_hours: '8:00 AM - 10:00 PM',
    is_active: true,
    contact_phone: '+912226789012',
    rating: 4.5,
    rating_count: 256
  },
  {
    name: 'MedCare Drugstore',
    address: '456 Health Avenue, Koramangala, Bangalore 560034',
    geo: {
      type: 'Point',
      coordinates: [77.6245, 12.9352] // [lon, lat]
    },
    opening_hours: '24 Hours',
    is_active: true,
    contact_phone: '+918045678901',
    rating: 4.8,
    rating_count: 512
  }
];

// Helper function to generate random batch number
function generateBatchNo() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  let result = '';
  for (let i = 0; i < 3; i++) result += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 6; i++) result += numbers[Math.floor(Math.random() * numbers.length)];
  return result;
}

// Helper function to generate expiry date
function generateExpiryDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + Math.floor(Math.random() * 24) + 6); // 6-30 months from now
  return date;
}

// Seed function
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');
    
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Pharmacy.deleteMany({});
    await Medicine.deleteMany({});
    await Inventory.deleteMany({});
    console.log('✓ Existing data cleared\n');
    
    // Seed Users
    console.log('👥 Seeding users...');
    const createdUsers = [];
    for (const userData of demoUsers) {
      const password_hash = await bcrypt.hash(userData.password, BCRYPT_ROUNDS);
      const user = new User({
        ...userData,
        password_hash
      });
      delete user.password;
      await user.save();
      createdUsers.push(user);
      console.log(`  ✓ Created user: ${userData.email}`);
    }
    console.log(`✓ ${createdUsers.length} users created\n`);
    
    // Seed Pharmacies
    console.log('🏥 Seeding pharmacies...');
    const pharmacistUser = createdUsers.find(u => u.roles.includes('pharmacist'));
    const createdPharmacies = [];
    for (const pharmacyData of demoPharmacies) {
      const pharmacy = new Pharmacy({
        ...pharmacyData,
        pharmacist_user_id: pharmacistUser._id
      });
      await pharmacy.save();
      createdPharmacies.push(pharmacy);
      console.log(`  ✓ Created pharmacy: ${pharmacyData.name}`);
    }
    console.log(`✓ ${createdPharmacies.length} pharmacies created\n`);
    
    // Seed Medicines
    console.log('💊 Seeding medicines...');
    const createdMedicines = [];
    for (const medicineData of demoMedicines) {
      const medicine = new Medicine(medicineData);
      await medicine.save();
      createdMedicines.push(medicine);
      console.log(`  ✓ Created medicine: ${medicineData.name}`);
    }
    console.log(`✓ ${createdMedicines.length} medicines created\n`);
    
    // Seed Inventory
    console.log('📦 Seeding inventory...');
    let inventoryCount = 0;
    for (const pharmacy of createdPharmacies) {
      // Each pharmacy has ~20 random medicines
      const shuffledMedicines = [...createdMedicines].sort(() => Math.random() - 0.5);
      const pharmacyMedicines = shuffledMedicines.slice(0, 20);
      
      for (const medicine of pharmacyMedicines) {
        const mrp = Math.floor(Math.random() * 500) + 20; // MRP between 20 and 520
        const inventory = new Inventory({
          pharmacy_id: pharmacy._id,
          medicine_id: medicine._id,
          batch_no: generateBatchNo(),
          expiry_date: generateExpiryDate(),
          quantity_available: Math.floor(Math.random() * 100) + 10,
          mrp: mrp,
          selling_price: Math.floor(mrp * (0.85 + Math.random() * 0.1)), // 85-95% of MRP
          reserved_qty: 0
        });
        await inventory.save();
        inventoryCount++;
      }
    }
    console.log(`✓ ${inventoryCount} inventory items created\n`);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Database seeding completed successfully!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n📝 Demo Credentials:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('Admin:       admin@medassist.com / admin123');
    console.log('Pharmacist:  pharmacist@medassist.com / pharma123');
    console.log('Driver:      driver_001@medassist.com / driver123');
    console.log('User 1:      user1@example.com / user123');
    console.log('User 2:      user2@example.com / user123');
    console.log('─────────────────────────────────────────────────────────────\n');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Run the seed function
seedDatabase();
