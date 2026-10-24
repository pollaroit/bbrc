import type { ListShelfActivityOutput } from "@bbrc/api/modules/shelf/shelf-collab.schema";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

type ActivityItem = ListShelfActivityOutput["items"][number];

const linkClass =
	"font-medium text-foreground underline-offset-4 hover:underline";

function Member({
	member,
	fallback,
}: {
	member: { username: string; name: string } | null;
	fallback: string;
}) {
	if (!member) {
		return <span>{fallback}</span>;
	}
	return (
		<Link href={`/users/${member.username}` as Route} className={linkClass}>
			{member.name}
		</Link>
	);
}

function BookName({ item }: { item: ActivityItem }) {
	const title =
		typeof item.meta?.title === "string" ? item.meta.title : "a book";
	const slug = typeof item.meta?.slug === "string" ? item.meta.slug : null;
	if (!slug) {
		return <span>“{title}”</span>;
	}
	return (
		<Link href={`/books/${slug}` as Route} className={linkClass}>
			“{title}”
		</Link>
	);
}

/** One sentence of the activity log. Members link to their profile, books to the book page. */
export function ShelfActivityLine({ item }: { item: ActivityItem }) {
	const actor = <Member member={item.actor} fallback="Someone" />;
	const target = <Member member={item.target} fallback="a member" />;

	let body: ReactNode;
	switch (item.kind) {
		case "book_added":
			body = (
				<>
					{actor} added <BookName item={item} />
				</>
			);
			break;
		case "book_removed":
			body = (
				<>
					{actor} removed <BookName item={item} />
				</>
			);
			break;
		case "books_reordered": {
			const moved = Number(item.meta?.moved ?? 0);
			body = (
				<>
					{actor} reordered the books{moved > 0 ? ` (${moved} moved)` : ""}
				</>
			);
			break;
		}
		case "notes_edited":
			body = (
				<>
					{actor} edited the note on <BookName item={item} />
				</>
			);
			break;
		case "shelf_updated": {
			const fields = Array.isArray(item.meta?.fields)
				? item.meta.fields.filter((field) => typeof field === "string")
				: [];
			body = (
				<>
					{actor} changed the {fields.join(", ") || "details"}
				</>
			);
			break;
		}
		case "collaborator_joined":
			body = <>{actor} joined the shelf</>;
			break;
		case "collaborator_left":
			body = <>{actor} left the shelf</>;
			break;
		case "collaborator_removed":
			body = (
				<>
					{actor} removed {target}
				</>
			);
			break;
		case "permissions_changed":
			body = (
				<>
					{actor} changed what {target} can do
				</>
			);
			break;
		case "ownership_transferred":
			body = (
				<>
					{actor} handed the shelf over to {target}
				</>
			);
			break;
	}

	return <span className="text-sm leading-snug">{body}</span>;
}
