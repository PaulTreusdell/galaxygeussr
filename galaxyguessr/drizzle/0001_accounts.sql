CREATE TABLE accounts (player_id TEXT PRIMARY KEY REFERENCES players(id), username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, salt TEXT NOT NULL);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES accounts(player_id), expires_at INTEGER NOT NULL);
CREATE TABLE auth_attempts (bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL);
