import express from "express";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
import pool, { initDb } from "./db.js";

const openapiSpec = JSON.parse(readFileSync("./openapi.json", "utf-8"));

const app = express();
app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
	res.json({
		name: "Task API",
		version: "1.0",
		endpoints: ["/tasks"],
	});
});

app.get("/health", async (req, res) => {
	try {
		await pool.query("SELECT 1");
		res.json({ status: "ok", db: "ok" });
	} catch (err) {
		res.status(500).json({ status: "error", db: "disconnected" });
	}
});

//-----------------------
app.get("/tasks", async (req, res) => {
	try {
		const result = await pool.query("SELECT * FROM tasks ORDER BY id ASC");
		res.json(result.rows);
	} catch (err) {
		res.status(500).json({ error: "Failed to fetch tasks" });
	}
});

//-----------------------
app.get("/tasks/:id", async (req, res) => {
	const id = Number(req.params.id);

	try {
		const result = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: `Task ${req.params.id} not found` });
		}

		res.json(result.rows[0]);
	} catch (err) {
		res.status(500).json({ error: "Failed to fetch task" });
	}
});

//----------------------------
app.post("/tasks", async (req, res) => {
	const { title } = req.body;

	if (!title || typeof title !== "string" || title.trim() === "") {
		return res.status(400).json({
			error: 'Field "title" is required and must be a non-empty string',
		});
	}

	try {
		const result = await pool.query(
			"INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING *",
			[title.trim(), false],
		);

		res.status(201).json(result.rows[0]);
	} catch (err) {
		res.status(500).json({ error: "Failed to create task" });
	}
});

//----------------------------
app.put("/tasks/:id", async (req, res) => {
	const id = Number(req.params.id);

	try {
		const existingResult = await pool.query(
			"SELECT * FROM tasks WHERE id = $1",
			[id],
		);

		if (existingResult.rows.length === 0) {
			return res.status(404).json({ error: `Task ${req.params.id} not found` });
		}

		const existing = existingResult.rows[0];
		const { title, done } = req.body;

		if (title === undefined && done === undefined) {
			return res
				.status(400)
				.json({ error: 'Provide at least "title" or "done"' });
		}

		if (title !== undefined) {
			if (typeof title !== "string" || title.trim() === "") {
				return res
					.status(400)
					.json({ error: 'Field "title" must be a non-empty string' });
			}
		}

		if (done !== undefined && typeof done !== "boolean") {
			return res.status(400).json({ error: 'Field "done" must be a boolean' });
		}

		const newTitle = title !== undefined ? title.trim() : existing.title;
		const newDone = done !== undefined ? done : existing.done;

		const updateResult = await pool.query(
			"UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING *",
			[newTitle, newDone, id],
		);

		res.json(updateResult.rows[0]);
	} catch (err) {
		res.status(500).json({ error: "Failed to update task" });
	}
});

//----------------------------
app.delete("/tasks/:id", async (req, res) => {
	const id = Number(req.params.id);

	try {
		const result = await pool.query(
			"DELETE FROM tasks WHERE id = $1 RETURNING id",
			[id],
		);

		if (result.rowCount === 0) {
			return res.status(404).json({ error: `Task ${req.params.id} not found` });
		}

		res.status(204).end();
	} catch (err) {
		res.status(500).json({ error: "Failed to delete task" });
	}
});

initDb()
	.then(() => {
		app.listen(PORT, () => {
			console.log(`Server running on http://localhost:${PORT}`);
		});
	})
	.catch((err) => {
		console.error("Database connection failed:", err);
	});

initDb()
	.then(() => {
		console.log("Database initialized successfully!");
		app.listen(PORT, () => {
			console.log(`Server running on http://localhost:${PORT}`);
		});
	})
	.catch((err) => {
		console.error("CRITICAL: Database connection or init failed:", err);
	});
