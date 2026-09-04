'use strict';

// Module-level state. Lives only for the lifetime of the process — restart wipes it.
const tasks = [];

// Separate counter instead of `tasks.length + 1`: after a delete, length-based IDs
// would collide with an existing task's ID.
let nextId = 1;

function findAll() {
  return tasks;
}

function findById(id) {
  return tasks.find((task) => task.id === id) ?? null;
}

function create({ title }) {
  const task = { id: nextId++, title, done: false };
  tasks.push(task);
  return task;
}

// Mutates in place so the object identity stays the same as what findAll returns.
function update(id, changes) {
  const task = findById(id);
  if (!task) return null;

  if (changes.title !== undefined) task.title = changes.title;
  if (changes.done !== undefined) task.done = changes.done;
  return task;
}

function remove(id) {
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return false;

  tasks.splice(index, 1);
  return true;
}

// Test-only helper: lets a test suite start from a clean slate.
function reset() {
  tasks.length = 0;
  nextId = 1;
}

module.exports = { findAll, findById, create, update, remove, reset };
