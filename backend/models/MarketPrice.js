const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({
  crop: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop', required: true },
  mandi: { type: String, required: true },
  date: { type: Date, required: true },
  pricePerQuintal: { type: Number, required: true, min: 0 }
});

priceSchema.index({ crop: 1, date: -1 });
module.exports = mongoose.model('MarketPrice', priceSchema);