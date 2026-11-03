import 'dotenv/config';
import db from '../config/database.js';

function columnExists(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
}
function addColumnIfMissing(table, column, def) {
  if (!columnExists(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
    console.log(`✓ Added ${table}.${column}`);
  } else console.log(`· ${table}.${column} exists`);
}

console.log('Running migrations…');
addColumnIfMissing('users', 'last_login_at', 'TEXT');
addColumnIfMissing('users', 'last_login_ip', 'TEXT');
addColumnIfMissing('teacher_attendance', 'marked_by', 'INTEGER');
addColumnIfMissing('holiday_batches', 'is_special_working', 'INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('student_fee_ledger', 'entry_date', 'TEXT');
addColumnIfMissing('payments', 'notes', 'TEXT');
addColumnIfMissing('assessments', 'type', "TEXT DEFAULT 'test'");
addColumnIfMissing('assessments', 'description', 'TEXT');
addColumnIfMissing('assessment_results', 'created_by', 'INTEGER');
addColumnIfMissing('courses', 'description', 'TEXT');
addColumnIfMissing('courses', 'is_active', 'INTEGER NOT NULL DEFAULT 1');
db.exec(`UPDATE student_fee_ledger SET entry_date = date(created_at) WHERE entry_date IS NULL`);
console.log('Migrations complete.');
process.exit(0);