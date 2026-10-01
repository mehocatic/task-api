import express from "express";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
import pool, { initDb } from "./db.js";
import { isValidTriageResult } from "./llm/schema.js";
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

//----------------------------
// LLM triage endpoint (FlyRank A17). No model call yet – Stage 1 only
// validates input and returns a stub so the contract exists on its own.
app.post("/tasks/triage", async (req, res) => {
	const { text } = req.body;

	if (typeof text !== "string" || text.trim().length === 0) {
		return res
			.status(400)
			.json({
				error: 'Field "text" is required and must be a non-empty string',
			});
	}
	if (text.length > 1000) {
		return res
			.status(400)
			.json({ error: 'Field "text" must be at most 1000 characters' });
	}

	if (process.env.LLM_STUB === "1") {
		const stub = {
			title: text.trim().slice(0, 80),
			category: "other",
			priority: "normal",
			confidence: 0.0,
			reason: "Stub mode – no model was called.",
		};
		return res.json(stub);
	}

	res
		.status(501)
		.json({
			error:
				"LLM call not implemented yet (set LLM_STUB=1 to test the contract)",
		});
});

async function startServerWithRetry(retries = 10, delay = 2000) {
	for (let i = 0; i < retries; i++) {
		try {
			await initDb();
			console.log("Database initialized successfully!");
			app.listen(PORT, () => {
				console.log(`Server running on http://localhost:${PORT}`);
			});
			return;
		} catch (err) {
			console.log(
				`Waiting for database to be ready (attempt ${i + 1}/${retries})...`,
			);
			await new Promise((res) => setTimeout(res, delay));
		}
	}
	console.error("CRITICAL: Database connection could not be established.");
	process.exit(1);
}

startServerWithRetry();
