const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'connector.sqlite');
console.log('Checking SQLite db at:', dbPath);

if (fs.existsSync(dbPath)) {
  const db = new sqlite3.Database(dbPath);
  db.all("SELECT * FROM attendance_cache WHERE deviceUserId IN ('EMP-09', '9', 'EMP-9')", (err, rows) => {
    if (err) {
      console.log('Error querying attendance_cache:', err.message);
    } else {
      console.log(`Found ${rows.length} rows for EMP-09 in SQLite attendance_cache:`, rows);
      if (rows.length > 0) {
        db.run("DELETE FROM attendance_cache WHERE deviceUserId IN ('EMP-09', '9', 'EMP-9')", (delErr) => {
          console.log('Cleaned SQLite attendance_cache for EMP-09:', delErr ? delErr.message : 'OK');
        });
      }
    }
    db.close();
  });
} else {
  console.log('SQLite db file does not exist (memory or separate path).');
}
