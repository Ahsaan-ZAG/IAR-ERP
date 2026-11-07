import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import compression from 'compression';
import apiV1Routes from './routes/api/v1/index.js';
import cors from 'cors';

import db from './config/database.js';
import SqliteSessionStore from './config/sessionStore.js';
import { doubleCsrfProtection, generateCsrfToken } from './config/security.js';
import { mobileReadOnly } from './middleware/mobileReadOnly.js';
import { getUnreadCount } from './services/notificationService.js';

import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import admissionRoutes from './routes/admissionRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import batchRoutes from './routes/batchRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import teacherAttendanceRoutes from './routes/teacherAttendanceRoutes.js';
import batchSessionRoutes from './routes/batchSessionRoutes.js';
import holidayRoutes from './routes/holidayRoutes.js';
import feeRoutes from './routes/feeRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import financialRoutes from './routes/financialRoutes.js';
import academicRoutes from './routes/academicRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import userRoutes from './routes/userRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import mobileRoutes from './routes/mobileRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import monthlyFeeRoutes from './routes/monthlyFeeRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

if (isProd) app.set('trust proxy', 1);

app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(compression());
app.use(cors());


app.use(session({
  store: new SqliteSessionStore(db),
  secret: process.env.SESSION_SECRET || 'dev-session-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8,
  },
}));

app.use((req, res, next) => {
  if (!req.session.csrfId) req.session.csrfId = crypto.randomUUID();
  next();
});

app.use(doubleCsrfProtection);
app.use(mobileReadOnly);

app.use((req, res, next) => {
  res.locals.csrfToken = generateCsrfToken(req, res);
  res.locals.user = req.session?.user ?? null;
  res.locals.accessMode = req.session?.access_mode ?? null;
  res.locals.currentPath = req.path;
  res.locals.flash = req.session?.flash || null;
  if (req.session?.flash) delete req.session.flash;
  res.locals.unreadNotifications = req.session?.user
    ? getUnreadCount(req.session.user.id)
    : 0;
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  try {
    db.prepare('SELECT 1 AS ok').get();
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: err.message });
  }
});

app.get('/', (req, res) => {
  if (req.session?.user) {
    return res.redirect(
      req.session.access_mode === 'mobile_readonly' ? '/mobile/dashboard' : '/dashboard'
    );
  }
  res.redirect('/login');
});

app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/', admissionRoutes);
app.use('/', studentRoutes);
app.use('/', teacherRoutes);
app.use('/', batchRoutes);
app.use('/', attendanceRoutes);
app.use('/', teacherAttendanceRoutes);
app.use('/', batchSessionRoutes);
app.use('/', holidayRoutes);
app.use('/', feeRoutes);
app.use('/', paymentRoutes);
app.use('/', financialRoutes);
app.use('/', academicRoutes);
app.use('/', courseRoutes);
app.use('/', assignmentRoutes);
app.use('/', notificationRoutes);
app.use('/', searchRoutes);
app.use('/', userRoutes);
app.use('/', auditRoutes);
app.use('/', reportRoutes);
app.use('/', analyticsRoutes);
app.use('/', aiRoutes);
app.use('/', mobileRoutes);
app.use('/', settingsRoutes);
app.use('/', backupRoutes);
app.use('/', invoiceRoutes);
app.use('/', monthlyFeeRoutes);
app.use('/', settingsRoutes);
app.use('/', backupRoutes);

app.use('/api/v1', apiV1Routes);

app.use((req, res) => res.status(404).render('errors/404', { title: 'Not Found' }));

app.use((err, req, res, next) => {
  console.error('==== ERROR ====', req.method, req.originalUrl, err.message);
  console.error(err.stack);
  if (isProd) return res.status(500).render('errors/500', { title: 'Server Error' });
  res.status(500).send(
    `<h1 style="color:#DC4545">500 — ${err.message}</h1><pre>${err.stack}</pre>`
  );
});


app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Imam Ahmed Raza Academy — Management System');
  console.log('  Under the Supervision of Barkati Foundation Trust');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  URL:    http://localhost:${PORT}`);
  console.log(`  Env:    ${process.env.NODE_ENV || 'development'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});
