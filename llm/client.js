import OpenAI from "openai";
import { readFileSync } from "fs";
import { isValidTriageResult } from "./schema.js";

const client = new OpenAI({
	baseURL: process.env.LLM_BASE_URL,
	apiKey: process.env.LLM_API_KEY,
});

const PROMPT_VERSION = "triage-v1";
const systemPrompt = readFileSync(
	new URL(`../prompts/${PROMPT_VERSION}.md`, import.meta.url),
	"utf-8",
);

export const PROMPT_VERSION_USED = PROMPT_VERSION;

async function callModel(messages) {
	const res = await client.chat.completions.create({
		model: process.env.LLM_MODEL,
		temperature: 0.2,
		messages,
	});
	return res.choices[0].message.content;
}

function tryParse(rawText) {
	const cleaned = rawText.replace(/```json|```/g, "").trim();
	const start = cleaned.indexOf("{");
	const end = cleaned.lastIndexOf("}");
	if (start === -1 || end === -1)
		return { ok: false, error: "No JSON object found in response" };

	try {
		const parsed = JSON.parse(cleaned.slice(start, end + 1));
		return { ok: true, value: parsed };
	} catch (err) {
		return { ok: false, error: err.message };
	}
}

export async function triage(text) {
	const userMessage = { role: "user", content: text };
	const firstRaw = await callModel([
		{ role: "system", content: systemPrompt },
		userMessage,
	]);

	const firstAttempt = evaluate(firstRaw);
	if (firstAttempt.status === "ok") return firstAttempt;

	const repairRaw = await callModel([
		{ role: "system", content: systemPrompt },
		userMessage,
		{ role: "assistant", content: firstRaw },
		{
			role: "user",
			content: `Your previous answer was rejected for this reason: ${firstAttempt.error}. Return only corrected JSON matching the schema.`,
		},
	]);

	const repairAttempt = evaluate(repairRaw);
	if (repairAttempt.status === "ok")
		return { ...repairAttempt, repaired: true };

	return { status: "failed", rawOutput: repairRaw, error: repairAttempt.error };
}

function evaluate(rawText) {
	const parsed = tryParse(rawText);
	if (!parsed.ok)
		return { status: "failed", error: `Invalid JSON: ${parsed.error}` };
	if (!isValidTriageResult(parsed.value)) {
		return {
			status: "failed",
			error:
				"JSON does not match the required schema (check field names, types and allowed values)",
		};
	}
	return { status: "ok", result: parsed.value };
}
