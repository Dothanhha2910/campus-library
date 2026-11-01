class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9]{9,15}$/;

function validateEmail(email, errors) {
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim()) || email.length > 100) {
    errors.email = 'A valid email is required (max 100 characters)';
    return null;
  }
  return email.trim().toLowerCase();
}

function validatePassword(password, errors, key = 'password', { minLen = 8, complexity = true } = {}) {
  if (typeof password !== 'string' || password.length < minLen || password.length > 64) {
    errors[key] = 'Password must be 8-64 characters';
  } else if (complexity && (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))) {
    errors[key] = 'Password must contain at least one letter and one digit';
  }
}

function validateName(name, errors) {
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50) {
    errors.name = 'Name must be 2-50 characters';
    return null;
  }
  return name.trim();
}

function validatePhone(phone, errors) {
  if (phone === undefined || phone === null || phone === '') return null;
  if (typeof phone !== 'string' || !PHONE_RE.test(phone)) {
    errors.phone = 'Phone must be 9-15 digits, optionally starting with +';
    return null;
  }
  return phone;
}

/** Throws a 400 if the errors object has any key. */
function failIfInvalid(errors) {
  if (Object.keys(errors).length) {
    throw new HttpError(400, 'Validation failed', errors);
  }
}

function parsePaging(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const pageSize = query.pageSize === undefined ? 10 : Number(query.pageSize);
  if (!Number.isInteger(page) || page < 1) {
    throw new HttpError(400, 'page must be an integer >= 1');
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new HttpError(400, 'pageSize must be an integer between 1 and 50');
  }
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function pageResult(items, total, { page, pageSize }) {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

function parseId(value, label = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, `${label} must be a positive integer`);
  return id;
}

/** Escape % and _ so user input is matched literally inside LIKE. */
function likePattern(q) {
  return `%${String(q).replace(/[\\%_]/g, (c) => '\\' + c)}%`;
}

module.exports = {
  HttpError,
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  failIfInvalid,
  parsePaging,
  pageResult,
  parseId,
  likePattern,
};
