require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');

// Use appropriate session store based on environment
const isProduction = !!process.env.DATABASE_URL;
let sessionStore;

if (isProduction) {
  // In production with PostgreSQL, use memory store (or you can add connect-pg-simple later)
  // For now, default express-session memory store works for single-instance deployments
  sessionStore = undefined; // Uses default MemoryStore
} else {
  // Local development uses SQLite session store
  const SQLiteStore = require('connect-sqlite3')(session);
  sessionStore = new SQLiteStore({ db: 'sessions.db', dir: './' });
}

const db = require('./db');

const authRoutes = require('./routes/auth');
const { requireAuth } = require('./middleware/auth');

const app = express();
const port = process.env.PORT || 3001;

// CORS configuration - support both local development and production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176'
];

// Add production frontend URL if set
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In production, be more permissive for Vercel preview URLs
    if (isProduction && origin.includes('vercel.app')) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true
}));

app.use(express.json());

// Session configuration with mobile browser compatibility
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: true, // Force save even if session wasn't modified
  saveUninitialized: false,
  rolling: true, // Reset expiry on every response  
  cookie: {
    secure: isProduction, // Use secure cookies in production (HTTPS)
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days (longer for mobile convenience)
    sameSite: isProduction ? 'none' : 'lax', // Required for cross-origin in production
    path: '/'
  }
};

if (sessionStore) {
  sessionConfig.store = sessionStore;
}

// Trust proxy in production (for Render, Heroku, etc)
if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(session(sessionConfig));


app.use('/auth', authRoutes);
app.use('/clinic', require('./routes/clinics'));
app.use('/patients', require('./routes/psychiatric-profile'));
app.use('/patients', require('./routes/symptoms'));
app.use('/patients', require('./routes/documents'));
app.use('/patients', require('./routes/asd-profile'));
app.use('/patients', require('./routes/asd-forms'));
app.use('/patients', require('./routes/final-reports'));
app.use('/', require('./routes/documents')); // For /documents/:id/file endpoint
app.use('/patients', require('./routes/patients'));
app.use('/appointments', require('./routes/appointments'));
app.use('/notes', require('./routes/notes'));
app.use('/pharmacies', require('./routes/pharmacies'));
app.use('/inventory', require('./routes/inventory'));
app.use('/suppliers', require('./routes/suppliers'));
app.use('/integrations', require('./routes/integrations'));
app.use('/financial-events', require('./routes/financial-events'));
app.use('/backup', require('./routes/backup'));
app.use('/payouts', require('./routes/payouts'));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: isProduction ? 'postgresql' : 'sqlite',
    environment: isProduction ? 'production' : 'development'
  });
});

// Admin endpoint to apply pending migrations (PostgreSQL only)
app.post('/admin/migrate', async (req, res) => {
  if (!isProduction) {
    return res.status(400).json({ error: 'Migration endpoint only available in production' });
  }

  // Check if db.pool exists (PostgreSQL mode)
  if (!db.pool) {
    return res.status(500).json({ error: 'Database pool not available' });
  }

  const alterMigrations = [
    {
      name: 'add_clinician_id_to_appointments',
      sql: `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS clinician_id INTEGER REFERENCES users(id)`
    },
    {
      name: 'add_reference_type_to_financial_events',
      sql: `ALTER TABLE financial_events ADD COLUMN IF NOT EXISTS reference_type TEXT`
    },
    {
      name: 'add_reference_id_to_financial_events',
      sql: `ALTER TABLE financial_events ADD COLUMN IF NOT EXISTS reference_id INTEGER`
    }
  ];

  const results = [];

  try {
    for (const migration of alterMigrations) {
      try {
        await db.pool.query(migration.sql);
        results.push({ name: migration.name, status: 'applied' });
      } catch (err) {
        if (err.code === '42701') {
          results.push({ name: migration.name, status: 'already_exists' });
        } else {
          results.push({ name: migration.name, status: 'error', error: err.message, code: err.code });
        }
      }
    }

    res.json({ success: true, migrations: results, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack, migrations: results });
  }
});

// Example protected route
app.get('/protected', requireAuth, (req, res) => {
  res.json({ message: 'This is protected data', user: req.session.username });
});

// Auto-run migrations on startup for PostgreSQL
async function runStartupMigrations() {
  if (!isProduction || !db.pool) {
    console.log('Skipping migrations (not in production or no pool)');
    return;
  }

  const alterMigrations = [
    { name: 'add_clinician_id', sql: `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS clinician_id INTEGER REFERENCES users(id)` },
    { name: 'add_reference_type', sql: `ALTER TABLE financial_events ADD COLUMN IF NOT EXISTS reference_type TEXT` },
    { name: 'add_reference_id', sql: `ALTER TABLE financial_events ADD COLUMN IF NOT EXISTS reference_id INTEGER` },
    { name: 'add_uploaded_at_to_docs', sql: `ALTER TABLE patient_documents ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP` },
    { name: 'add_doc_date_to_docs', sql: `ALTER TABLE patient_documents ADD COLUMN IF NOT EXISTS doc_date DATE` },
    { name: 'fix_psychiatric_profile', sql: `ALTER TABLE patient_psychiatric_profile ADD COLUMN IF NOT EXISTS psychiatric_history_text TEXT` },
    {
      name: 'fix_patient_symptoms_schema',
      sql: `
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'patient_symptoms' AND column_name = 'symptom_name'
          ) OR NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'patient_symptoms' AND column_name = 'depression'
          ) THEN
            DROP TABLE IF EXISTS patient_symptoms CASCADE;
            CREATE TABLE patient_symptoms (
              id SERIAL PRIMARY KEY,
              patient_id INTEGER UNIQUE REFERENCES patients(id),
              depression INTEGER DEFAULT 0,
              anxiety INTEGER DEFAULT 0,
              panic INTEGER DEFAULT 0,
              ptsd INTEGER DEFAULT 0,
              ocd INTEGER DEFAULT 0,
              psychosis INTEGER DEFAULT 0,
              mania INTEGER DEFAULT 0,
              substance_use INTEGER DEFAULT 0,
              sleep_problem INTEGER DEFAULT 0,
              suicidal_ideation INTEGER DEFAULT 0,
              self_harm INTEGER DEFAULT 0,
              irritability INTEGER DEFAULT 0,
              attention_problem INTEGER DEFAULT 0,
              notes TEXT,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_by INTEGER
            );
          END IF;
        END $$;
      `
    },
    {
      name: 'fix_asd_forms_schema',
      sql: `
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'patient_asd_forms' AND column_name = 'form_type'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'patient_asd_forms' AND column_name = 'form_version'
          ) THEN
            DROP TABLE IF EXISTS patient_asd_forms CASCADE;
            CREATE TABLE patient_asd_forms (
              id SERIAL PRIMARY KEY,
              patient_id INTEGER REFERENCES patients(id),
              form_version TEXT DEFAULT 'v1',
              responses_json TEXT,
              summary_text TEXT,
              created_by INTEGER,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          ELSIF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'patient_asd_forms' AND column_name = 'form_version'
          ) THEN
            ALTER TABLE patient_asd_forms ADD COLUMN IF NOT EXISTS form_version TEXT DEFAULT 'v1';
            ALTER TABLE patient_asd_forms ADD COLUMN IF NOT EXISTS responses_json TEXT;
            ALTER TABLE patient_asd_forms ADD COLUMN IF NOT EXISTS summary_text TEXT;
            ALTER TABLE patient_asd_forms ADD COLUMN IF NOT EXISTS created_by INTEGER;
          END IF;
        END $$;
      `
    },

    // Fix clinical_notes - add missing columns for follow-up notes
    { name: 'add_appointment_id_to_notes', sql: `ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS appointment_id INTEGER` },
    { name: 'add_changes_since_last_visit', sql: `ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS changes_since_last_visit TEXT` },
    { name: 'add_medication_adherence_change', sql: `ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS medication_adherence_change TEXT` },
    { name: 'add_side_effects_change', sql: `ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS side_effects_change TEXT` }
  ];

  console.log('Running startup migrations...');
  for (const m of alterMigrations) {
    try {
      await db.pool.query(m.sql);
      console.log(`✓ Migration applied: ${m.name}`);
    } catch (err) {
      if (err.code === '42701') {
        console.log(`- Already exists: ${m.name}`);
      } else {
        console.error(`✗ Migration error (${m.name}):`, err.message);
      }
    }
  }
  console.log('Startup migrations completed.');
}

app.listen(port, async () => {
  console.log(`Yomchi Healthcare backend running on http://localhost:${port}`);
  console.log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);

  // Run migrations after server starts
  await runStartupMigrations();
});
