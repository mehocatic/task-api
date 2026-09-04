'use strict';

const express = require('express');
const store = require('./taskStore');
const { parseId, validateCreate, validateUpdate } = require('./validators');

const router = express.Router();

const NOT_FOUND = (id) => ({ error: `Task with id ${id} not found` });

// GET /tasks
router.get('/', (req, res) => {
  res.status(200).json(store.findAll());
});

// GET /tasks/:id
router.get('/:id', (req, res) => {
  const id = parseId(req.params.id);
  const task = store.findById(id);

  if (!task) return res.status(404).json(NOT_FOUND(req.params.id));
  res.status(200).json(task);
});

// POST /tasks
router.post('/', (req, res) => {
  const result = validateCreate(req.body);
  if (!result.ok) return res.status(400).json({ error: result.error });

  const task = store.create(result.value);
  // Location header is the REST convention for 201 — tells the client where the
  // new resource lives without them having to construct the URL.
  res.status(201).location(`/tasks/${task.id}`).json(task);
});

// PUT /tasks/:id
router.put('/:id', (req, res) => {
  const result = validateUpdate(req.body);
  // Validate the body before touching the store: a malformed payload is a 400
  // regardless of whether the task exists.
  if (!result.ok) return res.status(400).json({ error: result.error });

  const id = parseId(req.params.id);
  const task = store.update(id, result.value);

  if (!task) return res.status(404).json(NOT_FOUND(req.params.id));
  res.status(200).json(task);
});

// DELETE /tasks/:id
router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);
  const deleted = store.remove(id);

  if (!deleted) return res.status(404).json(NOT_FOUND(req.params.id));
  // 204 must have an empty body — .send() with no argument, never .json().
  res.status(204).send();
});

module.exports = router;
