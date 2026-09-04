'use strict';

// Strict digits-only check. Number.parseInt('12abc') would yield 12 and match a real
// task, so the regex guards against sloppy IDs resolving to real resources.
function parseId(raw) {
  return /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// express.json() will happily parse `[1,2]` or `"hi"` as a body, so check the shape
// before reading properties off it.
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * POST /tasks body rules.
 * @returns {{ ok: true, value: { title: string } } | { ok: false, error: string }}
 */
function validateCreate(body) {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }
  if (!isNonEmptyString(body.title)) {
    return { ok: false, error: 'Field "title" is required and must be a non-empty string' };
  }
  return { ok: true, value: { title: body.title.trim() } };
}

/**
 * PUT /tasks/:id body rules: both fields optional, but at least one required.
 * @returns {{ ok: true, value: { title?: string, done?: boolean } } | { ok: false, error: string }}
 */
function validateUpdate(body) {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  const hasTitle = body.title !== undefined;
  const hasDone = body.done !== undefined;

  if (!hasTitle && !hasDone) {
    return { ok: false, error: 'At least one of "title" or "done" must be provided' };
  }
  if (hasTitle && !isNonEmptyString(body.title)) {
    return { ok: false, error: 'Field "title" must be a non-empty string' };
  }
  if (hasDone && typeof body.done !== 'boolean') {
    return { ok: false, error: 'Field "done" must be a boolean' };
  }

  const value = {};
  if (hasTitle) value.title = body.title.trim();
  if (hasDone) value.done = body.done;
  return { ok: true, value };
}

module.exports = { parseId, validateCreate, validateUpdate };
