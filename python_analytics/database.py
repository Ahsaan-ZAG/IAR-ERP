import os
import sqlite3
from pathlib import Path

_DEFAULT_DB = Path(__file__).resolve().parent.parent / "database" / "academy.sqlite"
DB_PATH = os.environ.get("DATABASE_PATH") or str(_DEFAULT_DB)


def get_ro_connection() -> sqlite3.Connection:
    """
    Read-only SQLite connection. Python analytics ko operational data
    modify karne ka koi rasta nahi milna chahiye.
    """
    try:
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True, timeout=5.0)
        conn.execute("PRAGMA query_only = ON")
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.OperationalError:
        # WAL + read-only edge case: fallback connection, writes still blocked
        conn = sqlite3.connect(DB_PATH, timeout=5.0)
        conn.execute("PRAGMA query_only = ON")
        conn.row_factory = sqlite3.Row
        return conn