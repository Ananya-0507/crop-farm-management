require('dotenv').config();
const mongoose = require('mongoose');

const Farmer = require('../models/Farmer');
const Field = require('../models/Field');
const Crop = require('../models/Crop');
const Planting = require('../models/Planting');
const Harvest = require('../models/Harvest');
const SensorReading = require('../models/SensorReading');
const MarketPrice = require('../models/MarketPrice');
const Input = require('../models/Input');

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const rand = (min, max) => Math.random() * (max - min) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const jitter = (v) => +(v + rand(-0.03, 0.03)).toFixed(5);   // small location offset

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected. Clearing old data...');
  await Promise.all([
    Farmer.deleteMany(), Field.deleteMany(), Crop.deleteMany(), Planting.deleteMany(),
    Harvest.deleteMany(), SensorReading.deleteMany(), MarketPrice.deleteMany(), Input.deleteMany()
  ]);

  // ---------- CROPS ----------
  const cropData = [
    { name: 'Paddy', category: 'cereal', season: 'kharif', growthDays: 120, idealSoil: ['alluvial', 'black'], varieties: ['IR-64', 'Jaya'], extra: { baseYield: 2200, spacingCm: 20 } },
    { name: 'Ragi', category: 'cereal', season: 'kharif', growthDays: 110, idealSoil: ['red', 'sandy'], varieties: ['GPU-28', 'MR-1'], extra: { baseYield: 900, spacingCm: 25 } },
    { name: 'Maize', category: 'cereal', season: 'kharif', growthDays: 100, idealSoil: ['red', 'alluvial'], varieties: ['NK-6240'], extra: { baseYield: 2500, spacingCm: 60 } },
    { name: 'Sugarcane', category: 'cash', season: 'perennial', growthDays: 300, idealSoil: ['alluvial', 'black'], varieties: ['Co-86032'], extra: { baseYield: 40000, ratoonCycles: 2 } },
    { name: 'Tomato', category: 'vegetable', season: 'rabi', growthDays: 90, idealSoil: ['red', 'laterite'], varieties: ['Arka Rakshak'], extra: { baseYield: 10000, staking: true } },
    { name: 'Groundnut', category: 'oilseed', season: 'kharif', growthDays: 105, idealSoil: ['red', 'sandy'], varieties: ['TMV-2'], extra: { baseYield: 700 } },
    { name: 'Tur Dal', category: 'pulse', season: 'kharif', growthDays: 150, idealSoil: ['black', 'red'], varieties: ['BRG-2'], extra: { baseYield: 450 } },
    { name: 'Coconut', category: 'fruit', season: 'perennial', growthDays: 365, idealSoil: ['laterite', 'sandy'], varieties: ['Tiptur Tall'], extra: { baseYield: 3000, treesPerAcre: 70 } }
  ];
  const crops = await Crop.insertMany(cropData);
  console.log(`Crops: ${crops.length}`);

  // ---------- FARMERS ----------
  const farmerData = [
    { name: 'Ramesh Gowda', phone: '9845012345', village: 'Hootagalli', district: 'Mysuru', c: [76.6394, 12.2958], irr: 'canal' },
    { name: 'Lakshmi Devi', phone: '9731122334', village: 'Srirangapatna', district: 'Mandya', c: [76.6934, 12.4181], irr: 'canal' },
    { name: 'Manjunath K', phone: '9886677889', village: 'Pandavapura', district: 'Mandya', c: [76.6757, 12.4966], irr: 'borewell' },
    { name: 'Savitha R', phone: '9900112233', village: 'Arkalgud', district: 'Hassan', c: [76.0554, 12.7606], irr: 'drip' },
    { name: 'Basavaraj H', phone: '8095544332', village: 'Belur', district: 'Hassan', c: [75.8656, 13.1650], irr: 'rainfed' },
    { name: 'Nagaraj S', phone: '9448899001', village: 'Kollegal', district: 'Chamarajanagar', c: [77.1106, 12.1534], irr: 'borewell' },
    { name: 'Geetha M', phone: '7019988776', village: 'Tiptur', district: 'Tumakuru', c: [76.4777, 13.2584], irr: 'drip' },
    { name: 'Venkatesh P', phone: '9663344556', village: 'Nanjangud', district: 'Mysuru', c: [76.6808, 12.1189], irr: 'canal' }
  ];
  const farmers = await Farmer.insertMany(farmerData.map(f => ({
    name: f.name, phone: f.phone, village: f.village, district: f.district,
    location: { type: 'Point', coordinates: f.c },
    farms: [{ farmName: `${f.name.split(' ')[0]} Farm`, totalAcres: Math.round(rand(3, 12)), irrigationType: f.irr }]
  })));
  console.log(`Farmers: ${farmers.length}`);

  // ---------- FIELDS (1-2 per farmer) ----------
  const soilTypes = ['red', 'black', 'alluvial', 'laterite', 'sandy'];
  const fieldDocs = [];
  farmers.forEach((fm, i) => {
    const count = i % 2 === 0 ? 2 : 1;
    for (let n = 1; n <= count; n++) {
      fieldDocs.push({
        farmer: fm._id,
        name: `${fm.village} Plot ${n}`,
        areaAcres: +rand(1, 5).toFixed(1),
        location: { type: 'Point', coordinates: [jitter(fm.location.coordinates[0]), jitter(fm.location.coordinates[1])] },
        soil: { type: pick(soilTypes), pH: +rand(5.5, 7.8).toFixed(1), nitrogen: Math.round(rand(180, 320)), phosphorus: Math.round(rand(10, 40)), potassium: Math.round(rand(100, 250)) }
      });
    }
  });
  const fields = await Field.insertMany(fieldDocs);
  console.log(`Fields: ${fields.length}`);

  // ---------- PLANTINGS + HARVESTS ----------
  const plantingDocs = [];
  fields.forEach((fld, idx) => {
    const howMany = idx % 3 === 0 ? 3 : 2;
    for (let k = 0; k < howMany; k++) {
      const crop = pick(crops);
      let sowDate;
      if (idx === 0 && k === 0) {
        sowDate = new Date(now - (crop.growthDays - 3) * DAY);   // harvest due in 3 days (for alerts demo)
      } else {
        sowDate = new Date(now - rand(20, 330) * DAY);
      }
      const expectedHarvest = new Date(sowDate.getTime() + crop.growthDays * DAY);
      const status = expectedHarvest < now ? 'harvested' : 'growing';
      const activities = [
        { type: 'irrigation', date: new Date(sowDate.getTime() + 5 * DAY), details: 'Initial irrigation', cost: Math.round(rand(200, 600)) },
        { type: 'fertilizer', date: new Date(sowDate.getTime() + 20 * DAY), details: pick(['Urea', 'DAP', 'Compost']), cost: Math.round(rand(800, 2500)) },
        { type: pick(['pesticide', 'weeding']), date: new Date(sowDate.getTime() + 40 * DAY), details: 'Routine crop protection', cost: Math.round(rand(300, 1500)) }
      ];
      plantingDocs.push({ field: fld._id, crop: crop._id, sowDate, expectedHarvest, status, activities, _area: fld.areaAcres, _base: crop.extra.baseYield });
    }
  });
  const plantings = await Planting.insertMany(plantingDocs);
  console.log(`Plantings: ${plantings.length}`);

  const harvestDocs = [];
  plantings.forEach((p, i) => {
    if (p.status === 'harvested') {
      const area = plantingDocs[i]._area;
      const base = plantingDocs[i]._base;
      const yieldPerAcre = Math.round(base * rand(0.8, 1.2));
      harvestDocs.push({
        planting: p._id, date: p.expectedHarvest,
        quantityKg: Math.round(yieldPerAcre * area),
        grade: pick(['A', 'A', 'B', 'C']), yieldPerAcre
      });
    }
  });
  await Harvest.insertMany(harvestDocs);
  console.log(`Harvests: ${harvestDocs.length}`);

  // ---------- SENSOR READINGS (last 29 days, 4 per day per field) ----------
  const readings = [];
  fields.forEach(fld => {
    for (let d = 0; d < 29; d++) {
      for (let h = 0; h < 4; h++) {
        readings.push({
          field: fld._id,
          timestamp: new Date(now - d * DAY - h * 6 * 60 * 60 * 1000),
          moisture: +rand(18, 75).toFixed(1),
          temperature: +rand(20, 36).toFixed(1),
          humidity: +rand(40, 90).toFixed(1)
        });
      }
    }
  });
  await SensorReading.insertMany(readings);
  console.log(`Sensor readings: ${readings.length}`);

  // ---------- MARKET PRICES (every 15 days for last 6 months, 2 mandis) ----------
  const basePrice = { 'Paddy': 2200, 'Ragi': 3800, 'Maize': 2100, 'Sugarcane': 330, 'Tomato': 1800, 'Groundnut': 6000, 'Tur Dal': 7200, 'Coconut': 3000 };
  const mandis = ['Mysuru APMC', 'Mandya APMC'];
  const prices = [];
  crops.forEach(c => {
    mandis.forEach(m => {
      for (let w = 0; w < 12; w++) {
        prices.push({
          crop: c._id, mandi: m,
          date: new Date(now - w * 15 * DAY),
          pricePerQuintal: Math.round(basePrice[c.name] * rand(0.85, 1.15))
        });
      }
    });
  });
  await MarketPrice.insertMany(prices);
  console.log(`Market prices: ${prices.length}`);

  // ---------- INPUTS (inventory) ----------
  await Input.insertMany([
    { name: 'Urea', type: 'fertilizer', stock: 120, unit: 'kg', costPerUnit: 6 },
    { name: 'DAP', type: 'fertilizer', stock: 80, unit: 'kg', costPerUnit: 28 },
    { name: 'Compost', type: 'fertilizer', stock: 500, unit: 'kg', costPerUnit: 4 },
    { name: 'Neem Oil', type: 'pesticide', stock: 25, unit: 'litre', costPerUnit: 350 },
    { name: 'Paddy Seed IR-64', type: 'seed', stock: 60, unit: 'kg', costPerUnit: 45 },
    { name: 'Ragi Seed GPU-28', type: 'seed', stock: 40, unit: 'kg', costPerUnit: 70 }
  ]);
  console.log('Inputs: 6');

  console.log('Seeding complete!');
  await mongoose.disconnect();
}

seed().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });