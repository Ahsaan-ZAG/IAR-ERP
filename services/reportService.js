import PDFDocument from 'pdfkit';
import db from '../config/database.js';

const REPORTS = {
    students: {
        title: 'Student List',
        columns: [
            { label: 'Roll No', key: 'roll_no', width: 80 },
            { label: 'Name', key: 'name', width: 130 },
            { label: 'Father', key: 'father_name', width: 130 },
            { label: 'Batch', key: 'batch_name', width: 90 },
            { label: 'Status', key: 'status', width: 60 },
        ],
        query: () => db.prepare(`
      SELECT s.roll_no, s.name, s.father_name, b.name AS batch_name, s.status
      FROM students s LEFT JOIN batches b ON b.id = s.current_batch_id
      ORDER BY s.roll_no
    `).all(),
    },
    fee_collection: {
        title: 'Fee Collection',
        columns: [
            { label: 'Receipt', key: 'receipt_no', width: 80 },
            { label: 'Date', key: 'payment_date', width: 70 },
            { label: 'Student', key: 'student_name', width: 130 },
            { label: 'Roll', key: 'roll_no', width: 70 },
            { label: 'Amount', key: 'amount', width: 60, format: v => Number(v).toLocaleString() },
            { label: 'Method', key: 'method', width: 60 },
            { label: 'Status', key: 'status', width: 50 },
        ],
        query: ({ from, to }) => db.prepare(`
      SELECT p.receipt_no, p.payment_date, s.name AS student_name, s.roll_no, p.amount, p.method,
        CASE WHEN p.is_reversed = 1 THEN 'REV' ELSE 'OK' END AS status
      FROM payments p JOIN students s ON s.id = p.student_id
      WHERE p.payment_date BETWEEN ? AND ? ORDER BY p.payment_date DESC
    `).all(from || '1970-01-01', to || '2099-12-31'),
    },
    outstanding: {
        title: 'Outstanding Balances',
        columns: [
            { label: 'Roll No', key: 'roll_no', width: 80 },
            { label: 'Name', key: 'name', width: 150 },
            { label: 'Father', key: 'father_name', width: 130 },
            { label: 'Batch', key: 'batch_name', width: 90 },
            { label: 'Balance (PKR)', key: 'balance', width: 90, format: v => Number(v).toLocaleString() },
        ],
        query: () => db.prepare(`
      SELECT s.roll_no, s.name, s.father_name, b.name AS batch_name,
        COALESCE((SELECT SUM(amount) FROM student_fee_ledger WHERE student_id = s.id), 0) AS balance
      FROM students s LEFT JOIN batches b ON b.id = s.current_batch_id
      WHERE s.status = 'active'
        AND COALESCE((SELECT SUM(amount) FROM student_fee_ledger WHERE student_id = s.id), 0) > 0
      ORDER BY balance DESC
    `).all(),
    },
    attendance_today: {
        title: 'Attendance (Today)',
        columns: [
            { label: 'Batch', key: 'batch_name', width: 70 },
            { label: 'Roll', key: 'roll_no', width: 70 },
            { label: 'Name', key: 'name', width: 140 },
            { label: 'Status', key: 'status', width: 60 },
            { label: 'Marked By', key: 'marked_by_name', width: 100 },
        ],
        query: () => db.prepare(`
      SELECT b.name AS batch_name, s.roll_no, s.name, a.status, u.display_name AS marked_by_name
      FROM attendance a JOIN students s ON s.id = a.student_id
      JOIN batches b ON b.id = a.batch_id LEFT JOIN users u ON u.id = a.marked_by
      WHERE a.date = date('now') ORDER BY b.id, s.roll_no
    `).all(),
    },
    expenses: {
        title: 'Expense Report',
        columns: [
            { label: 'Date', key: 'expense_date', width: 70 },
            { label: 'Category', key: 'category', width: 80 },
            { label: 'Amount', key: 'amount', width: 70, format: v => Number(v).toLocaleString() },
            { label: 'Description', key: 'description', width: 180 },
            { label: 'By', key: 'created_by_name', width: 90 },
        ],
        query: ({ from, to }) => db.prepare(`
      SELECT e.expense_date, e.category, e.amount, e.description, u.display_name AS created_by_name
      FROM expenses e LEFT JOIN users u ON u.id = e.created_by
      WHERE e.expense_date BETWEEN ? AND ? ORDER BY e.expense_date DESC
    `).all(from || '1970-01-01', to || '2099-12-31'),
    },
    audit: {
        title: 'Activity History',
        columns: [
            { label: 'Date', key: 'created_at', width: 110, format: v => String(v).slice(0, 19) },
            { label: 'User', key: 'user_name', width: 100 },
            { label: 'Action', key: 'action', width: 100 },
            { label: 'Module', key: 'module', width: 70 },
            { label: 'Record', key: 'record_id', width: 50 },
        ],
        query: ({ from, to }) => db.prepare(`
      SELECT al.created_at, u.display_name AS user_name, al.action, al.module, al.record_id
      FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
      WHERE al.created_at BETWEEN ? AND ? ORDER BY al.created_at DESC LIMIT 2000
    `).all((from || '1970-01-01') + 'T00:00:00', (to || '2099-12-31') + 'T23:59:59'),
    },
};

export const REPORT_LIST = Object.entries(REPORTS).map(([key, r]) => ({ key, title: r.title }));

function csvEscape(v) {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return (s.includes(',') || s.includes('"') || s.includes('\n'))
        ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function generateReportPDF(key, res, params) {
    const def = REPORTS[key];
    if (!def) { res.status(404).send('Unknown report'); return; }
    const rows = def.query(params);

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    // ATTACHMENT = force download instead of inline
    res.setHeader('Content-Disposition', `attachment; filename="${key}-${new Date().toISOString().slice(0, 10)}.pdf"`);
    doc.pipe(res);

    doc.fontSize(16).fillColor('#20212A').text('Imam Ahmed Raza Academy', { align: 'center' });
    doc.fontSize(8).fillColor('#737784')
        .text('Under the Supervision of Barkati Foundation Trust', { align: 'center' });
    doc.moveDown(0.6);
    doc.fontSize(13).fillColor('#F47B20').text(def.title, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(8).fillColor('#999')
        .text(`Generated: ${new Date().toISOString()}  •  Rows: ${rows.length}`, { align: 'right' });
    doc.moveDown(0.5);

    if (rows.length === 0) {
        doc.fontSize(11).fillColor('#737784').text('No data available for this report.', { align: 'center' });
        doc.end();
        return;
    }

    const startX = 40;
    const rowHeight = 16;
    let y = doc.y;
    doc.fontSize(8).fillColor('#20212A');
    let x = startX;
    def.columns.forEach(c => { doc.text(c.label, x, y, { width: c.width }); x += c.width; });
    y += rowHeight;
    doc.moveTo(startX, y - 4)
        .lineTo(startX + def.columns.reduce((s, c) => s + c.width, 0), y - 4)
        .stroke('#E0E2E8');

    rows.forEach(row => {
        if (y > 770) { doc.addPage(); y = 40; }
        x = startX;
        def.columns.forEach(c => {
            const raw = row[c.key];
            const val = c.format ? c.format(raw) : (raw ?? '');
            doc.fillColor('#20212A')
                .text(String(val), x, y, { width: c.width, lineBreak: false, ellipsis: true });
            x += c.width;
        });
        y += rowHeight;
    });

    doc.end();
}

export function generateReportCSV(key, res, params) {
    const def = REPORTS[key];
    if (!def) { res.status(404).send('Unknown report'); return; }
    const rows = def.query(params);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${key}-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.write(def.columns.map(c => csvEscape(c.label)).join(',') + '\n');
    for (const row of rows) {
        res.write(def.columns.map(c => csvEscape(row[c.key])).join(',') + '\n');
    }
    res.end();
}