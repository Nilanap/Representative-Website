const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize SQLite database
const db = new sqlite3.Database('voter.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

// Create tables
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS bills (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            amount INTEGER NOT NULL,
            interest_rate REAL NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_id INTEGER NOT NULL,
            state TEXT NOT NULL,
            email TEXT NOT NULL,
            vote TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bill_id) REFERENCES bills(id),
            UNIQUE(bill_id, email)
        )
    `);
});

// Load bills from bills.json
function loadBillsFromJson() {
    let bills = [];
    try {
        const data = fs.readFileSync('bills.json', 'utf8');
        if (data.trim() === '') {
            console.warn('bills.json is empty. Starting with an empty bills list.');
            return bills;
        }
        bills = JSON.parse(data);
        // Transform legacy camelCase to snake_case
        bills = bills.map(bill => ({
            id: bill.id,
            name: bill.name,
            amount: bill.amount,
            interest_rate: bill.interestRate ?? bill.interest_rate
        }));
    } catch (err) {
        console.error('Error reading or parsing bills.json:', err.message);
        return bills;
    }

    // Sync bills with database (insert or update)
    const stmt = db.prepare(`
        INSERT INTO bills (id, name, amount, interest_rate)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            amount = excluded.amount,
            interest_rate = excluded.interest_rate
    `);
    bills.forEach(bill => {
        stmt.run(bill.id, bill.name, bill.amount, bill.interest_rate, (err) => {
            if (err) {
                console.error(`Error syncing bill ${bill.id}:`, err.message);
            }
        });
    });
    stmt.finalize();
    console.log(`Synced ${bills.length} bills from bills.json.`);
    return bills;
}

// Load bills on startup
loadBillsFromJson();

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

// Record a vote
app.post('/api/vote', (req, res) => {
    const { billId, state, vote, email } = req.body;
    if (!billId || !state || !vote || !email) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
    }

    const normalizedEmail = email.toLowerCase();

    db.run(
        'INSERT INTO votes (bill_id, state, email, vote) VALUES (?, ?, ?, ?)',
        [billId, state, normalizedEmail, vote],
        function (err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                    res.status(409).json({ error: 'You have already voted on this bill with this email.' });
                } else {
                    res.status(500).json({ error: err.message });
                }
                return;
            }
            console.log(`Vote recorded: Bill ${billId}, State: ${state}, Email: ${normalizedEmail}, Vote: ${vote}`);
            res.json({ success: true, billId, vote, email: normalizedEmail });
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

// Reload bills from bills.json (for dynamic updates)
app.post('/api/reload-bills', (req, res) => {
    try {
        loadBillsFromJson();
        res.json({ success: true, message: 'Bills reloaded from bills.json.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reload bills: ' + err.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});