const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Harvest = require('../models/Harvest');
const SensorReading = require('../models/SensorReading');
const MarketPrice = require('../models/MarketPrice');
const Planting = require('../models/Planting');
const Field = require('../models/Field');

const DAY = 24 * 60 * 60 * 1000;

// 1. AGGREGATION: total yield per crop ($lookup joins harvests -> plantings -> crops)
router.get('/yield-by-crop', async (req, res) => {
  try {
    const data = await Harvest.aggregate([
      { $lookup: { from: 'plantings', localField: 'planting', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' },
      { $lookup: { from: 'crops', localField: 'p.crop', foreignField: '_id', as: 'c' } },
      { $unwind: '$c' },
      { $group: {
          _id: '$c.name',
          totalKg: { $sum: '$quantityKg' },
          avgYieldPerAcre: { $avg: '$yieldPerAcre' },
          harvests: { $sum: 1 }
      } },
      { $project: { _id: 0, crop: '$_id', totalKg: 1, harvests: 1,
                    avgYieldPerAcre: { $round: ['$avgYieldPerAcre', 0] } } },
      { $sort: { totalKg: -1 } }
    ]);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. AGGREGATION: average soil moisture per field, last 7 days
router.get('/moisture-by-field', async (req, res) => {
  try {
    const since = new Date(Date.now() - 7 * DAY);
    const data = await SensorReading.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: {
          _id: '$field',
          avgMoisture: { $avg: '$moisture' },
          minMoisture: { $min: '$moisture' },
          maxMoisture: { $max: '$moisture' },
          readings: { $sum: 1 }
      } },
      { $lookup: { from: 'fields', localField: '_id', foreignField: '_id', as: 'f' } },
      { $unwind: '$f' },
      { $project: { _id: 0, field: '$f.name', readings: 1,
                    avgMoisture: { $round: ['$avgMoisture', 1] },
                    minMoisture: 1, maxMoisture: 1 } },
      { $sort: { avgMoisture: 1 } }
    ]);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. AGGREGATION: daily moisture trend for one field  e.g. /moisture-trend/<fieldId>
router.get('/moisture-trend/:fieldId', async (req, res) => {
  try {
    const data = await SensorReading.aggregate([
      { $match: { field: new mongoose.Types.ObjectId(req.params.fieldId) } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          avgMoisture: { $avg: '$moisture' },
          avgTemp: { $avg: '$temperature' }
      } },
      { $project: { _id: 0, date: '$_id',
                    avgMoisture: { $round: ['$avgMoisture', 1] },
                    avgTemp: { $round: ['$avgTemp', 1] } } },
      { $sort: { date: 1 } }
    ]);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. AGGREGATION: profit per harvested planting
//    revenue = quantity (quintals) x average market price; cost = sum of embedded activity costs
router.get('/profit', async (req, res) => {
  try {
    const data = await Harvest.aggregate([
      { $lookup: { from: 'plantings', localField: 'planting', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' },
      { $lookup: { from: 'crops', localField: 'p.crop', foreignField: '_id', as: 'c' } },
      { $unwind: '$c' },
      { $lookup: { from: 'marketprices', localField: 'p.crop', foreignField: 'crop', as: 'prices' } },
      { $addFields: {
          avgPrice: { $avg: '$prices.pricePerQuintal' },
          cost: { $sum: '$p.activities.cost' }
      } },
      { $addFields: { revenue: { $multiply: [{ $divide: ['$quantityKg', 100] }, '$avgPrice'] } } },
      { $project: { _id: 0, crop: '$c.name', quantityKg: 1, grade: 1,
                    revenue: { $round: ['$revenue', 0] },
                    cost: 1,
                    profit: { $round: [{ $subtract: ['$revenue', '$cost'] }, 0] } } },
      { $sort: { profit: -1 } }
    ]);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. AGGREGATION: monthly average price for a crop  e.g. /price-trend/<cropId>
router.get('/price-trend/:cropId', async (req, res) => {
  try {
    const data = await MarketPrice.aggregate([
      { $match: { crop: new mongoose.Types.ObjectId(req.params.cropId) } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          avgPrice: { $avg: '$pricePerQuintal' }
      } },
      { $project: { _id: 0, month: '$_id', avgPrice: { $round: ['$avgPrice', 0] } } },
      { $sort: { month: 1 } }
    ]);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. GEOSPATIAL: fields near a point  e.g. /nearby-fields?lng=76.6394&lat=12.2958&km=50
router.get('/nearby-fields', async (req, res) => {
  try {
    const lng = parseFloat(req.query.lng);
    const lat = parseFloat(req.query.lat);
    const km = parseFloat(req.query.km) || 50;
    if (isNaN(lng) || isNaN(lat)) {
      return res.status(400).json({ error: 'lng and lat are required' });
    }
    const fields = await Field.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: km * 1000
        }
      }
    }).populate('farmer', 'name village');
    res.json(fields);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 7. ALERTS: harvests due in the next 7 days + fields with low latest moisture
router.get('/alerts', async (req, res) => {
  try {
    const now = new Date();
    const harvestDue = await Planting.find({
      status: { $ne: 'harvested' },
      expectedHarvest: { $gte: now, $lte: new Date(now.getTime() + 7 * DAY) }
    }).populate('crop', 'name').populate('field', 'name');

    const lowMoisture = await SensorReading.aggregate([
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$field', latestMoisture: { $first: '$moisture' }, at: { $first: '$timestamp' } } },
      { $match: { latestMoisture: { $lt: 25 } } },
      { $lookup: { from: 'fields', localField: '_id', foreignField: '_id', as: 'f' } },
      { $unwind: '$f' },
      { $project: { _id: 0, field: '$f.name', latestMoisture: 1, at: 1 } }
    ]);

    res.json({ harvestDue, lowMoisture });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;