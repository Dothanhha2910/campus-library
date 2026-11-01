const path = require('path');
const express = require('express');
const config = require('./config');
require('./db');
const { HttpError } = require('./util');

const app = express();
app.use(express.json({ limit: '100kb' }));

// Public client configuration (used by the frontend to set up Google sign-in)
app.get('/api/config', (_req, res) => {
  res.json({
    googleClientId: config.GOOGLE_CLIENT_ID || null,
    googleMock: config.GOOGLE_MOCK,
    injectBugs: require('./bugs').enabled, // lets the frontend enable its own planted bugs
    rules: {
      maxActiveLoans: config.MAX_ACTIVE_LOANS,
      loanDays: config.LOAN_DAYS,
      renewDays: config.RENEW_DAYS,
      finePerDay: config.FINE_PER_DAY,
      fineCap: config.FINE_CAP,
    },
  });
});
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/admin', require('./routes/admin'));

app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Endpoint not found')));

// Frontend (static files)
app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.fields && { fields: err.fields }) });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(config.PORT, () => {
    console.log(`Campus Library running at http://localhost:${config.PORT}`);
    console.log(`Google sign-in: ${config.GOOGLE_CLIENT_ID ? 'configured' : config.GOOGLE_MOCK ? 'MOCK mode' : 'not configured'}`);
  });
}

module.exports = app;
