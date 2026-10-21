import type { GoalScopeKind } from "@bbrc/shared";

export type GoalScopeView = {
	kind: GoalScopeKind;
	authorSlugs: string[];
	countryCodes: string[];
};
