'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');

const tasksRouter = require('./tasks');
const openapi = require('./openapi');
const app = express();

app.use(express.json());

// GET / — API info
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Task API',
    version: '1.0.0',
    docs: '/docs',
    endpoints: {
      'GET /tasks': 'List all tasks',
      'GET /tasks/:id': 'Get one task',
      'POST /tasks': 'Create a task',
      'PUT /tasks/:id': 'Update a task',
      'DELETE /tasks/:id': 'Delete a task',
      'GET /health': 'Health check',
    },
  });
});

// GET /health
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Swagger UI. serve is middleware, setup is the handler that renders the page.
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

// Raw spec, handy for codegen or importing into Postman.
app.get('/openapi.json', (req, res) => res.status(200).json(openapi));

app.use('/tasks', tasksRouter);

// Unmatched routes: JSON 404 rather than Express's default HTML page, so clients
// never have to parse two different error formats.
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Error handler must declare 4 args or Express treats it as normal middleware.
app.use((err, req, res, next) => {
  // express.json() throws a SyntaxError with `body` set on malformed JSON —
  // that's a client mistake, so 400 rather than 500.
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON in request body' });
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
