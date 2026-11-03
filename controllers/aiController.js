import { answerQuestion } from '../services/aiService.js';
import { audit } from '../services/auditService.js';

export function page(req, res) {
  res.render('ai/index', {
    title: 'AI Academy Assistant',
    user: res.locals.user,
    csrfToken: res.locals.csrfToken,
    flash: res.locals.flash,
  });
}

export async function ask(req, res) {
  const q = String(req.query.q || '').trim();

  if (!q) {
    return res.status(400).json({ error: 'Empty question' });
  }
  if (q.length > 500) {
    return res.status(400).json({ error: 'Question too long (max 500 chars)' });
  }

  audit(req, { action: 'ai_query', module: 'ai', newValues: { q: q.slice(0, 200) } });

  try {
    const answer = await answerQuestion(q);
    res.setHeader('Cache-Control', 'no-store');
    res.json(answer);
  } catch (err) {
    console.error('AI ask failed:', err);
    res.status(500).json({ error: 'Assistant unavailable' });
  }
}