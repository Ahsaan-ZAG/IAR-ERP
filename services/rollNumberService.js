import db from '../config/database.js';

/**
 * Roll number generate karta hai: IRA-2026-0001 format.
 * IMPORTANT: Ye function MUST ek db.transaction() ke andar call ho.
 * better-sqlite3 transactions BEGIN IMMEDIATE lock use karte hain,
 * isliye concurrent calls serialize ho jati hain — duplicate roll no impossible.
 */
export function generateRollNumberInternal() {
  const year = new Date().getFullYear().toString();

  const prefix =
    db.prepare("SELECT value FROM settings WHERE key = 'roll_prefix'").get()?.value || 'IRA';
  const storedYear = db.prepare("SELECT value FROM settings WHERE key = 'roll_year'").get()?.value;
  let counter = parseInt(
    db.prepare("SELECT value FROM settings WHERE key = 'roll_counter'").get()?.value || '0',
    10
  );

  // Naya saal shuru hone par counter reset
  if (storedYear !== year) {
    counter = 0;
    db.prepare("UPDATE settings SET value = ? WHERE key = 'roll_year'").run(year);
  }

  counter += 1;
  db.prepare("UPDATE settings SET value = ? WHERE key = 'roll_counter'").run(String(counter));

  return `${prefix}-${year}-${String(counter).padStart(4, '0')}`;
}