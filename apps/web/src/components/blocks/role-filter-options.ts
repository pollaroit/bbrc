import { ROLE_META, ROLES, type Role } from "@bbrc/shared";
import type { ListingCheckboxListOption } from "@/components/listing/listing-checkbox-list";

/**
 * The checkbox options of a "Role" filter: one per role, in rank order. Shared
 * by every list that can be filtered by role, so a new role shows up in all of
 * them without touching any.
 */
export function roleFilterOptions({
	selected,
	onChange,
	idPrefix,
}: {
	selected: readonly Role[] | null | undefined;
	/** The new selection, or `null` when nothing is selected (so the filter leaves the URL). */
	onChange: (roles: Role[] | null) => void;
	idPrefix: string;
}): ListingCheckboxListOption[] {
	return ROLES.map((role) => ({
		id: `${idPrefix}-${role}`,
		label: ROLE_META[role].label,
		checked: selected?.includes(role) ?? false,
		onCheckedChange: (checked) => {
			const current = selected ?? [];
			const next = checked
				? [...new Set([...current, role])]
				: current.filter((value) => value !== role);
			onChange(next.length > 0 ? next : null);
		},
	}));
}
