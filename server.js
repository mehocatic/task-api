import express from "express";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
import db from "./db.js";
const openapiSpec = JSON.parse(readFileSync("./openapi.json", "utf-8"));

const app = express();
app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));
const PORT = 3000;

let tasks = [
	{ id: 1, title: "Learn Express", done: false },
	{ id: 2, title: "Build CRUD API", done: false },
	{ id: 3, title: "Push to GitHub", done: true },
];

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
	const task = tasks.find((t) => t.id === id);

	if (!task) {
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
		task.title = title.trim();
	}

	if (done !== undefined) {
		if (typeof done !== "boolean") {
			return res.status(400).json({ error: 'Field "done" must be a boolean' });
		}
		task.done = done;
	}

	res.json(task);
});

//delete

app.delete("/tasks/:id", (req, res) => {
	const id = Number(req.params.id);
	const exists = tasks.some((t) => t.id === id);

	if (!exists) {
		return res.status(404).json({ error: `Task ${req.params.id} not found` });
	}

	tasks = tasks.filter((t) => t.id !== id);

	res.status(204).end();
});

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
