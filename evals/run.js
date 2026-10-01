import { readFileSync } from "fs";

const cases = JSON.parse(
	readFileSync(new URL("./cases.json", import.meta.url)),
);
let passed = 0;
const failures = [];

for (const c of cases) {
	const res = await fetch("http://localhost:3000/tasks/triage", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ text: c.text }),
	});
	const body = await res.json();
	const ok = res.status === 200 && body.category === c.expected_category;
	if (ok) passed++;
	else
		failures.push({
			text: c.text,
			expected: c.expected_category,
			got: body.category ?? body.error,
		});
}

console.log(`${passed}/${cases.length} passed`);
if (failures.length)
	console.log("Failures:", JSON.stringify(failures, null, 2));
