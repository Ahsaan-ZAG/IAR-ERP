import { validationResult } from 'express-validator';
import { createStudent, getStudentById } from '../services/studentService.js';
import { audit } from '../services/auditService.js';
import { notifyAdmins } from '../services/notificationService.js';

export function showAdmissionForm(req, res) {
  res.render('admissions/new', {
    title: 'New Admission',
    csrfToken: res.locals.csrfToken,
    user: res.locals.user,
    formErrors: {},
    formData: { name: '', father_name: '' },
  });
}

export function createAdmission(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formErrors = {};
    errors.array().forEach(e => { formErrors[e.path] = e.msg; });
    return res.status(400).render('admissions/new', {
      title: 'New Admission',
      csrfToken: res.locals.csrfToken,
      user: res.locals.user,
      formErrors,
      formData: req.body,
    });
  }

  try {
    const { studentId, rollNo, admissionDate } = createStudent({
      name: req.body.name,
      fatherName: req.body.father_name,
    });

    audit(req, {
      action: 'admission_created',
      module: 'student',
      recordId: studentId,
      newValues: {
        roll_no: rollNo,
        name: req.body.name,
        father_name: req.body.father_name,
        admission_date: admissionDate,
      },
    });

    notifyAdmins({
      type: 'admission',
      message: `New admission: ${req.body.name} (${rollNo})`,
      referenceType: 'student',
      referenceId: studentId,
    });

    req.session.flash = {
      type: 'success',
      message: `Student admitted successfully. Roll No: ${rollNo}`,
    };
    res.redirect(`/students/${studentId}`);
  } catch (err) {
    console.error('Admission failed:', err);
    res.status(500).render('admissions/new', {
      title: 'New Admission',
      csrfToken: res.locals.csrfToken,
      user: res.locals.user,
      formErrors: { _general: 'Failed to create admission. Please try again.' },
      formData: req.body,
    });
  }
}