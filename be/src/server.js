require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { testConnection } = require('./config/database');
const routes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 5000;


app.use(helmet());
app.use(compression());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  credentials: true,
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 3000, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date() }));
app.use('/api/v1', routes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ success: false, message: err.message }); });

const { startMailScheduler } = require('./services/mailScheduler');

async function start() {
  await testConnection();
  startMailScheduler();
  app.listen(PORT, '0.0.0.0', () => console.log(`CRM API running on :${PORT}`));
}
start();
