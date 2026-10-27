"use client";

import type { GoalScopeView } from "@/lib/goal-scope-ui";
import { useCountryName } from "@/lib/i18n/use-content-text";
import { cn } from "@/lib/utils";

type GoalScopeChipsProps = {
	scope: GoalScopeView;
	/** Chips shown before collapsing the rest into "+N". */
	max?: number;
	className?: string;
};

function scopeLabels(
	scope: GoalScopeView,
	countryName: (code: string) => string,
): string[] {
	if (scope.kind === "authors") {
		return scope.authorSlugs.map((slug) => slug.replaceAll("_", " "));
	}
	if (scope.kind === "countries") {
		return scope.countryCodes.map((code) => countryName(code));
	}
	return [];
}

/** What counts toward a goal, as small chips instead of a sentence. */
export function GoalScopeChips({
	scope,
	max = 3,
	className,
}: GoalScopeChipsProps) {
	const countryName = useCountryName();
	const labels = scopeLabels(scope, countryName);
	const shown = labels.slice(0, max);
	const hidden = labels.length - shown.length;
	const kindLabel =
		scope.kind === "authors"
			? "Authors"
			: scope.kind === "countries"
				? "Countries"
				: null;

	if (scope.kind === "none") {
		return (
			<p className={cn("text-muted-foreground text-xs", className)}>
				All finished reads count
			</p>
		);
	}

	return (
		<ul
			className={cn("flex flex-wrap items-center gap-1.5", className)}
			aria-label={kindLabel ?? undefined}
		>
			{shown.map((label) => (
				<li
					key={label}
					className="border border-border px-2 py-0.5 text-xs capitalize"
				>
					{label}
				</li>
			))}
			{hidden > 0 ? (
				<li className="px-1 text-muted-foreground text-xs">+{hidden} more</li>
			) : null}
			{labels.length === 0 ? (
				<li className="text-muted-foreground text-xs">
					{scope.kind === "authors" ? "By author" : "By country"}
				</li>
			) : null}
		</ul>
	);
}
