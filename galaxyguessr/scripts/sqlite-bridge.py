"""SQLite adapter for local Vite development and API integration tests only."""
import json
import sqlite3
import sys
from pathlib import Path

payload = json.load(sys.stdin)
Path(payload['path']).parent.mkdir(parents=True, exist_ok=True)
db = sqlite3.connect(payload['path'])
db.row_factory = sqlite3.Row
db.execute('PRAGMA foreign_keys = ON')
try:
    if payload.get('migration'):
        db.execute('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)')
        if not db.execute('SELECT 1 FROM local_migrations WHERE name = ?', (payload.get('migrationName', '0000_leaderboards'),)).fetchone():
            db.executescript(payload['migration'])
            db.execute('INSERT INTO local_migrations VALUES (?)', (payload.get('migrationName', '0000_leaderboards'),))
    rows = []
    for statement in payload.get('statements', []):
        cursor = db.execute(statement['sql'], statement['values'])
        rows.append([dict(row) for row in cursor.fetchall()])
    db.commit()
    print(json.dumps({'rows': rows}))
except Exception as error:
    db.rollback()
    print(json.dumps({'error': str(error)}))
finally:
    db.close()
