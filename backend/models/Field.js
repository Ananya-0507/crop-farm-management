const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
  name: { type: String, required: true },
  areaAcres: { type: Number, required: true, min: 0.1 },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  soil: {                           // EMBEDDED
    type: { type: String, enum: ['red', 'black', 'alluvial', 'laterite', 'sandy'] },
    pH: { type: Number, min: 0, max: 14 },
    nitrogen: Number,
    phosphorus: Number,
    potassium: Number
  }
});

fieldSchema.index({ location: '2dsphere' });
fieldSchema.index({ farmer: 1 });
module.exports = mongoose.model('Field', fieldSchema);