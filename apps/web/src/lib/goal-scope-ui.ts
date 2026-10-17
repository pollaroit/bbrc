import type { GoalScopeKind } from "@bbrc/shared";
import { getBookCountryName } from "@bbrc/shared";

export type GoalScopeView = {
	kind: GoalScopeKind;
	authorSlugs: string[];
	countryCodes: string[];
};

export function formatGoalScopeSummary(scope: GoalScopeView): string | null {
	if (scope.kind === "none") {
		return null;
	}

	if (scope.kind === "authors") {
		if (scope.authorSlugs.length === 0) {
			return "By author";
		}
		const labels = scope.authorSlugs.map((slug) => slug.replaceAll("_", " "));
		return `Authors: ${labels.join(", ")}`;
	}

	if (scope.countryCodes.length === 0) {
		return "By country";
	}

	const labels = scope.countryCodes.map((code) => {
		const name = getBookCountryName(code);
		return name ? `${name} (${code})` : code;
	});
	return `Countries: ${labels.join(", ")}`;
}
