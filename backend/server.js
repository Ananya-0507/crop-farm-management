require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const crudRouter = require('./routes/crud');

const Farmer = require('./models/Farmer');
const Field = require('./models/Field');
const Crop = require('./models/Crop');
const Planting = require('./models/Planting');
const Harvest = require('./models/Harvest');
const SensorReading = require('./models/SensorReading');
const MarketPrice = require('./models/MarketPrice');
const Input = require('./models/Input');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('Crop & Farm Management API running'));

// CRUD routes (the second argument fills in referenced documents)
app.use('/api/farmers', crudRouter(Farmer));
app.use('/api/fields', crudRouter(Field, 'farmer'));
app.use('/api/crops', crudRouter(Crop));
app.use('/api/plantings', crudRouter(Planting, 'field crop'));
app.use('/api/harvests', crudRouter(Harvest, 'planting'));
app.use('/api/sensor-readings', crudRouter(SensorReading, 'field'));
app.use('/api/market-prices', crudRouter(MarketPrice, 'crop'));
app.use('/api/inputs', crudRouter(Input));
app.use('/api/reports', require('./routes/reports'));

connectDB().then(() => {
  app.listen(process.env.PORT, () =>
    console.log(`Server running on http://localhost:${process.env.PORT}`));
});