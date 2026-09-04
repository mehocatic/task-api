'use strict';

// Plain JS object instead of swagger-jsdoc: one dependency less, and the spec is
// a normal module you can lint, import in tests, or dump to JSON.
const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Task API',
    version: '1.0.0',
    description: 'RESTful CRUD API for tasks. Storage is in-memory — data resets on restart.',
  },
  servers: [{ url: '/', description: 'Current host' }],
  tags: [
    { name: 'Tasks', description: 'Task CRUD operations' },
    { name: 'System', description: 'Service metadata and health' },
  ],
  components: {
    schemas: {
      Task: {
        type: 'object',
        required: ['id', 'title', 'done'],
        properties: {
          id: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Write the API docs' },
          done: { type: 'boolean', example: false },
        },
      },
      CreateTaskRequest: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1, example: 'Write the API docs' },
        },
      },
      UpdateTaskRequest: {
        type: 'object',
        minProperties: 1,
        properties: {
          title: { type: 'string', minLength: 1, example: 'Write the API docs' },
          done: { type: 'boolean', example: true },
        },
        description: 'At least one of "title" or "done" is required.',
      },
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string', example: 'Task with id 42 not found' },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Invalid request body',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'Task not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
    parameters: {
      TaskId: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Numeric task ID',
        schema: { type: 'integer', minimum: 1 },
      },
    },
  },
  paths: {
    '/': {
      get: {
        tags: ['System'],
        summary: 'API info',
        responses: {
          200: {
            description: 'Service name, version and available endpoints',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'Service is up',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    uptime: { type: 'number', example: 12.34 },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List all tasks',
        responses: {
          200: {
            description: 'Array of tasks',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create a task',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateTaskRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Task created',
            headers: {
              Location: { schema: { type: 'string' }, description: 'URL of the new task' },
            },
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/tasks/{id}': {
      parameters: [{ $ref: '#/components/parameters/TaskId' }],
      get: {
        tags: ['Tasks'],
        summary: 'Get a task by ID',
        responses: {
          200: {
            description: 'The task',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Tasks'],
        summary: 'Update a task',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateTaskRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Updated task',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task',
        responses: {
          204: { description: 'Task deleted, no content returned' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
};

module.exports = openapi;
