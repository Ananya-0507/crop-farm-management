const mongoose = require('mongoose');

const plantingSchema = new mongoose.Schema({
  field: { type: mongoose.Schema.Types.ObjectId, ref: 'Field', required: true },
  crop:  { type: mongoose.Schema.Types.ObjectId, ref: 'Crop', required: true },
  sowDate: { type: Date, required: true },
  expectedHarvest: { type: Date, required: true },
  status: { type: String, enum: ['sown', 'growing', 'harvested', 'failed'], default: 'sown' },
  activities: [{                    // EMBEDDED
    type: { type: String, enum: ['irrigation', 'fertilizer', 'pesticide', 'weeding'] },
    date: Date,
    details: String,
    cost: { type: Number, default: 0 }
  }]
});

plantingSchema.index({ field: 1, status: 1 });   // compound index
plantingSchema.index({ expectedHarvest: 1 });
module.exports = mongoose.model('Planting', plantingSchema);