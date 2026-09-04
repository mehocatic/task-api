'use strict';

const app = require('./app');

const PORT = process.env.PORT || 3000;

// app.js exports the app without listening — that split lets a test runner
// (supertest, etc.) mount the app without occupying a port.
app.listen(PORT, () => {
  console.log(`Task API listening on http://localhost:${PORT}`);
  console.log(`Swagger UI available at http://localhost:${PORT}/docs`);
});
