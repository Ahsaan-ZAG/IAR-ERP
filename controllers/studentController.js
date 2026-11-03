import { validationResult } from 'express-validator';
import db from '../config/database.js';
import {
    listStudents, getStudentById, getStudentBatchHistory,
    getStudentAuditTimeline, updateStudent,
} from '../services/studentService.js';
import { getStudentPerformance } from '../services/academicService.js';
import { audit } from '../services/auditService.js';

export function list(req, res) {
    const page = parseInt(req.query.page, 10) || 1;
    const search = (req.query.search || '').trim();
    const batchId = req.query.batch ? parseInt(req.query.batch, 10) : null;
    const status = req.query.status || '';
    const result = listStudents({ search, batchId, status, page });
    const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();
    res.render('students/index', {
        title: 'Students', user: res.locals.user, csrfToken: res.locals.csrfToken,
        students: result.rows, batches, filters: { search, batchId, status },
        pagination: { page: result.page, totalPages: result.totalPages, total: result.total },
        flash: res.locals.flash,
    });
}

export function show(req, res) {
    const student = getStudentById(req.params.id);
    if (!student) return res.status(404).render('errors/404', { title: 'Not Found' });

    const activeTab = ['details', 'batch-history', 'activity', 'performance'].includes(req.query.tab)
        ? req.query.tab : 'details';

    const data = {
        title: student.name, user: res.locals.user, csrfToken: res.locals.csrfToken,
        student, batchHistory: [], timeline: [], performance: null,
        activeTab, flash: res.locals.flash,
    };

    if (activeTab === 'batch-history') data.batchHistory = getStudentBatchHistory(student.id);
    if (activeTab === 'activity') data.timeline = getStudentAuditTimeline(student.id, 30);
    if (activeTab === 'performance') data.performance = getStudentPerformance(student.id);

    res.render('students/show', data);
}

export function showEdit(req, res) {
    const student = getStudentById(req.params.id);
    if (!student) return res.status(404).render('errors/404', { title: 'Not Found' });
    const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();
    res.render('students/edit', {
        title: `Edit ${student.name}`, user: res.locals.user, csrfToken: res.locals.csrfToken,
        student, batches, formErrors: {},
        formData: { name: student.name, father_name: student.father_name, batch_id: student.current_batch_id || '', status: student.status },
        flash: res.locals.flash,
    });
}

export function update(req, res) {
    const studentId = parseInt(req.params.id, 10);
    const student = getStudentById(studentId);
    if (!student) return res.status(404).render('errors/404', { title: 'Not Found' });
    const v = validationResult(req);
    if (!v.isEmpty()) {
        const batches = db.prepare('SELECT id, name FROM batches WHERE is_active = 1 ORDER BY id').all();
        const formErrors = {}; v.array().forEach(e => { formErrors[e.path] = e.msg; });
        return res.status(400).render('students/edit', {
            title: `Edit ${student.name}`, user: res.locals.user, csrfToken: res.locals.csrfToken,
            student, batches, formErrors, formData: req.body, flash: null,
        });
    }
    try {
        const newBatchId = req.body.batch_id && String(req.body.batch_id).trim() !== '' ? parseInt(req.body.batch_id, 10) : null;
        const result = updateStudent({
            studentId, name: req.body.name, fatherName: req.body.father_name,
            batchId: newBatchId, status: req.body.status, userId: req.session.user.id,
        });
        audit(req, { action: 'student_updated', module: 'student', recordId: studentId, newValues: req.body });
        if (result.batchChanged) {
            audit(req, { action: 'student_batch_changed', module: 'student', recordId: studentId, oldValues: { batch_id: result.oldBatchId }, newValues: { batch_id: result.newBatchId } });
        }
        req.session.flash = { type: 'success', message: 'Student updated.' };
        res.redirect(`/students/${studentId}`);
    } catch (err) {
        req.session.flash = { type: 'error', message: err.message };
        res.redirect(`/students/${studentId}/edit`);
    }
}