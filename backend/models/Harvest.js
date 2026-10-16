const mongoose = require('mongoose');

const harvestSchema = new mongoose.Schema({
  planting: { type: mongoose.Schema.Types.ObjectId, ref: 'Planting', required: true },
  date: { type: Date, required: true },
  quantityKg: { type: Number, required: true, min: 0 },
  grade: { type: String, enum: ['A', 'B', 'C'] },
  yieldPerAcre: Number
});

harvestSchema.index({ planting: 1 });
module.exports = mongoose.model('Harvest', harvestSchema);