// db.js
import "dotenv/config";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

export async function initDb() {
	await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);

	await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks (done);
  `);

	const countRes = await pool.query("SELECT COUNT(*) AS count FROM tasks;");
	const count = parseInt(countRes.rows[0].count, 10);

	if (count === 0) {
		await pool.query(
			`
      INSERT INTO tasks (title, done) VALUES 
      ($1, $2),
      ($3, $4),
      ($5, $6);
    `,
			["Learn Express", false, "Buy milk", false, "Walk the dog", false],
		);
	}
}

export default pool;
