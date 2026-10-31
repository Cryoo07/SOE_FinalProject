require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const requiredEnvironment = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'SESSION_SECRET'];
const missingEnvironment = requiredEnvironment.filter(name => !process.env[name]);
if (missingEnvironment.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvironment.join(', ')}`);
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

pool.on('error', error => {
  console.error('Unexpected PostgreSQL pool error:', error);
});

const app = express();
app.use(express.json({ limit: '10kb' }));
app.use(session({
  name: 'banana.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Please log in' });
  }
  next();
}

async function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Please log in' });
  }

  try {
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.session.userId]);
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Account not found' });
    }
    req.session.role = result.rows[0].role;
    if (req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator access required' });
    }
    next();
  } catch (error) {
    console.error('Administrator authorization failed:', error);
    res.status(500).json({ error: 'Could not verify administrator access' });
  }
}

app.post('/api/register', async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!username || username.length > 50 || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ error: 'Username must be 1–50 characters and password must be 8–72 bytes' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
      [username, passwordHash]
    );
    res.status(201).json({ id: result.rows[0].id, username });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('Registration failed:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    return res.status(400).json({ error: 'Enter your username and password' });
  }

  try {
    const result = await pool.query(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1',
      [username]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    await new Promise((resolve, reject) => {
      req.session.regenerate(error => error ? reject(error) : resolve());
    });
    req.session.userId = user.id;
    req.session.role = user.role;
    if (req.body.remember === true) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    }
    res.json({ username: user.username });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/me', async (req, res) => {
  if (!req.session.userId) {
    return res.json({ loggedIn: false });
  }
  try {
    const result = await pool.query('SELECT username, role FROM users WHERE id = $1', [req.session.userId]);
    if (result.rowCount === 0) {
      return req.session.destroy(error => {
        if (error) {
          console.error('Could not clear invalid session:', error);
          return res.status(500).json({ error: 'Could not verify session' });
        }
        res.json({ loggedIn: false });
      });
    }
    req.session.role = result.rows[0].role;
    res.json({ loggedIn: true, username: result.rows[0].username, role: result.rows[0].role });
  } catch (error) {
    console.error('Session lookup failed:', error);
    res.status(500).json({ error: 'Could not verify session' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(error => {
    if (error) {
      console.error('Logout failed:', error);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('banana.sid', { httpOnly: true, sameSite: 'lax' });
    res.json({ ok: true });
  });
});

app.post('/api/scores', requireLogin, async (req, res) => {
  const score = req.body.score;
  if (!Number.isSafeInteger(score) || score < 0) {
    return res.status(400).json({ error: 'Score must be a non-negative whole number' });
  }

  try {
    await pool.query(
      'INSERT INTO scores (user_id, score) VALUES ($1, $2)',
      [req.session.userId, score]
    );
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Score save failed:', error);
    res.status(500).json({ error: 'Could not save score' });
  }
});

app.get('/api/profile', requireLogin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT users.username, users.role, users.created_at,
             COUNT(scores.id)::int AS total_games,
             COALESCE(MAX(scores.score), 0)::int AS best_score
      FROM users
      LEFT JOIN scores ON scores.user_id = users.id
      WHERE users.id = $1
      GROUP BY users.id, users.username, users.role, users.created_at
    `, [req.session.userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Profile lookup failed:', error);
    res.status(500).json({ error: 'Could not load profile' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT users.username, MAX(scores.score) AS best_score
      FROM users
      JOIN scores ON scores.user_id = users.id
      GROUP BY users.id, users.username
      ORDER BY best_score DESC, users.username ASC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Leaderboard query failed:', error);
    res.status(500).json({ error: 'Could not load leaderboard' });
  }
});

app.get('/api/admin/overview', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS total_users,
        (SELECT COUNT(*)::int FROM scores) AS total_games,
        (SELECT COUNT(*)::int FROM users WHERE role = 'admin') AS total_admins
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Admin overview failed:', error);
    res.status(500).json({ error: 'Could not load administrator overview' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const port = Number(process.env.PORT || 3000);
async function start() {
  await pool.query('SELECT 1');
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_role_check'
          AND conrelid = 'users'::regclass
      ) THEN
        ALTER TABLE users
        ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
      END IF;
    END
    $$
  `);
  app.listen(port, () => {
    console.log(`Banana Quiz running at http://localhost:${port}`);
  });
}

start().catch(async error => {
  console.error('Could not connect to PostgreSQL:', error.message);
  await pool.end();
  process.exitCode = 1;
});
