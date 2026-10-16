const mongoose = require('mongoose');

const inputSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['seed', 'fertilizer', 'pesticide'] },
  stock: { type: Number, min: 0, default: 0 },
  unit: String,
  costPerUnit: Number
});

module.exports = mongoose.model('Input', inputSchema);