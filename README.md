# Crop & Farm Management System

A full-stack web application built with MongoDB, Express, Node.js and a plain HTML/JS frontend (Chart.js).

## Features
- CRUD for farmers, fields, crops, plantings, harvests, sensor readings, market prices and inputs
- Aggregation pipelines (yield, moisture, profit, price trends)
- Geospatial query, TTL index, schema validation, alerts
- Dashboard with charts

## How to run
1. Install Node.js and MongoDB Community Server.
2. In `backend`: `npm install`
3. Copy `.env.example` to `.env`
4. Seed sample data: `npm run seed`
5. Start the server: `npm run dev`
6. Open `frontend/index.html` in a browser.