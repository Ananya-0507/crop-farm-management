const express = require('express');

// Builds a full CRUD router for any Mongoose model
module.exports = function crudRouter(Model, populate = '') {
  const router = express.Router();

  // READ all (optional filters via query string, e.g. ?status=growing)
  router.get('/', async (req, res) => {
    try {
      let q = Model.find(req.query).limit(200);
      if (populate) q = q.populate(populate);
      res.json(await q);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // READ one
  router.get('/:id', async (req, res) => {
    try {
      let q = Model.findById(req.params.id);
      if (populate) q = q.populate(populate);
      const doc = await q;
      if (!doc) return res.status(404).json({ error: 'Not found' });
      res.json(doc);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // CREATE
  router.post('/', async (req, res) => {
    try {
      res.status(201).json(await Model.create(req.body));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // UPDATE
  router.put('/:id', async (req, res) => {
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true, runValidators: true
      });
      if (!doc) return res.status(404).json({ error: 'Not found' });
      res.json(doc);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // DELETE
  router.delete('/:id', async (req, res) => {
    try {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Deleted' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
};