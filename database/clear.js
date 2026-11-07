import 'dotenv/config';
import db from '../config/database.js';

console.log('Clearing all data from database...');

// Saari tables ki list nikalain (SQLite ki internal tables chhor kar)
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  AND name NOT LIKE 'sqlite_%'
`).all();

// Foreign keys ko temporarily band karein taake delete mein masla na ho
db.pragma('foreign_keys = OFF');

// Ek hi transaction mein sab kuch delete karein
db.transaction(() => {
  for (const { name } of tables) {
    db.prepare(`DELETE FROM ${name}`).run();
  }
})();

// Foreign keys wapas on karein
db.pragma('foreign_keys = ON');

console.log('✅ All data cleared successfully!');
console.log('👉 Now run: npm run db:seed  (to restore admin/teachers/batches)');
process.exit(0);
