// db.js
import Database from "better-sqlite3";

// Open tasks.db if it exists, or create it if it doesn't
const db = new Database("tasks.db");

// Create the table only if it doesn't already exist
// (IF NOT EXISTS is crucial - without it, every restart
// would try to create the table again and crash)
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0
  )
`);
// Index on "done" - speeds up queries that filter by completion status,
// like "WHERE done = 1", instead of scanning every row in the table
db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks (done)`);

// Seed 3 example tasks, but only if the table is empty
const row = db.prepare("SELECT COUNT(*) AS count FROM tasks").get();
if (row.count === 0) {
	const insert = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");

	// Wrap the three inserts in a transaction - either all three tasks
	// get seeded, or none do. Without this, a crash mid-seed could leave
	// the table with 1 or 2 tasks instead of a clean 0 or 3.
	const seedTasks = db.transaction(() => {
		insert.run("Learn Express", 0);
		insert.run("Buy milk", 0);
		insert.run("Walk the dog", 0);
	});

	seedTasks();
}
export default db;
