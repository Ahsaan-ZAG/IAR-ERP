import session from 'express-session';

class SqliteSessionStore extends session.Store {
  constructor(db) {
    super();
    this.db = db;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expire INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expire ON user_sessions(expire);
    `);
    this._timer = setInterval(() => this.cleanup(), 15 * 60 * 1000);
    if (this._timer.unref) this._timer.unref();
  }

  get(sid, cb) {
    try {
      const row = this.db
        .prepare('SELECT sess FROM user_sessions WHERE sid = ? AND expire > ?')
        .get(sid, Date.now());
      cb(null, row ? JSON.parse(row.sess) : null);
    } catch (err) { cb(err); }
  }

  set(sid, sess, cb) {
    try {
      const expire = sess?.cookie?.expires
        ? new Date(sess.cookie.expires).getTime()
        : Date.now() + 8 * 60 * 60 * 1000;
      this.db
        .prepare('INSERT OR REPLACE INTO user_sessions (sid, sess, expire) VALUES (?, ?, ?)')
        .run(sid, JSON.stringify(sess), expire);
      cb(null);
    } catch (err) { cb(err); }
  }

  destroy(sid, cb) {
    try {
      this.db.prepare('DELETE FROM user_sessions WHERE sid = ?').run(sid);
      cb(null);
    } catch (err) { cb(err); }
  }

  touch(sid, sess, cb) { this.set(sid, sess, cb); }

  cleanup() {
    try {
      this.db.prepare('DELETE FROM user_sessions WHERE expire < ?').run(Date.now());
    } catch (_) {}
  }
}

export default SqliteSessionStore;