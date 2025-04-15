-- database.sql
CREATE TABLE bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  interest_rate REAL NOT NULL
);


  CREATE TABLE votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL,
  state TEXT NOT NULL,
  email TEXT NOT NULL, -- Emails are stored in lowercase for case-insensitive uniqueness
  vote TEXT NOT NULL, -- 'approve' or 'disapprove'
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES bills(id),
  UNIQUE(bill_id, email)
);
