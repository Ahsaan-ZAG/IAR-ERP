import 'dotenv/config';
import argon2 from 'argon2';
import db from '../config/database.js';
import { todayInTimezone } from '../config/timezone.js';

async function seed() {
  // Settings
  const settings = [
    ['roll_prefix', 'IRA'],
    ['roll_year', String(new Date().getFullYear())],
    ['roll_counter', '0'],
    ['academy_name', 'Imam Ahmed Raza Academy'],
    ['academy_supervision', 'Under the Supervision of Barkati Foundation Trust'],
    ['currency', 'PKR'],
  ];
  const insSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of settings) insSetting.run(k, v);

  // Batches (exact 5 fixed schedules)
  const batches = [
    ['Batch 1', '12:46:00', '13:30:00'],
    ['Batch 2', '13:31:00', '14:15:00'],
    ['Batch 3', '14:16:00', '15:00:00'],
    ['Batch 4', '15:01:00', '15:45:00'],
    ['Batch 5', '15:46:00', '16:30:00'],
  ];
  const insBatch = db.prepare(
    'INSERT OR IGNORE INTO batches (name, start_time, end_time) VALUES (?, ?, ?)'
  );
  for (const b of batches) insBatch.run(...b);

  // Users
  const users = [
    { username: 'admin',    password: 'Admin@123',    role: 'admin',   display: 'Administrator' },
    { username: 'teacher1', password: 'Teacher@123',  role: 'teacher', display: 'Teacher 1' },
    { username: 'teacher2', password: 'Teacher@123',  role: 'teacher', display: 'Teacher 2' },
  ];

  const insUser = db.prepare(
    'INSERT OR IGNORE INTO users (username, password_hash, role, display_name) VALUES (?, ?, ?, ?)'
  );
  const insTeacher = db.prepare(
    'INSERT OR IGNORE INTO teachers (user_id, joining_date, status) VALUES (?, ?, ?)'
  );

  for (const u of users) {
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(u.username);
    if (exists) continue;
    const hash = await argon2.hash(u.password);
    const info = insUser.run(u.username, hash, u.role, u.display);
    if (u.role === 'teacher') {
      insTeacher.run(info.lastInsertRowid, todayInTimezone(), 'active');
    }
  }

  // Default fee structure: 2000 PKR per batch per month
  const batchRows = db.prepare('SELECT id FROM batches').all();
  const insFee = db.prepare(
    'INSERT INTO fee_structures (batch_id, amount, effective_from) VALUES (?, ?, ?)'
  );
  for (const b of batchRows) {
    const exists = db.prepare('SELECT id FROM fee_structures WHERE batch_id = ?').get(b.id);
    if (!exists) insFee.run(b.id, 2000, todayInTimezone());
  }

  console.log('Seed complete.');
  console.log('Logins: admin/Admin@123, teacher1/Teacher@123, teacher2/Teacher@123');
  console.log('IMPORTANT: Change these passwords in production.');
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });