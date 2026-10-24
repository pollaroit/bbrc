/** Mirrors `ShelfPermission` in Prisma — keep in sync with `shelf.prisma`. */
export const SHELF_PERMISSIONS = [
	"add_book",
	"remove_book",
	"edit_notes",
	"edit_title",
	"edit_description",
	"edit_cover",
	"edit_type",
	"edit_status",
	"edit_ordering_on_simple",
	"edit_ordering_on_ranked",
	"view_non_public",
	"delete_shelf",
	"add_collaborator",
	"remove_collaborator",
	"edit_permissions",
] as const;

export type ShelfPermission = (typeof SHELF_PERMISSIONS)[number];

export const SHELF_PERMISSION_LABELS: Record<ShelfPermission, string> = {
	add_book: "Add books",
	remove_book: "Remove books",
	edit_notes: "Edit book notes",
	edit_title: "Change the title",
	edit_description: "Change the description",
	edit_cover: "Change the cover image",
	edit_type: "Switch between ranked and simple",
	edit_status: "Change visibility",
	edit_ordering_on_simple: "Reorder a simple list",
	edit_ordering_on_ranked: "Reorder a ranked list",
	view_non_public: "See the shelf while it is a draft or archived",
	delete_shelf: "Delete the shelf",
	add_collaborator: "Invite collaborators",
	remove_collaborator: "Remove collaborators",
	edit_permissions: "Change collaborators' permissions",
};

export const SHELF_PERMISSION_GROUPS = [
	{
		id: "books",
		label: "Books",
		permissions: ["add_book", "remove_book", "edit_notes"],
	},
	{
		id: "shelf",
		label: "Shelf",
		permissions: [
			"edit_title",
			"edit_description",
			"edit_cover",
			"edit_type",
			"edit_status",
			"edit_ordering_on_simple",
			"edit_ordering_on_ranked",
			"view_non_public",
			"delete_shelf",
		],
	},
	{
		id: "collab",
		label: "Collaborators",
		permissions: [
			"add_collaborator",
			"remove_collaborator",
			"edit_permissions",
		],
	},
] as const satisfies readonly {
	id: string;
	label: string;
	permissions: readonly ShelfPermission[];
}[];

export type ShelfPermissionPreset = {
	id: "viewer" | "contributor" | "editor" | "curator" | "manager";
	label: string;
	description: string;
	permissions: readonly ShelfPermission[];
};

const CONTRIBUTOR: readonly ShelfPermission[] = [
	"view_non_public",
	"add_book",
	"edit_notes",
];
const EDITOR: readonly ShelfPermission[] = [
	...CONTRIBUTOR,
	"remove_book",
	"edit_description",
	"edit_ordering_on_simple",
];
const CURATOR: readonly ShelfPermission[] = [
	...EDITOR,
	"edit_title",
	"edit_cover",
	"edit_type",
	"edit_ordering_on_ranked",
];

export const SHELF_PERMISSION_PRESETS: readonly ShelfPermissionPreset[] = [
	{
		id: "viewer",
		label: "Viewer",
		description: "Can see the shelf while it is still a draft.",
		permissions: ["view_non_public"],
	},
	{
		id: "contributor",
		label: "Contributor",
		description: "Can add books and write notes.",
		permissions: CONTRIBUTOR,
	},
	{
		id: "editor",
		label: "Editor",
		description: "Can also remove books, edit the description and reorder.",
		permissions: EDITOR,
	},
	{
		id: "curator",
		label: "Curator",
		description: "Can also change the title, cover and ranking.",
		permissions: CURATOR,
	},
	{
		id: "manager",
		label: "Manager",
		description: "Everything except deleting the shelf, and can manage people.",
		permissions: SHELF_PERMISSIONS.filter(
			(permission) => permission !== "delete_shelf",
		),
	},
];

export const SHELF_INVITATION_TTL_DAYS = 14;
export const MAX_SHELF_COLLABORATORS = 25;

const ORDER = new Map(
	SHELF_PERMISSIONS.map((permission, index) => [permission, index]),
);

export function isShelfPermission(value: string): value is ShelfPermission {
	return ORDER.has(value as ShelfPermission);
}

/** Unique permissions in the canonical order, ignoring unknown values. */
export function normalizeShelfPermissions(
	permissions: readonly string[],
): ShelfPermission[] {
	return [...new Set(permissions.filter(isShelfPermission))].sort(
		(a, b) => (ORDER.get(a) ?? 0) - (ORDER.get(b) ?? 0),
	);
}

/** The owner always has every permission; everyone else has what they were granted. */
export function resolveShelfPermissions(
	isOwner: boolean,
	granted: readonly string[],
): Set<ShelfPermission> {
	return new Set(
		isOwner ? SHELF_PERMISSIONS : normalizeShelfPermissions(granted),
	);
}

/** Nobody can hand out more than they hold themselves. */
export function missingGrants(
	actor: ReadonlySet<ShelfPermission>,
	requested: readonly ShelfPermission[],
): ShelfPermission[] {
	return requested.filter((permission) => !actor.has(permission));
}

/**
 * Whether `actor` may change or remove a collaborator who holds `target`.
 * Nobody can touch someone who can do more than they can.
 */
export function outranks(
	actor: ReadonlySet<ShelfPermission>,
	target: readonly ShelfPermission[],
): boolean {
	return target.every((permission) => actor.has(permission));
}

export function canManageCollaborators(
	permissions: ReadonlySet<ShelfPermission>,
): boolean {
	return (
		permissions.has("add_collaborator") ||
		permissions.has("remove_collaborator") ||
		permissions.has("edit_permissions")
	);
}

export function presetIdFor(
	permissions: readonly string[],
): ShelfPermissionPreset["id"] | "custom" {
	const normalized = normalizeShelfPermissions(permissions).join(",");
	const match = SHELF_PERMISSION_PRESETS.find(
		(preset) =>
			normalizeShelfPermissions(preset.permissions).join(",") === normalized,
	);
	return match?.id ?? "custom";
}

export function reorderPermissionFor(
	type: "ordered" | "unordered",
): ShelfPermission {
	return type === "ordered"
		? "edit_ordering_on_ranked"
		: "edit_ordering_on_simple";
}
