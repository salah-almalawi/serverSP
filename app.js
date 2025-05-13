const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const winston = require('./utils/logger');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('./config/db');


const authRouter = require('./routes/auth');

const app = express();

// Security middleware: Helmet, CORS, and rate limiting
app.use(helmet());
app.use(cors());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                  // limit each IP to 100 requests per windowMs
  standardHeaders: true,     // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false       // Disable the `X-RateLimit-*` headers
}));

// Request logging using Winston (single entry on finish)
app.use((req, res, next) => {
  res.on('finish', () => {
    winston.info(`${req.method} ${req.originalUrl} ${req.ip} ${res.statusCode}`);
  });
  next();
});

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/api/auth', authRouter);


module.exports = app;