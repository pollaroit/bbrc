/** Head phrase before Open Library's comma-separated refinements. */
function subjectHead(raw: string): string {
	return raw.split(",")[0]?.trim().toLowerCase() ?? "";
}

const SUBJECT_HEAD_ALIASES: Record<string, string> = {
	ficción: "fiction",
	ficcion: "fiction",
	novela: "fiction",
	"romans, nouvelles": "fiction",
	romans: "fiction",
	"classic literature": "classic literature",
};

/**
 * Groups Open Library subject strings that describe the same broad topic
 * (Fiction / Ficción / Fiction, general → fiction).
 */
export function canonicalSubjectKey(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) return "";

	const headAlias = SUBJECT_HEAD_ALIASES[trimmed.toLowerCase()];
	if (headAlias) return headAlias;

	const head = subjectHead(trimmed);
	if (!head) return trimmed.toLowerCase();

	const headMapped = SUBJECT_HEAD_ALIASES[head] ?? head;

	if (headMapped.startsWith("fiction")) return "fiction";
	if (headMapped.includes("fantasy")) return "fantasy";

	return headMapped;
}

function titleCaseWords(value: string): string {
	return value
		.split(/\s+/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

export function canonicalSubjectLabel(key: string): string {
	if (key === "fiction") return "Fiction";
	if (key === "fantasy") return "Fantasy";
	return titleCaseWords(key);
}
