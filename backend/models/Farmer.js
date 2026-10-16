const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true },
  phone: { type: String, required: true, match: /^[6-9]\d{9}$/ },
  village: String,
  district: String,
  location: {                       // GeoJSON point
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }   // [longitude, latitude]
  },
  farms: [{                         // EMBEDDED documents
    farmName: String,
    totalAcres: Number,
    irrigationType: { type: String, enum: ['drip', 'canal', 'borewell', 'rainfed'] }
  }],
  createdAt: { type: Date, default: Date.now }
});

farmerSchema.index({ location: '2dsphere' });   // geospatial index
module.exports = mongoose.model('Farmer', farmerSchema);