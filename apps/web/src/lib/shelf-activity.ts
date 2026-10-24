import type { ListShelfActivityOutput } from "@bbrc/api/modules/shelf/shelf-collab.schema";

type ActivityItem = ListShelfActivityOutput["items"][number];

function text(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function names(item: ActivityItem): { actor: string; target: string } {
	return {
		actor: item.actor?.name ?? "Someone",
		target: item.target?.name ?? "a member",
	};
}

/** One plain sentence for the activity log, written from the actor's point of view. */
export function describeShelfActivity(item: ActivityItem): string {
	const { actor, target } = names(item);
	const title = text(item.meta?.title);

	switch (item.kind) {
		case "book_added":
			return `${actor} added “${title}”`;
		case "book_removed":
			return `${actor} removed “${title}”`;
		case "books_reordered": {
			const moved = Number(item.meta?.moved ?? 0);
			return `${actor} reordered the books${moved > 0 ? ` (${moved} moved)` : ""}`;
		}
		case "notes_edited":
			return `${actor} edited the note on “${title}”`;
		case "shelf_updated": {
			const fields = Array.isArray(item.meta?.fields)
				? item.meta.fields.filter((field) => typeof field === "string")
				: [];
			return `${actor} changed the ${fields.join(", ") || "details"}`;
		}
		case "collaborator_joined":
			return `${actor} joined the shelf`;
		case "collaborator_left":
			return `${actor} left the shelf`;
		case "collaborator_removed":
			return `${actor} removed ${target}`;
		case "permissions_changed":
			return `${actor} changed what ${target} can do`;
		case "ownership_transferred":
			return `${actor} handed the shelf over to ${target}`;
	}
}
