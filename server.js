// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(express.json()); // Replaces body-parser
app.use(express.static('public'));

// Initialize SQLite database
const db = new sqlite3.Database('voter.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Create tables and load initial data
db.serialize(() => {
  // Create bills table
  db.run(`
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      interest_rate REAL NOT NULL
    )
  `);

  // Create votes table
  db.run(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      state TEXT NOT NULL,
      vote TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bill_id) REFERENCES bills(id)
    )
  `);

  // Load bills from bills.json and insert into database
  let bills = [];
  try {
    const data = fs.readFileSync('data/bills.json', 'utf8');
    if (data.trim() === '') {
      console.warn('bills.json is empty. Starting with an empty bills list.');
    } else {
      bills = JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading or parsing bills.json:', err.message);
  }

  if (bills.length > 0) {
    const stmt = db.prepare('INSERT OR IGNORE INTO bills (id, name, amount, interest_rate) VALUES (?, ?, ?, ?)');
    bills.forEach(bill => {
      stmt.run(bill.id, bill.name, bill.amount, bill.interestRate);
    });
    stmt.finalize();
  } else {
    console.warn('No bills loaded from bills.json.');
  }
});

// API Endpoints

// Get all bills
app.get('/api/bills', (req, res) => {
  db.all('SELECT * FROM bills', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Submit a vote
app.post('/api/vote', (req, res) => {
  const { billId, state, vote } = req.body;
  if (!billId || !state || !vote) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  db.run(
    'INSERT INTO votes (bill_id, state, vote) VALUES (?, ?, ?)',
    [billId, state, vote],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      console.log(`Vote recorded: Bill ${billId}, State: ${state}, Vote: ${vote}`);
      res.json({ success: true });
    }
  );
});

// Get vote results
app.get('/api/results', (req, res) => {
  db.all(`
    SELECT b.name, v.state,
           SUM(CASE WHEN v.vote = 'approve' THEN 1 ELSE 0 END) as approvals,
           SUM(CASE WHEN v.vote = 'disapprove' THEN 1 ELSE 0 END) as disapprovals
    FROM votes v
    JOIN bills b ON v.bill_id = b.id
    GROUP BY b.id, v.state
  `, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});