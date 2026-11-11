import type {
  AuditLog,
  Batch,
  Brand,
  Category,
  Customer,
  Expense,
  Manufacturer,
  Medicine,
  NotificationItem,
  Payment,
  PharmacySettings,
  Prescription,
  Purchase,
  PurchaseReturn,
  Sale,
  SalesReturn,
  StockAdjustment,
  Supplier,
  User,
} from "./types";
import { getLiveRecords, isLiveDataAvailable, liveArray } from "./dataRuntime";

// =====================================================================
//  MediCare — static dummy data. Fictional but realistic.
//  Reference "today" for the prototype: 2026-09-26.
// =====================================================================

const SAMPLE_CATEGORIES: Category[] = [
  { id: "c1", name: "Pain Relief", description: "Analgesics & anti-inflammatory", medicineCount: 6, color: "#6366f1" },
  { id: "c2", name: "Vitamins & Supplements", description: "Nutritional support", medicineCount: 5, color: "#10b981" },
  { id: "c3", name: "Antibiotics", description: "Bacterial infection treatment", medicineCount: 5, color: "#f59e0b" },
  { id: "c4", name: "Diabetes Care", description: "Blood sugar management", medicineCount: 3, color: "#ef4444" },
  { id: "c5", name: "Cold & Flu", description: "Respiratory relief", medicineCount: 4, color: "#3b82f6" },
  { id: "c6", name: "Cardiac Care", description: "Heart & blood pressure", medicineCount: 3, color: "#8b5cf6" },
  { id: "c7", name: "Gastro & Digestive", description: "Stomach & digestion", medicineCount: 3, color: "#14b8a6" },
  { id: "c8", name: "Skin Care", description: "Dermatological products", medicineCount: 2, color: "#ec4899" },
  { id: "c9", name: "Eye & Ear Care", description: "Drops & ophthalmics", medicineCount: 1, color: "#0ea5e9" },
  { id: "c10", name: "First Aid", description: "Wound & emergency care", medicineCount: 2, color: "#f97316" },
];

const SAMPLE_MANUFACTURERS: Manufacturer[] = [
  { id: "m1", name: "GSK Pharmaceuticals", country: "Pakistan", contact: "+92 21 111 475 725", productCount: 6 },
  { id: "m2", name: "Abbott Laboratories", country: "Pakistan", contact: "+92 21 111 222 333", productCount: 5 },
  { id: "m3", name: "Getz Pharma", country: "Pakistan", contact: "+92 21 111 436 937", productCount: 4 },
  { id: "m4", name: "Sanofi Aventis", country: "France", contact: "+92 21 111 726 634", productCount: 3 },
  { id: "m5", name: "Martin Dow", country: "Pakistan", contact: "+92 21 111 627 846", productCount: 4 },
  { id: "m6", name: "Pfizer Pakistan", country: "USA", contact: "+92 21 111 733 733", productCount: 4 },
  { id: "m7", name: "Highnoon Labs", country: "Pakistan", contact: "+92 42 111 446 666", productCount: 4 },
];

const SAMPLE_BRANDS: Brand[] = [
  { id: "b1", name: "Panadol", manufacturer: "GSK Pharmaceuticals", medicineCount: 3 },
  { id: "b2", name: "Brufen", manufacturer: "Abbott Laboratories", medicineCount: 2 },
  { id: "b3", name: "Augmentin", manufacturer: "GSK Pharmaceuticals", medicineCount: 2 },
  { id: "b4", name: "Surbex", manufacturer: "Abbott Laboratories", medicineCount: 2 },
  { id: "b5", name: "Glucophage", manufacturer: "Martin Dow", medicineCount: 2 },
  { id: "b6", name: "Disprin", manufacturer: "Reckitt", medicineCount: 1 },
  { id: "b7", name: "Calpol", manufacturer: "GSK Pharmaceuticals", medicineCount: 1 },
  { id: "b8", name: "Risek", manufacturer: "Getz Pharma", medicineCount: 2 },
  { id: "b9", name: "Rigix", manufacturer: "Getz Pharma", medicineCount: 1 },
  { id: "b10", name: "Concor", manufacturer: "Merck", medicineCount: 1 },
];

const SAMPLE_MEDICINES: Medicine[] = [
  { id: "med1", name: "Panadol", genericName: "Paracetamol", category: "Pain Relief", brand: "Panadol", manufacturer: "GSK Pharmaceuticals", dosageForm: "Tablet", strength: "500mg", unit: "Tablet", sellingPrice: 150, purchasePrice: 105, reorderLevel: 40, stock: 320, prescriptionRequired: false, description: "Fast, effective relief from mild to moderate pain and fever. Suitable for headaches, toothaches, and cold symptoms.", expiry: "2027-04-30", status: "healthy", sku: "PAN-500" },
  { id: "med2", name: "Brufen", genericName: "Ibuprofen", category: "Pain Relief", brand: "Brufen", manufacturer: "Abbott Laboratories", dosageForm: "Tablet", strength: "400mg", unit: "Tablet", sellingPrice: 280, purchasePrice: 205, reorderLevel: 30, stock: 32, prescriptionRequired: false, description: "Non-steroidal anti-inflammatory drug (NSAID) used to reduce fever and treat pain or inflammation.", expiry: "2026-11-15", status: "low", sku: "BRU-400" },
  { id: "med3", name: "Augmentin", genericName: "Amoxicillin + Clavulanic Acid", category: "Antibiotics", brand: "Augmentin", manufacturer: "GSK Pharmaceuticals", dosageForm: "Tablet", strength: "625mg", unit: "Tablet", sellingPrice: 520, purchasePrice: 390, reorderLevel: 25, stock: 140, prescriptionRequired: true, description: "Broad-spectrum antibiotic combination used to treat a wide range of bacterial infections.", expiry: "2026-12-20", status: "expiring", sku: "AUG-625" },
  { id: "med4", name: "Vitamin C", genericName: "Ascorbic Acid", category: "Vitamins & Supplements", brand: "Surbex", manufacturer: "Abbott Laboratories", dosageForm: "Tablet", strength: "1000mg", unit: "Tablet", sellingPrice: 450, purchasePrice: 320, reorderLevel: 30, stock: 15, prescriptionRequired: false, description: "High-potency vitamin C supplement supporting immunity and antioxidant defense.", expiry: "2027-08-10", status: "low", sku: "VTC-1000" },
  { id: "med5", name: "Vitamin D3", genericName: "Cholecalciferol", category: "Vitamins & Supplements", brand: "Surbex", manufacturer: "Abbott Laboratories", dosageForm: "Softgel", strength: "5000 IU", unit: "Softgel", sellingPrice: 620, purchasePrice: 440, reorderLevel: 20, stock: 88, prescriptionRequired: false, description: "Supports bone health, calcium absorption, and immune function.", expiry: "2027-06-30", status: "healthy", sku: "VTD-5000" },
  { id: "med6", name: "Glucophage", genericName: "Metformin", category: "Diabetes Care", brand: "Glucophage", manufacturer: "Martin Dow", dosageForm: "Tablet", strength: "500mg", unit: "Tablet", sellingPrice: 190, purchasePrice: 130, reorderLevel: 35, stock: 210, prescriptionRequired: true, description: "First-line oral medication for the management of type 2 diabetes mellitus.", expiry: "2027-03-15", status: "healthy", sku: "GLU-500" },
  { id: "med7", name: "Calpol", genericName: "Paracetamol Syrup", category: "Pain Relief", brand: "Calpol", manufacturer: "GSK Pharmaceuticals", dosageForm: "Syrup", strength: "120mg/5ml", unit: "Bottle", sellingPrice: 175, purchasePrice: 120, reorderLevel: 25, stock: 60, prescriptionRequired: false, description: "Gentle fever and pain relief syrup formulated for children.", expiry: "2027-01-25", status: "healthy", sku: "CAL-120" },
  { id: "med8", name: "Disprin", genericName: "Aspirin", category: "Pain Relief", brand: "Disprin", manufacturer: "Reckitt", dosageForm: "Tablet", strength: "300mg", unit: "Tablet", sellingPrice: 60, purchasePrice: 40, reorderLevel: 40, stock: 0, prescriptionRequired: false, description: "Soluble aspirin for fast relief of headaches, pain, and fever.", expiry: "2026-10-30", status: "out", sku: "DIS-300" },
  { id: "med9", name: "Risek", genericName: "Omeprazole", category: "Gastro & Digestive", brand: "Risek", manufacturer: "Getz Pharma", dosageForm: "Capsule", strength: "20mg", unit: "Capsule", sellingPrice: 240, purchasePrice: 170, reorderLevel: 30, stock: 175, prescriptionRequired: false, description: "Proton pump inhibitor used to treat acid reflux, GERD, and stomach ulcers.", expiry: "2027-05-18", status: "healthy", sku: "RIS-20" },
  { id: "med10", name: "Rigix", genericName: "Cetirizine", category: "Cold & Flu", brand: "Rigix", manufacturer: "Getz Pharma", dosageForm: "Tablet", strength: "10mg", unit: "Tablet", sellingPrice: 130, purchasePrice: 90, reorderLevel: 30, stock: 240, prescriptionRequired: false, description: "Antihistamine that provides relief from allergy symptoms such as sneezing and runny nose.", expiry: "2027-07-22", status: "healthy", sku: "RIG-10" },
  { id: "med11", name: "Concor", genericName: "Bisoprolol", category: "Cardiac Care", brand: "Concor", manufacturer: "Merck", dosageForm: "Tablet", strength: "5mg", unit: "Tablet", sellingPrice: 340, purchasePrice: 245, reorderLevel: 25, stock: 96, prescriptionRequired: true, description: "Beta-blocker used to treat high blood pressure and heart-related chest pain.", expiry: "2027-02-28", status: "healthy", sku: "CON-5" },
  { id: "med12", name: "Ciproxin", genericName: "Ciprofloxacin", category: "Antibiotics", brand: "Ciproxin", manufacturer: "Bayer", dosageForm: "Tablet", strength: "500mg", unit: "Tablet", sellingPrice: 410, purchasePrice: 300, reorderLevel: 20, stock: 22, prescriptionRequired: true, description: "Fluoroquinolone antibiotic used to treat a variety of bacterial infections.", expiry: "2026-11-05", status: "low", sku: "CIP-500" },
  { id: "med13", name: "Panadol Extra", genericName: "Paracetamol + Caffeine", category: "Pain Relief", brand: "Panadol", manufacturer: "GSK Pharmaceuticals", dosageForm: "Tablet", strength: "500mg", unit: "Tablet", sellingPrice: 180, purchasePrice: 125, reorderLevel: 35, stock: 150, prescriptionRequired: false, description: "Extra-strength pain relief combining paracetamol with caffeine.", expiry: "2027-04-12", status: "healthy", sku: "PAN-EX" },
  { id: "med14", name: "Ventolin", genericName: "Salbutamol", category: "Cold & Flu", brand: "Ventolin", manufacturer: "GSK Pharmaceuticals", dosageForm: "Inhaler", strength: "100mcg", unit: "Inhaler", sellingPrice: 550, purchasePrice: 400, reorderLevel: 15, stock: 45, prescriptionRequired: true, description: "Bronchodilator inhaler that relieves symptoms of asthma and COPD.", expiry: "2027-09-01", status: "healthy", sku: "VEN-100" },
  { id: "med15", name: "Lipitor", genericName: "Atorvastatin", category: "Cardiac Care", brand: "Lipitor", manufacturer: "Pfizer Pakistan", dosageForm: "Tablet", strength: "20mg", unit: "Tablet", sellingPrice: 480, purchasePrice: 350, reorderLevel: 25, stock: 130, prescriptionRequired: true, description: "Statin medication used to lower cholesterol and reduce cardiovascular risk.", expiry: "2027-03-30", status: "healthy", sku: "LIP-20" },
  { id: "med16", name: "Neurobion", genericName: "Vitamin B Complex", category: "Vitamins & Supplements", brand: "Neurobion", manufacturer: "Merck", dosageForm: "Tablet", strength: "B1+B6+B12", unit: "Tablet", sellingPrice: 300, purchasePrice: 210, reorderLevel: 25, stock: 68, prescriptionRequired: false, description: "Vitamin B complex supporting nerve health and energy metabolism.", expiry: "2027-05-05", status: "healthy", sku: "NEU-B" },
  { id: "med17", name: "Amaryl", genericName: "Glimepiride", category: "Diabetes Care", brand: "Amaryl", manufacturer: "Sanofi Aventis", dosageForm: "Tablet", strength: "2mg", unit: "Tablet", sellingPrice: 260, purchasePrice: 185, reorderLevel: 20, stock: 54, prescriptionRequired: true, description: "Oral anti-diabetic that stimulates insulin release to control blood sugar.", expiry: "2026-12-12", status: "expiring", sku: "AMA-2" },
  { id: "med18", name: "Zyrtec", genericName: "Cetirizine", category: "Cold & Flu", brand: "Zyrtec", manufacturer: "Sanofi Aventis", dosageForm: "Syrup", strength: "5mg/5ml", unit: "Bottle", sellingPrice: 210, purchasePrice: 150, reorderLevel: 20, stock: 40, prescriptionRequired: false, description: "Antihistamine syrup for allergy relief in children and adults.", expiry: "2027-02-14", status: "healthy", sku: "ZYR-5" },
  { id: "med19", name: "Nexium", genericName: "Esomeprazole", category: "Gastro & Digestive", brand: "Nexium", manufacturer: "AstraZeneca", dosageForm: "Capsule", strength: "40mg", unit: "Capsule", sellingPrice: 390, purchasePrice: 280, reorderLevel: 20, stock: 78, prescriptionRequired: false, description: "Proton pump inhibitor for the treatment of acid-related disorders.", expiry: "2027-06-08", status: "healthy", sku: "NEX-40" },
  { id: "med20", name: "Flagyl", genericName: "Metronidazole", category: "Antibiotics", brand: "Flagyl", manufacturer: "Sanofi Aventis", dosageForm: "Tablet", strength: "400mg", unit: "Tablet", sellingPrice: 170, purchasePrice: 115, reorderLevel: 30, stock: 190, prescriptionRequired: true, description: "Antibiotic effective against anaerobic bacteria and certain parasites.", expiry: "2026-10-18", status: "expiring", sku: "FLA-400" },
  { id: "med21", name: "Betnovate", genericName: "Betamethasone", category: "Skin Care", brand: "Betnovate", manufacturer: "GSK Pharmaceuticals", dosageForm: "Cream", strength: "0.1%", unit: "Tube", sellingPrice: 220, purchasePrice: 155, reorderLevel: 20, stock: 62, prescriptionRequired: true, description: "Topical corticosteroid for the relief of inflammatory skin conditions.", expiry: "2027-04-20", status: "healthy", sku: "BET-01" },
  { id: "med22", name: "Panadol CF", genericName: "Paracetamol + Pseudoephedrine", category: "Cold & Flu", brand: "Panadol", manufacturer: "GSK Pharmaceuticals", dosageForm: "Tablet", strength: "500mg", unit: "Tablet", sellingPrice: 165, purchasePrice: 115, reorderLevel: 30, stock: 110, prescriptionRequired: false, description: "Cold & flu formula that relieves congestion, pain, and fever.", expiry: "2027-01-09", status: "healthy", sku: "PAN-CF" },
  { id: "med23", name: "Surbex Z", genericName: "Multivitamin + Zinc", category: "Vitamins & Supplements", brand: "Surbex", manufacturer: "Abbott Laboratories", dosageForm: "Tablet", strength: "Multi", unit: "Tablet", sellingPrice: 380, purchasePrice: 270, reorderLevel: 25, stock: 145, prescriptionRequired: false, description: "Complete multivitamin with zinc for daily nutritional support.", expiry: "2027-07-15", status: "healthy", sku: "SBZ-MZ" },
  { id: "med24", name: "Glucophage XR", genericName: "Metformin ER", category: "Diabetes Care", brand: "Glucophage", manufacturer: "Martin Dow", dosageForm: "Tablet", strength: "1000mg", unit: "Tablet", sellingPrice: 250, purchasePrice: 175, reorderLevel: 25, stock: 28, prescriptionRequired: true, description: "Extended-release metformin for once-daily blood sugar control.", expiry: "2026-11-28", status: "low", sku: "GLU-XR" },
  { id: "med25", name: "Tegral", genericName: "Carbamazepine", category: "Pain Relief", brand: "Tegral", manufacturer: "Novartis", dosageForm: "Tablet", strength: "200mg", unit: "Tablet", sellingPrice: 290, purchasePrice: 205, reorderLevel: 20, stock: 50, prescriptionRequired: true, description: "Used to control seizures and relieve nerve pain such as trigeminal neuralgia.", expiry: "2027-05-30", status: "healthy", sku: "TEG-200" },
  { id: "med26", name: "Cofcol", genericName: "Dextromethorphan", category: "Cold & Flu", brand: "Cofcol", manufacturer: "Highnoon Labs", dosageForm: "Syrup", strength: "15mg/5ml", unit: "Bottle", sellingPrice: 145, purchasePrice: 100, reorderLevel: 25, stock: 72, prescriptionRequired: false, description: "Cough suppressant syrup for the relief of dry, irritating coughs.", expiry: "2027-03-11", status: "healthy", sku: "COF-15" },
  { id: "med27", name: "Optive", genericName: "Carboxymethylcellulose", category: "Eye & Ear Care", brand: "Optive", manufacturer: "Allergan", dosageForm: "Eye Drops", strength: "0.5%", unit: "Bottle", sellingPrice: 520, purchasePrice: 380, reorderLevel: 15, stock: 34, prescriptionRequired: false, description: "Lubricating eye drops for the relief of dry, irritated eyes.", expiry: "2027-08-25", status: "healthy", sku: "OPT-05" },
  { id: "med28", name: "Dettol Antiseptic", genericName: "Chloroxylenol", category: "First Aid", brand: "Dettol", manufacturer: "Reckitt", dosageForm: "Liquid", strength: "4.8%", unit: "Bottle", sellingPrice: 320, purchasePrice: 230, reorderLevel: 20, stock: 105, prescriptionRequired: false, description: "Antiseptic disinfectant for first aid, personal hygiene, and surfaces.", expiry: "2028-01-15", status: "healthy", sku: "DET-48" },
  { id: "med29", name: "Panadol Baby", genericName: "Paracetamol Drops", category: "First Aid", brand: "Panadol", manufacturer: "GSK Pharmaceuticals", dosageForm: "Drops", strength: "100mg/ml", unit: "Bottle", sellingPrice: 195, purchasePrice: 135, reorderLevel: 20, stock: 18, prescriptionRequired: false, description: "Concentrated infant paracetamol drops for fever and pain relief.", expiry: "2026-12-05", status: "expiring", sku: "PAN-BB" },
  { id: "med30", name: " Crestor", genericName: "Rosuvastatin", category: "Cardiac Care", brand: "Crestor", manufacturer: "AstraZeneca", dosageForm: "Tablet", strength: "10mg", unit: "Tablet", sellingPrice: 560, purchasePrice: 410, reorderLevel: 20, stock: 82, prescriptionRequired: true, description: "Statin used to lower LDL cholesterol and reduce the risk of heart disease.", expiry: "2027-06-19", status: "healthy", sku: "CRE-10" },
];

const SAMPLE_BATCHES: Batch[] = [
  { id: "bt1", medicineId: "med1", medicineName: "Panadol 500mg", batchNumber: "PAN-2026-04", purchaseDate: "2026-04-10", expiryDate: "2027-04-30", purchasePrice: 105, sellingPrice: 150, quantity: 400, remaining: 320, status: "healthy" },
  { id: "bt2", medicineId: "med2", medicineName: "Brufen 400mg", batchNumber: "BRU-2025-11", purchaseDate: "2025-11-20", expiryDate: "2026-11-15", purchasePrice: 205, sellingPrice: 280, quantity: 200, remaining: 32, status: "expiring" },
  { id: "bt3", medicineId: "med3", medicineName: "Augmentin 625mg", batchNumber: "AUG-2025-12", purchaseDate: "2025-12-05", expiryDate: "2026-12-20", purchasePrice: 390, sellingPrice: 520, quantity: 250, remaining: 140, status: "expiring" },
  { id: "bt4", medicineId: "med8", medicineName: "Disprin 300mg", batchNumber: "DIS-2024-10", purchaseDate: "2024-10-01", expiryDate: "2025-10-30", purchasePrice: 40, sellingPrice: 60, quantity: 300, remaining: 0, status: "expired" },
  { id: "bt5", medicineId: "med6", medicineName: "Glucophage 500mg", batchNumber: "GLU-2026-03", purchaseDate: "2026-03-15", expiryDate: "2027-03-15", purchasePrice: 130, sellingPrice: 190, quantity: 300, remaining: 210, status: "healthy" },
  { id: "bt6", medicineId: "med20", medicineName: "Flagyl 400mg", batchNumber: "FLA-2025-10", purchaseDate: "2025-10-18", expiryDate: "2026-10-18", purchasePrice: 115, sellingPrice: 170, quantity: 300, remaining: 190, status: "expiring" },
  { id: "bt7", medicineId: "med17", medicineName: "Amaryl 2mg", batchNumber: "AMA-2025-12", purchaseDate: "2025-12-12", expiryDate: "2026-12-12", purchasePrice: 185, sellingPrice: 260, quantity: 150, remaining: 54, status: "expiring" },
  { id: "bt8", medicineId: "med12", medicineName: "Ciproxin 500mg", batchNumber: "CIP-2025-11", purchaseDate: "2025-11-05", expiryDate: "2026-11-05", purchasePrice: 300, sellingPrice: 410, quantity: 120, remaining: 22, status: "expiring" },
  { id: "bt9", medicineId: "med15", medicineName: "Lipitor 20mg", batchNumber: "LIP-2026-03", purchaseDate: "2026-03-30", expiryDate: "2027-03-30", purchasePrice: 350, sellingPrice: 480, quantity: 200, remaining: 130, status: "healthy" },
  { id: "bt10", medicineId: "med29", medicineName: "Panadol Baby Drops", batchNumber: "PAN-BB-2025-12", purchaseDate: "2025-12-05", expiryDate: "2026-12-05", purchasePrice: 135, sellingPrice: 195, quantity: 80, remaining: 18, status: "expiring" },
];

const SAMPLE_SUPPLIERS: Supplier[] = [
  { id: "s1", name: "Muller & Phipps Pakistan", contactPerson: "Imran Khalid", phone: "+92 21 3453 0001", email: "orders@mullerphipps.pk", address: "Korangi Industrial Area, Karachi", totalPurchases: 4820000, paid: 4100000, outstanding: 720000, status: "active" },
  { id: "s2", name: "United Distributors", contactPerson: "Sana Riaz", phone: "+92 42 3578 2200", email: "sales@udl.com.pk", address: "Ferozepur Road, Lahore", totalPurchases: 3210000, paid: 3210000, outstanding: 0, status: "active" },
  { id: "s3", name: "Premier Distribution", contactPerson: "Ahmed Raza", phone: "+92 51 2270 4410", email: "info@premierdist.pk", address: "Blue Area, Islamabad", totalPurchases: 2640000, paid: 2100000, outstanding: 540000, status: "active" },
  { id: "s4", name: "Pharma Bureau", contactPerson: "Fatima Noor", phone: "+92 21 3494 8820", email: "contact@pharmabureau.pk", address: "SITE Area, Karachi", totalPurchases: 1980000, paid: 1650000, outstanding: 330000, status: "active" },
  { id: "s5", name: "Safeway Pharma", contactPerson: "Bilal Ahmed", phone: "+92 42 3661 7788", email: "orders@safewaypharma.pk", address: "Gulberg III, Lahore", totalPurchases: 1520000, paid: 1520000, outstanding: 0, status: "active" },
  { id: "s6", name: "MedLink Suppliers", contactPerson: "Ayesha Malik", phone: "+92 21 3588 9911", email: "hello@medlink.pk", address: "Clifton, Karachi", totalPurchases: 1240000, paid: 980000, outstanding: 260000, status: "active" },
  { id: "s7", name: "Health Plus Traders", contactPerson: "Usman Tariq", phone: "+92 41 2600 3322", email: "sales@healthplus.pk", address: "Susan Road, Faisalabad", totalPurchases: 890000, paid: 890000, outstanding: 0, status: "inactive" },
  { id: "s8", name: "Wellness Distributors", contactPerson: "Hina Shah", phone: "+92 91 5840 1200", email: "info@wellnessdist.pk", address: "University Road, Peshawar", totalPurchases: 760000, paid: 600000, outstanding: 160000, status: "active" },
  { id: "s9", name: "CarePharma Logistics", contactPerson: "Zeeshan Ali", phone: "+92 21 3466 5510", email: "logistics@carepharma.pk", address: "Shahrah-e-Faisal, Karachi", totalPurchases: 540000, paid: 540000, outstanding: 0, status: "active" },
  { id: "s10", name: "Nova Medico", contactPerson: "Maryam Javed", phone: "+92 42 3599 4433", email: "orders@novamedico.pk", address: "DHA Phase 5, Lahore", totalPurchases: 420000, paid: 300000, outstanding: 120000, status: "active" },
];

const SAMPLE_CUSTOMERS: Customer[] = [
  { id: "cu1", name: "Ali Hassan", phone: "+92 300 1234567", email: "ali.hassan@gmail.com", totalPurchases: 48200, outstanding: 0, lastPurchase: "2026-09-25", status: "active", address: "House 12, Block A, Gulshan-e-Iqbal, Karachi" },
  { id: "cu2", name: "Sara Ahmed", phone: "+92 301 2345678", email: "sara.ahmed@gmail.com", totalPurchases: 32800, outstanding: 4500, lastPurchase: "2026-09-24", status: "active", address: "Flat 7, Askari Towers, Lahore" },
  { id: "cu3", name: "Bilal Sheikh", phone: "+92 302 3456789", email: "bilal.sheikh@outlook.com", totalPurchases: 61500, outstanding: 0, lastPurchase: "2026-09-26", status: "active", address: "22-C, Model Town, Lahore" },
  { id: "cu4", name: "Fatima Zahra", phone: "+92 303 4567890", email: "fatima.z@gmail.com", totalPurchases: 18900, outstanding: 0, lastPurchase: "2026-09-20", status: "active", address: "House 5, F-8/2, Islamabad" },
  { id: "cu5", name: "Usman Ghani", phone: "+92 304 5678901", email: "usman.ghani@gmail.com", totalPurchases: 27400, outstanding: 2200, lastPurchase: "2026-09-22", status: "active", address: "Plot 44, PECHS, Karachi" },
  { id: "cu6", name: "Ayesha Khan", phone: "+92 305 6789012", email: "ayesha.khan@gmail.com", totalPurchases: 54300, outstanding: 0, lastPurchase: "2026-09-26", status: "active", address: "House 88, Bahria Town, Rawalpindi" },
  { id: "cu7", name: "Hamza Malik", phone: "+92 306 7890123", email: "hamza.malik@gmail.com", totalPurchases: 12600, outstanding: 0, lastPurchase: "2026-09-18", status: "active", address: "14-B, Johar Town, Lahore" },
  { id: "cu8", name: "Zainab Riaz", phone: "+92 307 8901234", email: "zainab.riaz@gmail.com", totalPurchases: 39100, outstanding: 6800, lastPurchase: "2026-09-23", status: "active", address: "House 3, DHA Phase 6, Karachi" },
  { id: "cu9", name: "Ahmed Nawaz", phone: "+92 308 9012345", email: "ahmed.nawaz@gmail.com", totalPurchases: 8400, outstanding: 0, lastPurchase: "2026-09-15", status: "inactive", address: "House 19, Satellite Town, Gujranwala" },
  { id: "cu10", name: "Maria Iqbal", phone: "+92 309 0123456", email: "maria.iqbal@gmail.com", totalPurchases: 45700, outstanding: 0, lastPurchase: "2026-09-25", status: "active", address: "House 66, Wapda Town, Lahore" },
  { id: "cu11", name: "Tariq Mehmood", phone: "+92 310 1122334", email: "tariq.m@gmail.com", totalPurchases: 21300, outstanding: 1500, lastPurchase: "2026-09-19", status: "active", address: "Plot 9, North Nazimabad, Karachi" },
  { id: "cu12", name: "Nadia Aslam", phone: "+92 311 2233445", email: "nadia.aslam@gmail.com", totalPurchases: 33600, outstanding: 0, lastPurchase: "2026-09-21", status: "active", address: "House 27, G-11/3, Islamabad" },
  { id: "cu13", name: "Kamran Akmal", phone: "+92 312 3344556", email: "kamran.akmal@gmail.com", totalPurchases: 15800, outstanding: 0, lastPurchase: "2026-09-17", status: "active", address: "House 41, Cantt, Multan" },
  { id: "cu14", name: "Rabia Yousaf", phone: "+92 313 4455667", email: "rabia.y@gmail.com", totalPurchases: 29200, outstanding: 3400, lastPurchase: "2026-09-24", status: "active", address: "House 8, Garden Town, Lahore" },
  { id: "cu15", name: "Salman Butt", phone: "+92 314 5566778", email: "salman.butt@gmail.com", totalPurchases: 51900, outstanding: 0, lastPurchase: "2026-09-26", status: "active", address: "House 73, Faisal Town, Lahore" },
  { id: "cu16", name: "Hina Pervaiz", phone: "+92 315 6677889", email: "hina.p@gmail.com", totalPurchases: 9700, outstanding: 0, lastPurchase: "2026-09-14", status: "active", address: "Flat 2, Saddar, Rawalpindi" },
  { id: "cu17", name: "Waqar Younis", phone: "+92 316 7788990", email: "waqar.y@gmail.com", totalPurchases: 42100, outstanding: 0, lastPurchase: "2026-09-22", status: "active", address: "House 15, Cavalry Ground, Lahore" },
  { id: "cu18", name: "Sadia Imam", phone: "+92 317 8899001", email: "sadia.imam@gmail.com", totalPurchases: 18300, outstanding: 900, lastPurchase: "2026-09-20", status: "active", address: "House 34, Gulistan-e-Johar, Karachi" },
  { id: "cu19", name: "Faisal Qureshi", phone: "+92 318 9900112", email: "faisal.q@gmail.com", totalPurchases: 24600, outstanding: 0, lastPurchase: "2026-09-16", status: "active", address: "House 51, Chaklala Scheme 3, Rawalpindi" },
  { id: "cu20", name: "Walk-in Customer", phone: "—", email: "—", totalPurchases: 0, outstanding: 0, lastPurchase: "2026-09-26", status: "active", address: "—" },
];

const SAMPLE_SALES: Sale[] = [
  { id: "sa1", invoice: "INV-1042", customer: "Ali Hassan", items: [{ medicineName: "Panadol 500mg", quantity: 2, price: 150, subtotal: 300 }, { medicineName: "Vitamin C 1000mg", quantity: 1, price: 450, subtotal: 450 }, { medicineName: "Risek 20mg", quantity: 3, price: 240, subtotal: 720 }], itemCount: 6, subtotal: 1470, discount: 90, tax: 0, total: 1380, payment: "cash", status: "paid", date: "2026-09-26" },
  { id: "sa2", invoice: "INV-1041", customer: "Bilal Sheikh", items: [{ medicineName: "Augmentin 625mg", quantity: 2, price: 520, subtotal: 1040 }, { medicineName: "Brufen 400mg", quantity: 1, price: 280, subtotal: 280 }], itemCount: 3, subtotal: 1320, discount: 0, tax: 66, total: 1386, payment: "card", status: "paid", date: "2026-09-26" },
  { id: "sa3", invoice: "INV-1040", customer: "Ayesha Khan", items: [{ medicineName: "Surbex Z", quantity: 2, price: 380, subtotal: 760 }, { medicineName: "Vitamin D3", quantity: 1, price: 620, subtotal: 620 }], itemCount: 3, subtotal: 1380, discount: 80, tax: 0, total: 1300, payment: "cash", status: "paid", date: "2026-09-26" },
  { id: "sa4", invoice: "INV-1039", customer: "Salman Butt", items: [{ medicineName: "Lipitor 20mg", quantity: 1, price: 480, subtotal: 480 }, { medicineName: "Concor 5mg", quantity: 2, price: 340, subtotal: 680 }], itemCount: 3, subtotal: 1160, discount: 0, tax: 58, total: 1218, payment: "bank", status: "paid", date: "2026-09-26" },
  { id: "sa5", invoice: "INV-1038", customer: "Sara Ahmed", items: [{ medicineName: "Glucophage 500mg", quantity: 3, price: 190, subtotal: 570 }, { medicineName: "Amaryl 2mg", quantity: 1, price: 260, subtotal: 260 }], itemCount: 4, subtotal: 830, discount: 0, tax: 0, total: 830, payment: "cash", status: "pending", date: "2026-09-24" },
  { id: "sa6", invoice: "INV-1037", customer: "Maria Iqbal", items: [{ medicineName: "Rigix 10mg", quantity: 2, price: 130, subtotal: 260 }, { medicineName: "Cofcol Syrup", quantity: 1, price: 145, subtotal: 145 }], itemCount: 3, subtotal: 405, discount: 0, tax: 0, total: 405, payment: "cash", status: "paid", date: "2026-09-25" },
  { id: "sa7", invoice: "INV-1036", customer: "Usman Ghani", items: [{ medicineName: "Ventolin Inhaler", quantity: 1, price: 550, subtotal: 550 }], itemCount: 1, subtotal: 550, discount: 0, tax: 27, total: 577, payment: "card", status: "paid", date: "2026-09-22" },
  { id: "sa8", invoice: "INV-1035", customer: "Zainab Riaz", items: [{ medicineName: "Nexium 40mg", quantity: 2, price: 390, subtotal: 780 }, { medicineName: "Panadol 500mg", quantity: 4, price: 150, subtotal: 600 }], itemCount: 6, subtotal: 1380, discount: 100, tax: 0, total: 1280, payment: "cash", status: "partial", date: "2026-09-23" },
  { id: "sa9", invoice: "INV-1034", customer: "Fatima Zahra", items: [{ medicineName: "Betnovate Cream", quantity: 1, price: 220, subtotal: 220 }, { medicineName: "Dettol Antiseptic", quantity: 1, price: 320, subtotal: 320 }], itemCount: 2, subtotal: 540, discount: 0, tax: 0, total: 540, payment: "cash", status: "paid", date: "2026-09-20" },
  { id: "sa10", invoice: "INV-1033", customer: "Hamza Malik", items: [{ medicineName: "Optive Eye Drops", quantity: 1, price: 520, subtotal: 520 }], itemCount: 1, subtotal: 520, discount: 20, tax: 0, total: 500, payment: "cash", status: "paid", date: "2026-09-18" },
  { id: "sa11", invoice: "INV-1032", customer: "Nadia Aslam", items: [{ medicineName: "Neurobion", quantity: 2, price: 300, subtotal: 600 }, { medicineName: "Surbex Z", quantity: 1, price: 380, subtotal: 380 }], itemCount: 3, subtotal: 980, discount: 0, tax: 49, total: 1029, payment: "card", status: "paid", date: "2026-09-21" },
  { id: "sa12", invoice: "INV-1031", customer: "Kamran Akmal", items: [{ medicineName: "Panadol Extra", quantity: 3, price: 180, subtotal: 540 }], itemCount: 3, subtotal: 540, discount: 0, tax: 0, total: 540, payment: "cash", status: "paid", date: "2026-09-17" },
  { id: "sa13", invoice: "INV-1030", customer: "Rabia Yousaf", items: [{ medicineName: "Zyrtec Syrup", quantity: 2, price: 210, subtotal: 420 }, { medicineName: "Calpol Syrup", quantity: 1, price: 175, subtotal: 175 }], itemCount: 3, subtotal: 595, discount: 0, tax: 0, total: 595, payment: "cash", status: "paid", date: "2026-09-24" },
  { id: "sa14", invoice: "INV-1029", customer: "Waqar Younis", items: [{ medicineName: "Crestor 10mg", quantity: 1, price: 560, subtotal: 560 }, { medicineName: "Lipitor 20mg", quantity: 1, price: 480, subtotal: 480 }], itemCount: 2, subtotal: 1040, discount: 0, tax: 52, total: 1092, payment: "bank", status: "paid", date: "2026-09-22" },
  { id: "sa15", invoice: "INV-1028", customer: "Sadia Imam", items: [{ medicineName: "Flagyl 400mg", quantity: 2, price: 170, subtotal: 340 }], itemCount: 2, subtotal: 340, discount: 0, tax: 0, total: 340, payment: "cash", status: "pending", date: "2026-09-20" },
  { id: "sa16", invoice: "INV-1027", customer: "Faisal Qureshi", items: [{ medicineName: "Ciproxin 500mg", quantity: 1, price: 410, subtotal: 410 }, { medicineName: "Risek 20mg", quantity: 2, price: 240, subtotal: 480 }], itemCount: 3, subtotal: 890, discount: 0, tax: 0, total: 890, payment: "cash", status: "paid", date: "2026-09-16" },
  { id: "sa17", invoice: "INV-1026", customer: "Tariq Mehmood", items: [{ medicineName: "Glucophage XR 1000mg", quantity: 2, price: 250, subtotal: 500 }], itemCount: 2, subtotal: 500, discount: 0, tax: 0, total: 500, payment: "cash", status: "refunded", date: "2026-09-19" },
  { id: "sa18", invoice: "INV-1025", customer: "Ali Hassan", items: [{ medicineName: "Tegral 200mg", quantity: 1, price: 290, subtotal: 290 }, { medicineName: "Panadol 500mg", quantity: 2, price: 150, subtotal: 300 }], itemCount: 3, subtotal: 590, discount: 0, tax: 0, total: 590, payment: "cash", status: "paid", date: "2026-09-15" },
  { id: "sa19", invoice: "INV-1024", customer: "Hina Pervaiz", items: [{ medicineName: "Vitamin C 1000mg", quantity: 1, price: 450, subtotal: 450 }], itemCount: 1, subtotal: 450, discount: 0, tax: 0, total: 450, payment: "card", status: "paid", date: "2026-09-14" },
  { id: "sa20", invoice: "INV-1023", customer: "Walk-in Customer", items: [{ medicineName: "Disprin 300mg", quantity: 5, price: 60, subtotal: 300 }, { medicineName: "Panadol 500mg", quantity: 2, price: 150, subtotal: 300 }], itemCount: 7, subtotal: 600, discount: 0, tax: 0, total: 600, payment: "cash", status: "paid", date: "2026-09-13" },
];

const SAMPLE_PURCHASES: Purchase[] = [
  { id: "pu1", poNumber: "PO-2045", supplier: "Muller & Phipps Pakistan", items: [{ medicineName: "Panadol 500mg", batch: "PAN-2026-09", quantity: 400, purchasePrice: 105, expiryDate: "2027-09-30" }, { medicineName: "Augmentin 625mg", batch: "AUG-2026-09", quantity: 250, purchasePrice: 390, expiryDate: "2027-09-30" }], itemCount: 2, total: 139500, status: "received", date: "2026-09-20", expectedDate: "2026-09-24" },
  { id: "pu2", poNumber: "PO-2044", supplier: "United Distributors", items: [{ medicineName: "Glucophage 500mg", batch: "GLU-2026-09", quantity: 300, purchasePrice: 130, expiryDate: "2027-09-30" }], itemCount: 1, total: 39000, status: "received", date: "2026-09-18", expectedDate: "2026-09-22" },
  { id: "pu3", poNumber: "PO-2043", supplier: "Premier Distribution", items: [{ medicineName: "Lipitor 20mg", batch: "LIP-2026-09", quantity: 200, purchasePrice: 350, expiryDate: "2027-09-30" }, { medicineName: "Concor 5mg", batch: "CON-2026-09", quantity: 150, purchasePrice: 245, expiryDate: "2027-09-30" }], itemCount: 2, total: 106750, status: "ordered", date: "2026-09-24", expectedDate: "2026-09-30" },
  { id: "pu4", poNumber: "PO-2042", supplier: "Pharma Bureau", items: [{ medicineName: "Surbex Z", batch: "SBZ-2026-09", quantity: 200, purchasePrice: 270, expiryDate: "2027-09-30" }], itemCount: 1, total: 54000, status: "partial", date: "2026-09-22", expectedDate: "2026-09-28" },
  { id: "pu5", poNumber: "PO-2041", supplier: "Safeway Pharma", items: [{ medicineName: "Rigix 10mg", batch: "RIG-2026-09", quantity: 300, purchasePrice: 90, expiryDate: "2027-09-30" }, { medicineName: "Risek 20mg", batch: "RIS-2026-09", quantity: 200, purchasePrice: 170, expiryDate: "2027-09-30" }], itemCount: 2, total: 61000, status: "received", date: "2026-09-15", expectedDate: "2026-09-19" },
  { id: "pu6", poNumber: "PO-2040", supplier: "MedLink Suppliers", items: [{ medicineName: "Ventolin Inhaler", batch: "VEN-2026-09", quantity: 60, purchasePrice: 400, expiryDate: "2027-09-30" }], itemCount: 1, total: 24000, status: "draft", date: "2026-09-25", expectedDate: "2026-10-01" },
  { id: "pu7", poNumber: "PO-2039", supplier: "Wellness Distributors", items: [{ medicineName: "Vitamin D3", batch: "VTD-2026-09", quantity: 120, purchasePrice: 440, expiryDate: "2027-09-30" }], itemCount: 1, total: 52800, status: "received", date: "2026-09-12", expectedDate: "2026-09-16" },
  { id: "pu8", poNumber: "PO-2038", supplier: "Nova Medico", items: [{ medicineName: "Nexium 40mg", batch: "NEX-2026-09", quantity: 100, purchasePrice: 280, expiryDate: "2027-09-30" }], itemCount: 1, total: 28000, status: "cancelled", date: "2026-09-10", expectedDate: "2026-09-14" },
  { id: "pu9", poNumber: "PO-2037", supplier: "CarePharma Logistics", items: [{ medicineName: "Betnovate Cream", batch: "BET-2026-09", quantity: 150, purchasePrice: 155, expiryDate: "2027-09-30" }, { medicineName: "Dettol Antiseptic", batch: "DET-2026-09", quantity: 100, purchasePrice: 230, expiryDate: "2028-09-30" }], itemCount: 2, total: 46250, status: "received", date: "2026-09-08", expectedDate: "2026-09-12" },
  { id: "pu10", poNumber: "PO-2036", supplier: "United Distributors", items: [{ medicineName: "Brufen 400mg", batch: "BRU-2026-09", quantity: 200, purchasePrice: 205, expiryDate: "2027-09-30" }], itemCount: 1, total: 41000, status: "ordered", date: "2026-09-25", expectedDate: "2026-10-02" },
];

const SAMPLE_PRESCRIPTIONS: Prescription[] = [
  { id: "pr1", code: "RX-5091", patient: "Ali Hassan", doctor: "Dr. Kamran Shafi", medicines: [{ name: "Augmentin 625mg", dosage: "1 tab twice daily", qty: 14 }, { name: "Risek 20mg", dosage: "1 cap before breakfast", qty: 7 }], date: "2026-09-26", status: "pending", notes: "Complete the full antibiotic course." },
  { id: "pr2", code: "RX-5090", patient: "Sara Ahmed", doctor: "Dr. Nadia Bhatti", medicines: [{ name: "Glucophage 500mg", dosage: "1 tab twice daily", qty: 60 }, { name: "Amaryl 2mg", dosage: "1 tab before breakfast", qty: 30 }], date: "2026-09-25", status: "approved", notes: "Monitor blood sugar weekly." },
  { id: "pr3", code: "RX-5089", patient: "Bilal Sheikh", doctor: "Dr. Faisal Iqbal", medicines: [{ name: "Lipitor 20mg", dosage: "1 tab at night", qty: 30 }], date: "2026-09-24", status: "dispensed", notes: "Recheck lipid profile in 3 months." },
  { id: "pr4", code: "RX-5088", patient: "Ayesha Khan", doctor: "Dr. Sana Tariq", medicines: [{ name: "Ventolin Inhaler", dosage: "2 puffs as needed", qty: 1 }], date: "2026-09-26", status: "pending", notes: "Asthma maintenance." },
  { id: "pr5", code: "RX-5087", patient: "Usman Ghani", doctor: "Dr. Kamran Shafi", medicines: [{ name: "Ciproxin 500mg", dosage: "1 tab twice daily", qty: 10 }], date: "2026-09-22", status: "dispensed", notes: "UTI treatment." },
  { id: "pr6", code: "RX-5086", patient: "Zainab Riaz", doctor: "Dr. Ali Raza", medicines: [{ name: "Concor 5mg", dosage: "1 tab in the morning", qty: 30 }, { name: "Crestor 10mg", dosage: "1 tab at night", qty: 30 }], date: "2026-09-23", status: "approved", notes: "Hypertension + cholesterol." },
  { id: "pr7", code: "RX-5085", patient: "Fatima Zahra", doctor: "Dr. Nadia Bhatti", medicines: [{ name: "Betnovate Cream", dosage: "Apply thin layer twice daily", qty: 1 }], date: "2026-09-20", status: "dispensed", notes: "Eczema on forearms." },
  { id: "pr8", code: "RX-5084", patient: "Hamza Malik", doctor: "Dr. Faisal Iqbal", medicines: [{ name: "Tegral 200mg", dosage: "1 tab twice daily", qty: 60 }], date: "2026-09-18", status: "rejected", notes: "Referred back — dosage clarification needed." },
  { id: "pr9", code: "RX-5083", patient: "Nadia Aslam", doctor: "Dr. Sana Tariq", medicines: [{ name: "Flagyl 400mg", dosage: "1 tab three times daily", qty: 21 }], date: "2026-09-21", status: "pending", notes: "GI infection." },
  { id: "pr10", code: "RX-5082", patient: "Salman Butt", doctor: "Dr. Ali Raza", medicines: [{ name: "Amaryl 2mg", dosage: "1 tab before breakfast", qty: 30 }, { name: "Glucophage XR 1000mg", dosage: "1 tab at night", qty: 30 }], date: "2026-09-26", status: "pending", notes: "New diabetes diagnosis." },
];

const SAMPLE_USERS: User[] = [
  { id: "u1", name: "Dr. Imran Sethi", email: "admin@pharmacy.test", role: "admin", status: "active", lastLogin: "2026-09-26 09:12", avatarColor: "#6366f1" },
  { id: "u2", name: "Ahsan Raza", email: "manager@pharmacy.test", role: "manager", status: "active", lastLogin: "2026-09-26 08:45", avatarColor: "#10b981" },
  { id: "u3", name: "Sana Malik", email: "sana.pharmacist@pharmacy.test", role: "pharmacist", status: "active", lastLogin: "2026-09-25 17:30", avatarColor: "#f59e0b" },
  { id: "u4", name: "Bilal Ahmed", email: "bilal.cashier@pharmacy.test", role: "cashier", status: "active", lastLogin: "2026-09-26 08:02", avatarColor: "#3b82f6" },
  { id: "u5", name: "Hina Shah", email: "hina.inventory@pharmacy.test", role: "inventory", status: "active", lastLogin: "2026-09-24 14:20", avatarColor: "#ec4899" },
  { id: "u6", name: "Zeeshan Ali", email: "zeeshan.cashier@pharmacy.test", role: "cashier", status: "inactive", lastLogin: "2026-09-10 11:15", avatarColor: "#8b5cf6" },
  { id: "u7", name: "Maryam Javed", email: "maryam.pharmacist@pharmacy.test", role: "pharmacist", status: "active", lastLogin: "2026-09-25 19:05", avatarColor: "#14b8a6" },
  { id: "u8", name: "Usman Tariq", email: "usman.inventory@pharmacy.test", role: "inventory", status: "active", lastLogin: "2026-09-26 07:50", avatarColor: "#f97316" },
];

const SAMPLE_EXPENSES: Expense[] = [
  { id: "e1", category: "Rent", description: "Monthly shop rent — main branch", amount: 180000, date: "2026-09-01", method: "bank" },
  { id: "e2", category: "Utilities", description: "Electricity bill (K-Electric)", amount: 42000, date: "2026-09-05", method: "bank" },
  { id: "e3", category: "Salaries", description: "Staff salaries — September", amount: 320000, date: "2026-09-01", method: "bank" },
  { id: "e4", category: "Supplies", description: "Packaging & printing", amount: 15600, date: "2026-09-10", method: "cash" },
  { id: "e5", category: "Maintenance", description: "AC servicing & refrigeration", amount: 22000, date: "2026-09-12", method: "cash" },
  { id: "e6", category: "Marketing", description: "Local promotion flyers", amount: 8500, date: "2026-09-15", method: "cash" },
  { id: "e7", category: "Utilities", description: "Internet & phone", amount: 9800, date: "2026-09-08", method: "card" },
  { id: "e8", category: "Transport", description: "Delivery fuel & logistics", amount: 18200, date: "2026-09-18", method: "cash" },
];

const SAMPLE_PAYMENTS: Payment[] = [
  { id: "pm1", reference: "PMT-9021", party: "Ali Hassan", type: "incoming", amount: 1380, method: "cash", date: "2026-09-26", status: "completed" },
  { id: "pm2", reference: "PMT-9020", party: "Bilal Sheikh", type: "incoming", amount: 1386, method: "card", date: "2026-09-26", status: "completed" },
  { id: "pm3", reference: "PMT-9019", party: "Muller & Phipps Pakistan", type: "outgoing", amount: 139500, method: "bank", date: "2026-09-24", status: "completed" },
  { id: "pm4", reference: "PMT-9018", party: "United Distributors", type: "outgoing", amount: 39000, method: "bank", date: "2026-09-22", status: "completed" },
  { id: "pm5", reference: "PMT-9017", party: "Zainab Riaz", type: "incoming", amount: 640, method: "cash", date: "2026-09-23", status: "pending" },
  { id: "pm6", reference: "PMT-9016", party: "Premier Distribution", type: "outgoing", amount: 50000, method: "bank", date: "2026-09-20", status: "pending" },
  { id: "pm7", reference: "PMT-9015", party: "Salman Butt", type: "incoming", amount: 1218, method: "bank", date: "2026-09-26", status: "completed" },
  { id: "pm8", reference: "PMT-9014", party: "Pharma Bureau", type: "outgoing", amount: 30000, method: "cash", date: "2026-09-19", status: "completed" },
];

const SAMPLE_AUDIT_LOGS: AuditLog[] = [
  { id: "al1", user: "Dr. Imran Sethi", action: "Updated", entity: "Medicine", detail: "Changed selling price of Panadol 500mg to Rs 150", timestamp: "2026-09-26 09:20", ip: "192.168.1.10" },
  { id: "al2", user: "Ahsan Raza", action: "Created", entity: "Sale", detail: "Completed sale INV-1042 (Rs 1,380)", timestamp: "2026-09-26 09:15", ip: "192.168.1.22" },
  { id: "al3", user: "Hina Shah", action: "Adjusted", entity: "Inventory", detail: "Stock adjustment for Brufen 400mg (-8 units)", timestamp: "2026-09-26 08:40", ip: "192.168.1.31" },
  { id: "al4", user: "Sana Malik", action: "Approved", entity: "Prescription", detail: "Approved prescription RX-5090", timestamp: "2026-09-25 17:32", ip: "192.168.1.18" },
  { id: "al5", user: "Dr. Imran Sethi", action: "Created", entity: "Purchase", detail: "Raised purchase order PO-2043", timestamp: "2026-09-24 15:10", ip: "192.168.1.10" },
  { id: "al6", user: "Bilal Ahmed", action: "Login", entity: "Auth", detail: "Successful login", timestamp: "2026-09-26 08:02", ip: "192.168.1.44" },
  { id: "al7", user: "Usman Tariq", action: "Transferred", entity: "Inventory", detail: "Transferred 50 units of Rigix 10mg to Branch 2", timestamp: "2026-09-25 12:25", ip: "192.168.1.51" },
  { id: "al8", user: "Dr. Imran Sethi", action: "Deleted", entity: "User", detail: "Deactivated user Zeeshan Ali", timestamp: "2026-09-24 10:05", ip: "192.168.1.10" },
];

const SAMPLE_NOTIFICATIONS: NotificationItem[] = [
  { id: "n1", title: "Low stock alert", message: "24 medicines are below their reorder level.", type: "warning", time: "10 min ago", read: false },
  { id: "n2", title: "Batches expiring", message: "18 batches expire within the next 90 days.", type: "warning", time: "1 hour ago", read: false },
  { id: "n3", title: "Expired stock", message: "5 batches are already expired and must be removed.", type: "danger", time: "2 hours ago", read: false },
  { id: "n4", title: "Prescriptions pending", message: "9 prescriptions require pharmacist review.", type: "info", time: "3 hours ago", read: true },
  { id: "n5", title: "Payment received", message: "Payment of Rs 1,386 received from Bilal Sheikh.", type: "success", time: "4 hours ago", read: true },
  { id: "n6", title: "Purchase order received", message: "PO-2045 from Muller & Phipps has been received.", type: "success", time: "Yesterday", read: true },
];

// ---- Aggregated KPI figures used across dashboards ----
const SAMPLE_KPI = {
  todaySales: 184500,
  purchases: 96200,
  inventoryValue: 2840000,
  lowStock: 24,
  expiringSoon: 18,
  expired: 5,
  pendingPrescriptions: 9,
  orders: 124,
  itemsSold: 386,
  totalProducts: SAMPLE_MEDICINES.length,
  totalUnits: SAMPLE_MEDICINES.reduce((s, m) => s + m.stock, 0),
};

// Sales trend data (last 30 days) — used by Recharts, sliced to 7 or 30.
const SAMPLE_SALES_TREND: { day: string; sales: number; purchases: number }[] = [
  { day: "Aug 28", sales: 142000, purchases: 60000 },
  { day: "Aug 29", sales: 138500, purchases: 0 },
  { day: "Aug 30", sales: 156000, purchases: 82000 },
  { day: "Aug 31", sales: 149000, purchases: 0 },
  { day: "Sep 01", sales: 161000, purchases: 90000 },
  { day: "Sep 02", sales: 133000, purchases: 0 },
  { day: "Sep 03", sales: 128000, purchases: 45000 },
  { day: "Sep 04", sales: 152000, purchases: 0 },
  { day: "Sep 05", sales: 168000, purchases: 110000 },
  { day: "Sep 06", sales: 175000, purchases: 0 },
  { day: "Sep 07", sales: 159000, purchases: 0 },
  { day: "Sep 08", sales: 143000, purchases: 52800 },
  { day: "Sep 09", sales: 137000, purchases: 0 },
  { day: "Sep 10", sales: 148000, purchases: 30000 },
  { day: "Sep 11", sales: 166000, purchases: 0 },
  { day: "Sep 12", sales: 172000, purchases: 46250 },
  { day: "Sep 13", sales: 181000, purchases: 0 },
  { day: "Sep 14", sales: 155000, purchases: 0 },
  { day: "Sep 15", sales: 149000, purchases: 61000 },
  { day: "Sep 16", sales: 158000, purchases: 0 },
  { day: "Sep 17", sales: 163000, purchases: 0 },
  { day: "Sep 18", sales: 170000, purchases: 52800 },
  { day: "Sep 19", sales: 176000, purchases: 0 },
  { day: "Sep 20", sales: 182000, purchases: 139500 },
  { day: "Sep 21", sales: 159000, purchases: 0 },
  { day: "Sep 22", sales: 167000, purchases: 39000 },
  { day: "Sep 23", sales: 174000, purchases: 0 },
  { day: "Sep 24", sales: 178000, purchases: 106750 },
  { day: "Sep 25", sales: 186000, purchases: 24000 },
  { day: "Sep 26", sales: 184500, purchases: 41000 },
];

const SAMPLE_INVENTORY_BREAKDOWN = [
  { name: "Healthy Stock", value: 21, color: "#10b981" },
  { name: "Low Stock", value: 5, color: "#f59e0b" },
  { name: "Expiring", value: 3, color: "#f97316" },
  { name: "Expired", value: 1, color: "#ef4444" },
];

const SAMPLE_CATEGORY_SALES = [
  { category: "Pain Relief", sales: 42 },
  { category: "Antibiotics", sales: 28 },
  { category: "Vitamins", sales: 35 },
  { category: "Diabetes", sales: 22 },
  { category: "Cold & Flu", sales: 30 },
  { category: "Cardiac", sales: 18 },
];

// Simple category tab list for the store
const SAMPLE_STORE_CATEGORIES = [
  "All",
  ...SAMPLE_CATEGORIES.map((c) => c.name),
];

export const CATEGORIES = liveArray("categories", SAMPLE_CATEGORIES);
export const MANUFACTURERS = liveArray("manufacturers", SAMPLE_MANUFACTURERS);
export const BRANDS = liveArray("brands", SAMPLE_BRANDS);
export const MEDICINES = liveArray("medicines", SAMPLE_MEDICINES);
export const BATCHES = liveArray("batches", SAMPLE_BATCHES);
export const SUPPLIERS = liveArray("suppliers", SAMPLE_SUPPLIERS);
export const CUSTOMERS = liveArray("customers", SAMPLE_CUSTOMERS);
export const SALES = liveArray("sales", SAMPLE_SALES);
export const PURCHASES = liveArray("purchases", SAMPLE_PURCHASES);
export const PRESCRIPTIONS = liveArray("prescriptions", SAMPLE_PRESCRIPTIONS);
export const USERS = liveArray("users", SAMPLE_USERS);
export const EXPENSES = liveArray("expenses", SAMPLE_EXPENSES);
export const PAYMENTS = liveArray("payments", SAMPLE_PAYMENTS);
export const AUDIT_LOGS = liveArray("audit_logs", SAMPLE_AUDIT_LOGS);
export const ADJUSTMENTS = liveArray<StockAdjustment>("adjustments", []);
export const SALES_RETURNS = liveArray<SalesReturn>("sales_returns", []);
export const PURCHASE_RETURNS = liveArray<PurchaseReturn>("purchase_returns", []);
export const NOTIFICATIONS = liveArray("notifications", SAMPLE_NOTIFICATIONS);
export const SETTINGS = liveArray<PharmacySettings>("settings", []);

function liveKpi() {
  const medicines = getLiveRecords<Medicine>("medicines", SAMPLE_MEDICINES);
  const sales = getLiveRecords<Sale>("sales", SAMPLE_SALES);
  const purchases = getLiveRecords<Purchase>("purchases", SAMPLE_PURCHASES);
  const prescriptions = getLiveRecords<Prescription>("prescriptions", SAMPLE_PRESCRIPTIONS);
  const today = new Date().toISOString().slice(0, 10);
  return {
    todaySales: sales.filter((sale) => sale.date === today).reduce((sum, sale) => sum + sale.total, 0),
    purchases: purchases.filter((purchase) => purchase.date === today).reduce((sum, purchase) => sum + purchase.total, 0),
    inventoryValue: medicines.reduce((sum, medicine) => sum + medicine.stock * medicine.purchasePrice, 0),
    lowStock: medicines.filter((medicine) => medicine.stock <= medicine.reorderLevel).length,
    expiringSoon: medicines.filter((medicine) => medicine.status === "expiring").length,
    expired: medicines.filter((medicine) => medicine.status === "expired").length,
    pendingPrescriptions: prescriptions.filter((prescription) => prescription.status === "pending").length,
    orders: sales.length,
    itemsSold: sales.reduce((sum, sale) => sum + sale.itemCount, 0),
    totalProducts: medicines.length,
    totalUnits: medicines.reduce((sum, medicine) => sum + medicine.stock, 0),
  };
}

export const KPI = new Proxy(SAMPLE_KPI, {
  get(target, property, receiver) {
    return Reflect.get(isLiveDataAvailable() ? liveKpi() : target, property, receiver);
  },
});

export const SALES_TREND = new Proxy(SAMPLE_SALES_TREND, {
  get(target, property) {
    if (!isLiveDataAvailable()) {
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    }

    const sales = getLiveRecords<Sale>("sales", []);
    const purchases = getLiveRecords<Purchase>("purchases", []);
    const byDate = new Map<string, { day: string; sales: number; purchases: number }>();
    for (const sale of sales) {
      const day = byDate.get(sale.date) ?? { day: sale.date, sales: 0, purchases: 0 };
      day.sales += sale.total;
      byDate.set(sale.date, day);
    }
    for (const purchase of purchases) {
      const day = byDate.get(purchase.date) ?? { day: purchase.date, sales: 0, purchases: 0 };
      day.purchases += purchase.total;
      byDate.set(purchase.date, day);
    }
    const values = [...byDate.values()].sort((a, b) => a.day.localeCompare(b.day)).slice(-30);
    const value = Reflect.get(values, property, values);
    return typeof value === "function" ? value.bind(values) : value;
  },
});

export const INVENTORY_BREAKDOWN = new Proxy(SAMPLE_INVENTORY_BREAKDOWN, {
  get(target, property) {
    if (!isLiveDataAvailable()) {
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    }
    const medicines = getLiveRecords<Medicine>("medicines", []);
    const values = [
      { name: "Healthy Stock", value: medicines.filter((medicine) => medicine.status === "healthy").length, color: "#10b981" },
      { name: "Low Stock", value: medicines.filter((medicine) => medicine.status === "low").length, color: "#f59e0b" },
      { name: "Expiring", value: medicines.filter((medicine) => medicine.status === "expiring").length, color: "#f97316" },
      { name: "Expired", value: medicines.filter((medicine) => medicine.status === "expired").length, color: "#ef4444" },
    ];
    const value = Reflect.get(values, property, values);
    return typeof value === "function" ? value.bind(values) : value;
  },
});

export const CATEGORY_SALES = new Proxy(SAMPLE_CATEGORY_SALES, {
  get(target, property) {
    if (!isLiveDataAvailable()) {
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    }
    const medicines = getLiveRecords<Medicine>("medicines", []);
    const totals = new Map<string, number>();
    for (const sale of getLiveRecords<Sale>("sales", [])) {
      for (const item of sale.items) {
        const medicine = medicines.find((entry) => item.medicineName.startsWith(entry.name));
        if (medicine) totals.set(medicine.category, (totals.get(medicine.category) ?? 0) + item.quantity);
      }
    }
    const values = [...totals].map(([category, sales]) => ({ category, sales }));
    const value = Reflect.get(values, property, values);
    return typeof value === "function" ? value.bind(values) : value;
  },
});

export const STORE_CATEGORIES = new Proxy(SAMPLE_STORE_CATEGORIES, {
  get(target, property) {
    if (!isLiveDataAvailable()) {
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    }
    const values = ["All", ...getLiveRecords<Category>("categories", []).map((category) => category.name)];
    const value = Reflect.get(values, property, values);
    return typeof value === "function" ? value.bind(values) : value;
  },
});
