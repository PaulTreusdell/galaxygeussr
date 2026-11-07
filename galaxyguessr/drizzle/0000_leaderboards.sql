CREATE TABLE players (
  id TEXT PRIMARY KEY NOT NULL,
  handle TEXT,
  normalized_name TEXT UNIQUE,
  public_name TEXT
);
--> statement-breakpoint
CREATE TABLE missions (
  id TEXT PRIMARY KEY NOT NULL,
  player_id TEXT NOT NULL REFERENCES players(id),
  category TEXT NOT NULL,
  destinations TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX missions_player_time ON missions(player_id, created_at);
--> statement-breakpoint
CREATE TABLE scores (
  mission_id TEXT PRIMARY KEY NOT NULL REFERENCES missions(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  category TEXT NOT NULL,
  score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 25000),
  seconds INTEGER NOT NULL CHECK(seconds >= 0),
  correct INTEGER NOT NULL CHECK(correct BETWEEN 0 AND 5),
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX scores_category_player ON scores(category, player_id, score DESC, seconds ASC);
