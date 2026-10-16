const mongoose = require('mongoose');

const sensorSchema = new mongoose.Schema({
  field: { type: mongoose.Schema.Types.ObjectId, ref: 'Field', required: true },
  timestamp: { type: Date, default: Date.now },
  moisture: { type: Number, min: 0, max: 100 },
  temperature: Number,
  humidity: Number
});

sensorSchema.index({ field: 1, timestamp: -1 });                       // compound index
sensorSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // TTL index: 30 days
module.exports = mongoose.model('SensorReading', sensorSchema);