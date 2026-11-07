import { getAllSettings, updateSettings, EDITABLE_KEYS } from '../services/settingsService.js';
import { audit } from '../services/auditService.js';
import { TIMEZONE } from '../config/timezone.js';

export function index(req, res) {
  const settings = getAllSettings();
  res.render('settings/index', {
    title: 'Settings',
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    settings,
    editableKeys: EDITABLE_KEYS,
    timezone: TIMEZONE,
    flash: res.locals.flash,
  });
}

export function update(req, res) {
  if (req.session.user.role !== 'admin') {
    req.session.flash = { type: 'error', message: 'Admin only.' };
    return res.redirect('/settings');
  }

  const updates = {};
  for (const key of EDITABLE_KEYS) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  try {
    const changed = updateSettings(updates);
    audit(req, {
      action: 'settings_updated',
      module: 'settings',
      newValues: changed,
    });
    req.session.flash = { type: 'success', message: 'Settings saved.' };
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
  }
  res.redirect('/settings');
}