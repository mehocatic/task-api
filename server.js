import express from "express";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
import db from "./db.js";
const openapiSpec = JSON.parse(readFileSync("./openapi.json", "utf-8"));

const app = express();
app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));
const PORT = 3000;

app.get("/", (req, res) => {
	res.json({
		name: "Task API",
		version: "1.0",
		endpoints: ["/tasks"],
	});
});

app.get("/health", (req, res) => {
	res.json({ status: "ok" });
});

//-----------------------

app.get("/tasks", (req, res) => {
	// Fetch all rows from the database instead of the in-memory array
	const rows = db.prepare("SELECT * FROM tasks").all();

	// SQLite stores "done" as 0/1, so convert it back to a real boolean
	// before sending it to the client - the API response shape stays identical
	const result = rows.map((row) => ({ ...row, done: Boolean(row.done) }));

	res.json(result);
});

//-----------------------

app.get("/tasks/:id", (req, res) => {
	const id = Number(req.params.id);

	// Parameterized query: the "?" placeholder keeps the id separate from
	// the SQL text, so user input can never be glued into the query string
	const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);

	if (!row) {
		return res.status(404).json({ error: `Task ${req.params.id} not found` });
	}

	const task = { ...row, done: Boolean(row.done) };
	res.json(task);
});

//----------------------------

app.post("/tasks", (req, res) => {
	const { title } = req.body;

	if (!title || typeof title !== "string" || title.trim() === "") {
		return res.status(400).json({
			error: 'Field "title" is required and must be a non-empty string',
		});
	}

	// Insert the new row - SQLite assigns the id automatically (AUTOINCREMENT),
	// so we don't calculate it ourselves anymore
	const insert = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");
	const info = insert.run(title.trim(), 0);

	// info.lastInsertRowid holds the id SQLite just generated for this row
	const task = { id: info.lastInsertRowid, title: title.trim(), done: false };

	res.status(201).json(task);
});

//put

app.put("/tasks/:id", (req, res) => {
	const id = Number(req.params.id);

	// Check the task exists before doing anything else
	const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);

	if (!existing) {
		return res.status(404).json({ error: `Task ${req.params.id} not found` });
	}

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

	// Fall back to the existing value when a field wasn't sent in the body
	const newTitle = title !== undefined ? title.trim() : existing.title;
	const newDone = done !== undefined ? (done ? 1 : 0) : existing.done;

	db.prepare("UPDATE tasks SET title = ?, done = ? WHERE id = ?").run(
		newTitle,
		newDone,
		id,
	);

	const task = { id, title: newTitle, done: Boolean(newDone) };
	res.json(task);
});

//delete

app.delete("/tasks/:id", (req, res) => {
	const id = Number(req.params.id);

	const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(id);

	// info.changes tells us how many rows were actually deleted -
	// 0 means no task with that id existed
	if (result.changes === 0) {
		return res.status(404).json({ error: `Task ${req.params.id} not found` });
	}

	res.status(204).end();
});
app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
