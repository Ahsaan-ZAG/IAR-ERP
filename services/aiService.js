import db from '../config/database.js';
import { todayInTimezone } from '../config/timezone.js';
import { tryLlmRephrase } from './aiLlmBridge.js';

/**
 * SAFE-BY-DESIGN:
 * User text is NEVER interpolated into SQL. It's only matched against
 * fixed regex patterns, and each matched intent runs a pre-written,
 * parameter-free SQL query. No arbitrary SQL execution possible.
 */

const INTENTS = [
  {
    id: 'help',
    matches: [/^\s*help\s*$/i, /what can you do/i, /\bcommands\b/i, /capabilities/i],
    handler: () => ({
      kind: 'help',
      title: 'What I can help with',
      bullets: [
        'Students — "How many active students?" / "How many inactive students?"',
        "Fees — \"This month's fee collection\" / \"Today's collection\"",
        'Outstanding — "Which students have outstanding balances?"',
        'Attendance — "Which batches have low attendance?"',
        'Absences — "Which students have repeated absences?"',
        'Academic — "Which students need academic improvement?"',
        'Summary — "Summarize this month"',
        'Forecast — "Predict next month\'s collection" (estimate only)',
        'Attendance today — "Attendance today"',
        'Batch completion — "Batch completion this month"',
      ],
    }),
  },
  {
    id: 'greeting',
    matches: [/^\s*(salam|assalam|hello|hi|hey|aoa)\b/i],
    handler: () => ({
      kind: 'greeting',
      title: 'Assalam-o-Alaikum',
      text: 'Imam Ahmed Raza Academy — Analytics Assistant. Ask me about students, fees, attendance, or performance. Type "help" for examples.',
    }),
  },
  {
    id: 'inactive_students',
    matches: [/\binactive\b/i],
    handler: () => {
      const c = db.prepare("SELECT COUNT(*) AS c FROM students WHERE status = 'inactive'").get().c;
      return {
        kind: 'data',
        title: 'Inactive Students',
        text: `There are currently ${c} inactive student(s).`,
        data: { count: c },
      };
    },
  },
  {
    id: 'active_students',
    matches: [/\bactive\b/i, /\btotal students?\b/i, /\bkitne students?\b/i],
    handler: () => {
      const c = db.prepare("SELECT COUNT(*) AS c FROM students WHERE status = 'active'").get().c;
      return {
        kind: 'data',
        title: 'Active Students',
        text: `There are currently ${c} active student(s).`,
        data: { count: c },
      };
    },
  },
  {
    id: 'fee_today',
    matches: [/\btoday\b.*\bcollection\b/i, /\btoday'?s?\b.*\bfee\b/i, /\baaj\b.*\bcollection\b/i],
    handler: () => {
      const today = todayInTimezone();
      const row = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS c
        FROM payments WHERE payment_date = ? AND is_reversed = 0
      `).get(today);
      return {
        kind: 'data',
        title: "Today's Fee Collection",
        text: `PKR ${row.total.toLocaleString()} collected today across ${row.c} payment(s).`,
        data: { total: row.total, count: row.c, date: today },
      };
    },
  },
  {
    id: 'fee_this_month',
    matches: [/\bfee\b.*\bcollection\b/i, /\bcollection\b.*\bfee\b/i, /\bmonth'?s? fee\b/i, /\bthis month\b.*\bfee\b/i],
    handler: () => {
      const today = todayInTimezone();
      const monthStart = today.slice(0, 7) + '-01';
      const row = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS c
        FROM payments WHERE payment_date >= ? AND is_reversed = 0
      `).get(monthStart);
      return {
        kind: 'data',
        title: "This Month's Fee Collection",
        text: `PKR ${row.total.toLocaleString()} collected across ${row.c} payment(s) since ${monthStart}.`,
        data: { total: row.total, count: row.c, from: monthStart },
      };
    },
  },
  {
    id: 'outstanding',
    matches: [/\boutstanding\b/i, /\bdefaulter/i, /\bpending fee/i, /\bbaqi\b/i, /\bbalance[s]?\b/i],
    handler: () => {
      const rows = db.prepare(`
        SELECT * FROM (
          SELECT s.roll_no, s.name, s.father_name, b.name AS batch_name,
            COALESCE((SELECT SUM(amount) FROM student_fee_ledger WHERE student_id = s.id), 0) AS balance
          FROM students s LEFT JOIN batches b ON b.id = s.current_batch_id
          WHERE s.status = 'active'
        )
        WHERE balance > 0
        ORDER BY balance DESC
        LIMIT 20
      `).all();
      const total = rows.reduce((acc, r) => acc + r.balance, 0);
      return {
        kind: 'data',
        title: 'Students with Outstanding Balances',
        text: rows.length === 0
          ? 'No outstanding balances. All active students are settled.'
          : `${rows.length} student(s) with outstanding fees, totalling PKR ${total.toLocaleString()}.`,
        data: { rows, total },
      };
    },
  },
  {
    id: 'low_attendance_batches',
    matches: [/\blow\b.*\battendance\b/i, /\battendance\b.*\blow\b/i, /\bkam\b.*\bhazri\b/i],
    handler: () => {
      const rows = db.prepare(`
        SELECT b.name AS batch,
          COUNT(a.id) AS total,
          COALESCE(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END), 0) AS present
        FROM batches b
        LEFT JOIN attendance a ON a.batch_id = b.id AND a.date >= date('now', '-30 days')
        WHERE b.is_active = 1
        GROUP BY b.id
      `).all();
      const report = rows.map(r => ({
        batch: r.batch,
        total: r.total,
        present: r.present,
        percentage: r.total ? Math.round((r.present / r.total) * 100) : 0,
      })).sort((a, b) => a.percentage - b.percentage);

      const worst = report[0];
      return {
        kind: 'data',
        title: 'Batch-wise Attendance (Last 30 Days)',
        text: report.length === 0
          ? 'No attendance data yet.'
          : worst.percentage < 60
            ? `Lowest attendance: ${worst.batch} at ${worst.percentage}%.`
            : 'All batches are above 60% attendance.',
        data: { rows: report },
      };
    },
  },
  {
    id: 'repeated_absences',
    matches: [/\brepeated\b.*\babsence/i, /\bfrequent(ly)?\b.*\babsent/i, /\bbar bar\b.*\babsent/i, /\babsent\b.*\brepeat/i],
    handler: () => {
      const rows = db.prepare(`
        SELECT s.roll_no, s.name, b.name AS batch_name,
          SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent_count
        FROM students s
        LEFT JOIN attendance a ON a.student_id = s.id AND a.date >= date('now', '-30 days')
        LEFT JOIN batches b ON b.id = s.current_batch_id
        WHERE s.status = 'active'
        GROUP BY s.id
        HAVING SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) >= 5
        ORDER BY absent_count DESC
        LIMIT 20
      `).all();
      return {
        kind: 'data',
        title: 'Students with Repeated Absences (≥5 in last 30 days)',
        text: rows.length === 0
          ? 'No students with 5+ absences in the last 30 days.'
          : `${rows.length} student(s) flagged.`,
        data: { rows },
      };
    },
  },
  {
    id: 'weak_students',
    matches: [/\bacademic\b.*\bimprovement/i, /\bweak\b.*\bstudent/i, /\blow\b.*\bgrade/i, /\bkamzor\b/i, /\bneeds? improvement\b/i],
    handler: () => {
      const rows = db.prepare(`
        SELECT s.roll_no, s.name, b.name AS batch_name,
          AVG(ar.obtained_marks * 1.0 / a.max_marks) * 100 AS avg_pct,
          COUNT(ar.id) AS exams
        FROM students s
        JOIN assessment_results ar ON ar.student_id = s.id
        JOIN assessments a ON a.id = ar.assessment_id
        LEFT JOIN batches b ON b.id = s.current_batch_id
        WHERE s.status = 'active'
        GROUP BY s.id
        HAVING COUNT(ar.id) >= 1
          AND AVG(ar.obtained_marks * 1.0 / a.max_marks) * 100 < 50
        ORDER BY avg_pct ASC
        LIMIT 20
      `).all();
      return {
        kind: 'data',
        title: 'Students Needing Academic Improvement (<50% average)',
        text: rows.length === 0
          ? 'No students below 50% average.'
          : `${rows.length} student(s) below 50% average.`,
        data: { rows },
      };
    },
  },
  {
    id: 'attendance_today',
    matches: [/\battendance\b.*\btoday\b/i, /\bpresent\b.*\btoday\b/i, /\babsent\b.*\btoday\b/i, /\baaj\b.*\bhazri\b/i],
    handler: () => {
      const today = todayInTimezone();
      const row = db.prepare(`
        SELECT
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) AS late
        FROM attendance WHERE date = ?
      `).get(today) || { present: 0, absent: 0, late: 0 };
      return {
        kind: 'data',
        title: "Today's Attendance",
        text: `Present: ${row.present || 0}, Absent: ${row.absent || 0}, Late: ${row.late || 0}.`,
        data: {
          present: row.present || 0,
          absent: row.absent || 0,
          late: row.late || 0,
          date: today,
        },
      };
    },
  },
  {
    id: 'batch_completion',
    matches: [/\bbatch\b.*\bcompletion\b/i, /\bsessions?\b.*\bcomplet/i, /\bcomplete\b.*\bsessions?\b/i],
    handler: () => {
      const rows = db.prepare(`
        SELECT b.name AS batch,
          COUNT(bs.id) AS total,
          COALESCE(SUM(CASE WHEN bs.status = 'completed' THEN 1 ELSE 0 END), 0) AS completed
        FROM batches b
        LEFT JOIN batch_sessions bs ON bs.batch_id = b.id AND bs.session_date >= date('now', 'start of month')
        WHERE b.is_active = 1
        GROUP BY b.id
      `).all();
      const report = rows.map(r => ({
        batch: r.batch,
        total: r.total,
        completed: r.completed,
        percentage: r.total ? Math.round((r.completed / r.total) * 100) : 0,
      }));
      return {
        kind: 'data',
        title: 'Batch Session Completion (This Month)',
        data: { rows: report },
      };
    },
  },
  {
    id: 'summary',
    matches: [/\bsummar/i, /\bmonthly report\b/i, /\boverview\b/i, /\badmin.*report\b/i, /\bmanagement summary\b/i],
    handler: () => {
      const today = todayInTimezone();
      const monthStart = today.slice(0, 7) + '-01';

      const students = db.prepare("SELECT COUNT(*) AS c FROM students WHERE status = 'active'").get().c;
      const feeThisMonth = db.prepare(`SELECT COALESCE(SUM(amount),0) AS t FROM payments WHERE payment_date >= ? AND is_reversed = 0`).get(monthStart).t;
      const expenses = db.prepare(`SELECT COALESCE(SUM(amount),0) AS t FROM expenses WHERE expense_date >= ?`).get(monthStart).t;
      const outstanding = db.prepare(`SELECT COALESCE(SUM(amount),0) AS t FROM student_fee_ledger`).get().t;
      const presentToday = db.prepare(`SELECT COUNT(*) AS c FROM attendance WHERE date = ? AND status = 'present'`).get(today).c;
      const absences30 = db.prepare(`SELECT COUNT(*) AS c FROM attendance WHERE status = 'absent' AND date >= date('now','-30 days')`).get().c;

      return {
        kind: 'data',
        title: "This Month's Summary",
        text: 'All figures are derived directly from the database — no AI computation.',
        data: {
          active_students: students,
          fee_collection: feeThisMonth,
          expenses,
          net: feeThisMonth - expenses,
          outstanding,
          present_today: presentToday,
          absences_last_30_days: absences30,
          month_start: monthStart,
        },
      };
    },
  },
  {
    id: 'forecast',
    matches: [/\bforecast\b/i, /\bpredict/i, /\bnext month\b/i, /\bandaza\b/i, /\bestimate\b.*\bcollection\b/i],
    handler: () => {
      const rows = db.prepare(`
        SELECT strftime('%Y-%m', payment_date) AS ym, SUM(amount) AS total
        FROM payments
        WHERE is_reversed = 0 AND payment_date >= date('now', '-6 months')
        GROUP BY ym ORDER BY ym
      `).all();

      if (rows.length < 2) {
        return {
          kind: 'prediction',
          title: 'Collection Forecast',
          text: 'Not enough historical data (need at least 2 months).',
          data: null,
        };
      }

      const n = rows.length;
      const xs = rows.map((_, i) => i + 1);
      const ys = rows.map(r => r.total);
      const sumX = xs.reduce((a, b) => a + b, 0);
      const sumY = ys.reduce((a, b) => a + b, 0);
      const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
      const sumX2 = xs.reduce((a, x) => a + x * x, 0);
      const denom = n * sumX2 - sumX * sumX;
      const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
      const intercept = (sumY - slope * sumX) / n;
      const nextMonth = Math.max(0, Math.round(slope * (n + 1) + intercept));

      return {
        kind: 'prediction',
        title: 'Collection Forecast (Next Month)',
        text: `⚠ Statistical estimate based on last ${n} month(s) — NOT a guarantee. Actual collection may differ significantly.`,
        data: {
          estimate_pkr: nextMonth,
          historical: rows.map(r => ({ month: r.ym, total: r.total })),
        },
      };
    },
  },
];

function matchIntent(question) {
  const q = String(question || '').trim();
  if (!q) return null;
  for (const intent of INTENTS) {
    for (const pattern of intent.matches) {
      if (pattern.test(q)) return intent;
    }
  }
  return null;
}

export async function answerQuestion(question) {
  const intent = matchIntent(question);

  if (!intent) {
    return {
      kind: 'fallback',
      intent: null,
      title: 'I did not understand that',
      text: 'Try one of these examples:',
      suggestions: [
        'How many active students?',
        "What was this month's fee collection?",
        'Which students have outstanding balances?',
        'Which batches have low attendance?',
        'Summarize this month',
      ],
    };
  }

  let result;
  try {
    result = intent.handler();
  } catch (err) {
    console.error('AI intent failed:', intent.id, err.message);
    return {
      kind: 'error',
      intent: intent.id,
      title: 'Query failed',
      text: 'Could not retrieve data. Please try again.',
    };
  }

  const llmText = await tryLlmRephrase(question, result);
  if (llmText) result.llm_rephrased = llmText;

  return { ...result, intent: intent.id };
}