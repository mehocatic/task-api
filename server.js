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

app.get("/tasks", (req, res) => {
	res.json(tasks);
});

app.get("/tasks/:id", (req, res) => {
	const id = Number(req.params.id);
	const task = tasks.find((t) => t.id === id);

	if (!task) {
		return res.status(404).json({ error: `Task ${req.params.id} not found` });
	}

	res.json(task);
});

app.post("/tasks", (req, res) => {
	const { title } = req.body;

	if (!title || typeof title !== "string" || title.trim() === "") {
		return res.status(400).json({
			error: 'Field "title" is required and must be a non-empty string',
		});
	}

	const nextId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;

	const task = { id: nextId, title: title.trim(), done: false };
	tasks.push(task);

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
