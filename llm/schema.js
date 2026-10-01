export const CATEGORIES = ["bug", "feature", "chore", "docs", "other"];
export const PRIORITIES = ["low", "normal", "high"];

export function isValidTriageResult(obj) {
	if (typeof obj !== "object" || obj === null) return false;
	if (
		typeof obj.title !== "string" ||
		obj.title.length === 0 ||
		obj.title.length > 80
	)
		return false;
	if (!CATEGORIES.includes(obj.category)) return false;
	if (!PRIORITIES.includes(obj.priority)) return false;
	if (
		typeof obj.confidence !== "number" ||
		obj.confidence < 0 ||
		obj.confidence > 1
	)
		return false;
	if (typeof obj.reason !== "string" || obj.reason.length === 0) return false;
	return true;
}
