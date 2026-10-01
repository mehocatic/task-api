import OpenAI from "openai";
import { readFileSync } from "fs";
import { isValidTriageResult } from "./schema.js";

const client = new OpenAI({
	baseURL: process.env.LLM_BASE_URL,
	apiKey: process.env.LLM_API_KEY,
	timeout: 30_000,
	maxRetries: 0,
});

const PROMPT_VERSION = "triage-v1";
const systemPrompt = readFileSync(
	new URL(`../prompts/${PROMPT_VERSION}.md`, import.meta.url),
	"utf-8",
);

export const PROMPT_VERSION_USED = PROMPT_VERSION;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isRetryable(err) {
	if (err?.status === 429) return true;
	if (err?.status >= 500) return true;
	if (err?.name === "APIConnectionTimeoutError") return true;
	return false;
}

async function callModel(messages) {
	const maxAttempts = 3;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const start = Date.now();
		try {
			const res = await client.chat.completions.create({
				model: process.env.LLM_MODEL,
				temperature: 0.2,
				messages,
			});
			logCall({
				durationMs: Date.now() - start,
				promptTokens: res.usage?.prompt_tokens ?? null,
				completionTokens: res.usage?.completion_tokens ?? null,
				attempt,
			});
			return res.choices[0].message.content;
		} catch (err) {
			logCall({ durationMs: Date.now() - start, error: err?.message, attempt });

			if (!isRetryable(err) || attempt === maxAttempts) throw err;

			const backoff = 2 ** (attempt - 1) * 1000 + Math.random() * 300;
			await sleep(backoff);
		}
	}
}

function logCall({
	durationMs,
	promptTokens,
	completionTokens,
	attempt,
	error,
}) {
	console.log(
		JSON.stringify({
			type: "llm_call",
			promptVersion: PROMPT_VERSION_USED,
			model: process.env.LLM_MODEL,
			durationMs,
			promptTokens,
			completionTokens,
			attempt,
			error: error ?? null,
		}),
	);
}

function tryParse(rawText) {
	const cleaned = rawText.replace(/```json|```/g, "").trim();
	const start = cleaned.indexOf("{");
	const end = cleaned.lastIndexOf("}");
	if (start === -1 || end === -1)
		return { ok: false, error: "No JSON object found in response" };
	try {
		return { ok: true, value: JSON.parse(cleaned.slice(start, end + 1)) };
	} catch (err) {
		return { ok: false, error: err.message };
	}
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
