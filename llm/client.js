import OpenAI from "openai";
import { readFileSync } from "fs";

const client = new OpenAI({
	baseURL: process.env.LLM_BASE_URL,
	apiKey: process.env.LLM_API_KEY,
});

const PROMPT_VERSION = "triage-v1";
const systemPrompt = readFileSync(
	new URL(`../prompts/${PROMPT_VERSION}.md`, import.meta.url),
	"utf-8",
);

export async function callTriageModel(text) {
	const res = await client.chat.completions.create({
		model: process.env.LLM_MODEL,
		temperature: 0.2,
		messages: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: text },
		],
	});
	return res.choices[0].message.content;
}

export const PROMPT_VERSION_USED = PROMPT_VERSION;
