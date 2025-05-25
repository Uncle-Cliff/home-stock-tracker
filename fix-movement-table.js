const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('stock.db');

db.run("ALTER TABLE movement ADD COLUMN type TEXT", err => {
  if (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('Column "type" already exists.');
    } else {
      console.error('Error adding column:', err.message);
    }
  } else {
    console.log('Column "type" added successfully.');
  }
  db.close();
});