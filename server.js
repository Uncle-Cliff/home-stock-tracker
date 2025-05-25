const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database("stock.db", err => {
  if (err) console.error("DB Connection Error:", err);
  else console.log("Connected to SQLite database");
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    quantity INTEGER,
    date TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS movement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    quantity INTEGER,
    date TEXT,
    type TEXT
  )`);
});

// Add stock (POST /api/stock)
app.post("/api/stock", (req, res) => {
  const { name, quantity, date } = req.body;
  console.log("Add Stock Request:", req.body);
  db.get("SELECT * FROM stock WHERE name = ?", [name], (err, row) => {
    if (err) {
      console.error("DB error on SELECT (add):", err);
      return res.sendStatus(500);
    }
    if (row) {
      db.run(
        "UPDATE stock SET quantity = quantity + ?, date = ? WHERE name = ?",
        [quantity, date, name],
        err => {
          if (err) {
            console.error("DB error on UPDATE (add):", err);
            return res.sendStatus(500);
          }
          db.run(
            "INSERT INTO movement (name, quantity, date, type) VALUES (?, ?, ?, ?)",
            [name, quantity, date, "add"],
            err => {
              if (err) {
                console.error("DB error on INSERT movement (add):", err);
                return res.sendStatus(500);
              }
              res.sendStatus(200);
            }
          );
        }
      );
    } else {
      db.run(
        "INSERT INTO stock (name, quantity, date) VALUES (?, ?, ?)",
        [name, quantity, date],
        err => {
          if (err) {
            console.error("DB error on INSERT stock (add):", err);
            return res.sendStatus(500);
          }
          db.run(
            "INSERT INTO movement (name, quantity, date, type) VALUES (?, ?, ?, ?)",
            [name, quantity, date, "add"],
            err => {
              if (err) {
                console.error("DB error on INSERT movement (add new):", err);
                return res.sendStatus(500);
              }
              res.sendStatus(200);
            }
          );
        }
      );
    }
  });
});

// Move stock (POST /api/movement)
app.post("/api/movement", (req, res) => {
  const { name, quantity, date } = req.body;
  console.log("Move Stock Request:", req.body);
  db.get("SELECT quantity FROM stock WHERE name = ?", [name], (err, row) => {
    if (err) {
      console.error("DB error on SELECT (move):", err);
      return res.sendStatus(500);
    }
    if (!row || row.quantity < quantity) {
      console.warn("Insufficient stock or product not found:", name);
      return res.status(400).send("Insufficient stock");
    }

    db.run(
      "UPDATE stock SET quantity = quantity - ?, date = ? WHERE name = ?",
      [quantity, date, name],
      err => {
        if (err) {
          console.error("DB error on UPDATE (move):", err);
          return res.sendStatus(500);
        }
        db.run(
          "INSERT INTO movement (name, quantity, date, type) VALUES (?, ?, ?, ?)",
          [name, quantity, date, "move"],
          err => {
            if (err) {
              console.error("DB error on INSERT movement (move):", err);
              return res.sendStatus(500);
            }
            res.sendStatus(200);
          }
        );
      }
    );
  });
});

// Get stock list
app.get("/api/stock", (req, res) => {
  db.all("SELECT * FROM stock", [], (err, rows) => {
    if (err) {
      console.error("DB error on GET stock:", err);
      return res.sendStatus(500);
    }
    res.json(rows);
  });
});

// Get movement history
app.get("/api/movement", (req, res) => {
  db.all("SELECT * FROM movement", [], (err, rows) => {
    if (err) {
      console.error("DB error on GET movement:", err);
      return res.sendStatus(500);
    }
    res.json(rows);
  });
});

// Delete stock entry
app.delete("/api/stock/:id", (req, res) => {
  db.run("DELETE FROM stock WHERE id = ?", [req.params.id], err => {
    if (err) {
      console.error("DB error on DELETE stock:", err);
      return res.sendStatus(500);
    }
    res.sendStatus(200);
  });
});

// Delete movement entry
app.delete("/api/movement/:id", (req, res) => {
  db.run("DELETE FROM movement WHERE id = ?", [req.params.id], err => {
    if (err) {
      console.error("DB error on DELETE movement:", err);
      return res.sendStatus(500);
    }
    res.sendStatus(200);
  });
});
app.post("/api/stock/import", (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items)) return res.status(400).send("Invalid data");

  let completed = 0;
  let hasError = false;

  items.forEach(item => {
    const { name, quantity, date } = item;
    if (!name || !quantity || !date) return; // skip invalid rows

    db.get("SELECT * FROM stock WHERE name = ?", [name], (err, row) => {
      if (err) {
        hasError = true;
        return;
      }
      if (row) {
        db.run(
          "UPDATE stock SET quantity = quantity + ?, date = ? WHERE name = ?",
          [quantity, date, name],
          err => {
            if (err) hasError = true;
            completed++;
            if (completed === items.length) {
              if (hasError) return res.sendStatus(500);
              res.sendStatus(200);
            }
          }
        );
      } else {
        db.run(
          "INSERT INTO stock (name, quantity, date) VALUES (?, ?, ?)",
          [name, quantity, date],
          err => {
            if (err) hasError = true;
            completed++;
            if (completed === items.length) {
              if (hasError) return res.sendStatus(500);
              res.sendStatus(200);
            }
          }
        );
      }
    });
  });

  // If items is empty, respond immediately
  if (items.length === 0) res.sendStatus(200);
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));