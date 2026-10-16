const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  category: { type: String, enum: ['cereal', 'pulse', 'vegetable', 'fruit', 'cash', 'oilseed'] },
  season: { type: String, enum: ['kharif', 'rabi', 'zaid', 'perennial'] },
  growthDays: Number,
  idealSoil: [String],
  varieties: [String],
  extra: mongoose.Schema.Types.Mixed   // crop-specific attributes, e.g. spacing
});

cropSchema.index({ name: 'text', category: 'text' });   // text search index
module.exports = mongoose.model('Crop', cropSchema);