import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const dataDir = path.resolve(__dirname, '../data');
const dbPath = path.join(dataDir, 'app.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

sqlite3.verbose();
const db = new sqlite3.Database(dbPath);

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, function (err, row) {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, function (err, rows) {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initDb() {
  await run(db, 'PRAGMA foreign_keys = ON');

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL
    )`
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS absences (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE
    )`
  );

  const count = await get(db, 'SELECT COUNT(*) as c FROM employees');
  if ((count?.c ?? 0) === 0) {
    const mock = [
      { id: '1', name: 'Alice Dubois', role: 'Développeuse Frontend' },
      { id: '2', name: 'Bob Martin', role: 'Chef de Projet' },
      { id: '3', name: 'Charlie Dupont', role: 'Designer UX/UI' },
      { id: '4', name: 'David Lefebvre', role: 'Ingénieur Backend' },
    ];
    for (const e of mock) {
      await run(db, 'INSERT INTO employees (id, name, role) VALUES (?, ?, ?)', [e.id, e.name, e.role]);
    }
  }
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return (
    Date.now().toString(16) + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2)
  ).slice(0, 32);
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await get(db, 'SELECT 1 as ok');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Employees
app.get('/api/employees', async (_req, res) => {
  try {
    const rows = await all(db, 'SELECT id, name, role FROM employees ORDER BY name ASC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/employees', async (req, res) => {
  try {
    const { name, role } = req.body || {};
    if (!name || !role) return res.status(400).json({ error: 'name et role sont requis' });
    const id = uuid();
    await run(db, 'INSERT INTO employees (id, name, role) VALUES (?, ?, ?)', [id, name, role]);
    res.status(201).json({ id, name, role });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role } = req.body || {};
    if (!name || !role) return res.status(400).json({ error: 'name et role sont requis' });
    const r = await run(db, 'UPDATE employees SET name = ?, role = ? WHERE id = ?', [name, role, id]);
    if (r.changes === 0) return res.status(404).json({ error: 'Employé non trouvé' });
    res.json({ id, name, role });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await run(db, 'DELETE FROM employees WHERE id = ?', [id]);
    if (r.changes === 0) return res.status(404).json({ error: "Employé non trouvé" });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Absences
app.get('/api/absences', async (req, res) => {
  try {
    const { employeeId } = req.query;
    let rows;
    if (employeeId) {
      rows = await all(
        db,
        'SELECT id, employeeId, date, type, startTime, endTime, notes FROM absences WHERE employeeId = ? ORDER BY date DESC',
        [employeeId]
      );
    } else {
      rows = await all(
        db,
        'SELECT id, employeeId, date, type, startTime, endTime, notes FROM absences ORDER BY date DESC'
      );
    }
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/absences', async (req, res) => {
  try {
    const { employeeId, date, type, startTime, endTime, notes } = req.body || {};
    if (!employeeId || !date || !type || !startTime || !endTime) {
      return res.status(400).json({ error: 'Champs requis: employeeId, date, type, startTime, endTime' });
    }
    const id = uuid();
    await run(
      db,
      'INSERT INTO absences (id, employeeId, date, type, startTime, endTime, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, employeeId, date, type, startTime, endTime, notes ?? null]
    );
    res.status(201).json({ id, employeeId, date, type, startTime, endTime, notes: notes ?? null });
  } catch (e) {
    if (String(e).includes('FOREIGN KEY constraint failed')) {
      return res.status(400).json({ error: "employeeId invalide" });
    }
    res.status(500).json({ error: String(e) });
  }
});

app.delete('/api/absences/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await run(db, 'DELETE FROM absences WHERE id = ?', [id]);
    if (r.changes === 0) return res.status(404).json({ error: 'Absence non trouvée' });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const PORT = process.env.PORT || 3001;

const initOnly = process.argv.includes('--init-only');

initDb()
  .then(async () => {
    if (initOnly) {
      console.log(`Base SQLite initialisée: ${dbPath}`);
      // close db before exit
      await new Promise((resolve) => db.close(() => resolve()))
      process.exit(0);
      return;
    }
    app.listen(PORT, () => {
      console.log(`API démarrée sur http://localhost:${PORT}`);
      console.log(`Base SQLite: ${dbPath}`);
    });
  })
  .catch((e) => {
    console.error('Erreur init DB', e);
    process.exit(1);
  });
