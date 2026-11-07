-- Imam Ahmed Raza Academy ERP — Schema
-- All money in PKR INTEGER. All timestamps UTC ISO8601 text.

PRAGMA foreign_keys = ON;

-- 1. users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','teacher')),
  display_name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  twofa_secret TEXT,
  twofa_enabled INTEGER NOT NULL DEFAULT 0 CHECK (twofa_enabled IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 2. teachers (profile linked 1:1 to users)
CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  joining_date TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 3. batches
CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  start_time TEXT NOT NULL, -- 'HH:MM:SS' 24h
  end_time TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 4. students
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roll_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  father_name TEXT NOT NULL,
  current_batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  admission_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_students_batch ON students(current_batch_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);

-- 5. student_batch_history
CREATE TABLE IF NOT EXISTS student_batch_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  from_batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
  to_batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
  changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_sbh_student ON student_batch_history(student_id);

-- 6. admission_enquiries
CREATE TABLE IF NOT EXISTS admission_enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  father_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 7. fee_structures
CREATE TABLE IF NOT EXISTS fee_structures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  effective_from TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (batch_id IS NOT NULL OR student_id IS NOT NULL)
);

-- 8. student_fee_ledger  (SIGNED AMOUNT convention)
-- charge => +amount ; discount => -amount ; payment => -amount ;
-- reversal => +amount ; adjustment => signed value
CREATE TABLE IF NOT EXISTS student_fee_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('charge','discount','adjustment','payment','reversal')),
  amount INTEGER NOT NULL,
  description TEXT,
  due_date TEXT,
  reference_id INTEGER,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_ledger_student ON student_fee_ledger(student_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON student_fee_ledger(entry_type);

-- 9. payments
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  ledger_id INTEGER REFERENCES student_fee_ledger(id) ON DELETE SET NULL,
  receipt_no TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  payment_date TEXT NOT NULL,
  method TEXT NOT NULL,
  received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_reversed INTEGER NOT NULL DEFAULT 0 CHECK (is_reversed IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- 10. payment_reversals
CREATE TABLE IF NOT EXISTS payment_reversals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  reversed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reversed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ledger_id INTEGER REFERENCES student_fee_ledger(id) ON DELETE SET NULL
);

-- 11. attendance
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  date TEXT NOT NULL, -- YYYY-MM-DD
  status TEXT NOT NULL CHECK (status IN ('present','absent','late','leave','holiday')),
  marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (student_id, date)
);
CREATE INDEX IF NOT EXISTS idx_att_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_att_batch_date ON attendance(batch_id, date);

-- 12. teacher_attendance
CREATE TABLE IF NOT EXISTS teacher_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  check_in TEXT,
  check_out TEXT,
  status TEXT NOT NULL CHECK (status IN ('present','absent','late','leave','holiday')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_tatt_date ON teacher_attendance(date);

-- 13. batch_sessions
CREATE TABLE IF NOT EXISTS batch_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  session_date TEXT NOT NULL,
  scheduled_start TEXT NOT NULL,
  scheduled_end TEXT NOT NULL,
  actual_start TEXT,
  completed_at TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','missed','holiday')),
  topic_covered TEXT,
  remarks TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (batch_id, session_date)
);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON batch_sessions(session_date);

-- 14. batch_session_teachers
CREATE TABLE IF NOT EXISTS batch_session_teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES batch_sessions(id) ON DELETE CASCADE,
  teacher_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  confirmed_at TEXT,
  UNIQUE (session_id, teacher_user_id)
);

-- 15. holidays
CREATE TABLE IF NOT EXISTS holidays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  reason TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_full_day INTEGER NOT NULL DEFAULT 1 CHECK (is_full_day IN (0,1)),
  partial_start TEXT,
  partial_end TEXT,
  is_cancelled INTEGER NOT NULL DEFAULT 0 CHECK (is_cancelled IN (0,1)),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_holidays_dates ON holidays(start_date, end_date);

-- 16. holiday_batches  (batch_id NULL = all batches)
CREATE TABLE IF NOT EXISTS holiday_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  holiday_id INTEGER NOT NULL REFERENCES holidays(id) ON DELETE CASCADE,
  batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
  UNIQUE (holiday_id, batch_id)
);

-- 17. assessments
CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  exam_date TEXT NOT NULL,
  max_marks INTEGER NOT NULL CHECK (max_marks > 0),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 18. assessment_results
CREATE TABLE IF NOT EXISTS assessment_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  obtained_marks INTEGER NOT NULL CHECK (obtained_marks >= 0),
  grade TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (assessment_id, student_id)
);

-- 19. assignments
CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  assigned_date TEXT NOT NULL,
  due_date TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 20. student_assignment_status
CREATE TABLE IF NOT EXISTS student_assignment_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','late','graded')),
  submitted_at TEXT,
  remarks TEXT,
  UNIQUE (assignment_id, student_id)
);

-- 21. courses
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 22. syllabus_topics
CREATE TABLE IF NOT EXISTS syllabus_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0,1)),
  completed_at TEXT
);

-- 23. class_topic_records
CREATE TABLE IF NOT EXISTS class_topic_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES batch_sessions(id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES syllabus_topics(id) ON DELETE SET NULL,
  remarks TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 24. expenses
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  expense_date TEXT NOT NULL,
  description TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- 25. notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- NULL = broadcast
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0,1)),
  reference_type TEXT,
  reference_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);

-- 26. audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  record_id INTEGER,
  old_values TEXT,
  new_values TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);

-- 27. settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 28. user_sessions (custom store creates same table; defined here for clarity)
CREATE TABLE IF NOT EXISTS user_sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expire INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expire ON user_sessions(expire);

-- 29. backup_logs
CREATE TABLE IF NOT EXISTS backup_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success','failed')),
  integrity_check TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 30. financial_closings
CREATE TABLE IF NOT EXISTS financial_closings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  closing_date TEXT NOT NULL UNIQUE,
  total_collection INTEGER NOT NULL DEFAULT 0,
  total_expense INTEGER NOT NULL DEFAULT 0,
  closed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 31. leave_requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);