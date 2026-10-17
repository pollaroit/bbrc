import type { GetGoalBySlugOutput } from "@bbrc/api/modules/goal/goal.schema";
import { truncateDescription } from "@/lib/seo";

function possessiveName(displayName: string): string {
	return displayName.endsWith("s") ? `${displayName}'` : `${displayName}'s`;
}

export function userGoalsListMetadata(displayName: string, username: string) {
	const title = `${displayName} · Reading goals`;
	const description = truncateDescription(
		`${possessiveName(displayName)} yearly reading targets on BBRC — track progress from finished reads, filter by year or scope, and share goals at bbrc.club/users/${username}/goals.`,
	);

	return { title, description };
}

export function userGoalDetailMetadata(
	displayName: string,
	username: string,
	goal: Pick<
		GetGoalBySlugOutput,
		| "slug"
		| "title"
		| "year"
		| "current"
		| "target"
		| "description"
		| "isComplete"
		| "scope"
	>,
) {
	const progressLabel = `${goal.current} of ${goal.target} books in ${goal.year}`;
	const scopeHint =
		goal.scope.kind === "none"
			? "All finished reads in the year count."
			: goal.scope.kind === "authors"
				? "Scoped to selected authors."
				: "Scoped to selected countries.";

	const baseDescription =
		goal.description?.trim() ||
		`${progressLabel}. ${scopeHint} ${displayName}'s reading goal on BBRC.`;

	const title = `${goal.title} · ${displayName}`;
	const description = truncateDescription(
		goal.isComplete
			? `Complete — ${progressLabel}. ${baseDescription}`
			: baseDescription,
	);

	return {
		title,
		description,
		path: `/users/${username}/goals/${goal.slug}` as const,
	};
}
