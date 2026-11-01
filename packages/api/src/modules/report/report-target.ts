import type { Database } from "@bbrc/db";
import {
	REPORT_TARGET_LABELS,
	type ReportTargetKind,
	richContentPreview,
	type Viewer,
} from "@bbrc/shared";
import { shelfVisibleWhere } from "../shelf/shelf-visibility";
import {
	memberListVisibleWhere,
	postVisibleWhere,
	reviewVisibleWhere,
} from "../visibility/visibility-resources";

/** What the queue and the report snapshot need to know about a reported thing. */
export type ReportTargetInfo = {
	/** Internal id: what a report stores. */
	id: string;
	ownerId: string | null;
	ownerUsername: string | null;
	ownerIsAdmin: boolean;
	title: string;
	/** A short excerpt of the content itself (none for a profile). */
	text: string | null;
	href: string;
};

const TEXT_LENGTH = 280;

const ownerSelect = {
	select: { id: true, username: true, isAdmin: true },
} as const;

type Owner = { id: string; username: string; isAdmin: boolean };

function owned(owner: Owner | null) {
	return {
		ownerId: owner?.id ?? null,
		ownerUsername: owner?.username ?? null,
		ownerIsAdmin: owner?.isAdmin ?? false,
	};
}

function blocked(viewer: Viewer | null, ownerId: string): boolean {
	return viewer?.kind === "member" && viewer.blockedIds.has(ownerId);
}

type Lookup =
	| { by: "id"; id: string }
	| { by: "ref"; ref: string; viewer: Viewer };

/**
 * Finds a reported thing. With a `ref` (what the browser knows: a slug, a
 * username, `username/shelf-slug`) the viewer must be allowed to see it, so a
 * report can never be used to probe for content that is closed to the member.
 * With an `id` (the admin queue) nothing is filtered. `null` means not found
 * or not visible: the two are deliberately the same.
 */
async function loadTarget(
	db: Database,
	kind: ReportTargetKind,
	lookup: Lookup,
): Promise<ReportTargetInfo | null> {
	const viewer = lookup.by === "ref" ? lookup.viewer : null;
	const unique = (idOrSlug: "id" | "slug") =>
		lookup.by === "id"
			? { id: lookup.id }
			: ({ [idOrSlug]: lookup.ref } as Record<string, string>);

	if (kind === "post") {
		const row = await db.post.findFirst({
			where: {
				...unique("slug"),
				...(viewer ? { AND: [postVisibleWhere(viewer)] } : {}),
			},
			select: {
				id: true,
				slug: true,
				content: true,
				author: ownerSelect,
			},
		});
		if (!row || (viewer && blocked(viewer, row.author.id))) return null;
		return {
			id: row.id,
			...owned(row.author),
			title: `Post by ${row.author.username}`,
			text: richContentPreview(row.content, TEXT_LENGTH) || null,
			href: `/posts/${row.slug}`,
		};
	}

	if (kind === "review") {
		const row = await db.feedback.findFirst({
			where: {
				...unique("slug"),
				...(viewer ? { AND: [reviewVisibleWhere(viewer)] } : {}),
			},
			select: {
				id: true,
				slug: true,
				review: true,
				author: ownerSelect,
				book: { select: { slug: true, title: true } },
			},
		});
		if (!row || (viewer && blocked(viewer, row.author.id))) return null;
		return {
			id: row.id,
			...owned(row.author),
			title: `Review of ${row.book.title}`,
			text: richContentPreview(row.review, TEXT_LENGTH) || null,
			href: `/books/${row.book.slug}/feedbacks/${row.slug}`,
		};
	}

	if (kind === "comment") {
		const row = await db.comment.findFirst({
			where: {
				...unique("slug"),
				...(viewer
					? {
							AND: [
								{
									OR: [
										{ post: postVisibleWhere(viewer) },
										{ feedback: reviewVisibleWhere(viewer) },
									],
								},
							],
						}
					: {}),
			},
			select: {
				id: true,
				content: true,
				author: ownerSelect,
				post: { select: { slug: true } },
				feedback: {
					select: { slug: true, book: { select: { slug: true } } },
				},
			},
		});
		if (!row || (viewer && blocked(viewer, row.author.id))) return null;
		const href = row.post
			? `/posts/${row.post.slug}#comments`
			: row.feedback
				? `/books/${row.feedback.book.slug}/feedbacks/${row.feedback.slug}#comments`
				: null;
		if (!href) return null;
		return {
			id: row.id,
			...owned(row.author),
			title: `Comment by ${row.author.username}`,
			text: richContentPreview(row.content, TEXT_LENGTH) || null,
			href,
		};
	}

	if (kind === "shelf") {
		let where: object;
		if (lookup.by === "id") {
			where = { id: lookup.id };
		} else {
			const [username, slug] = lookup.ref.split("/");
			if (!username || !slug) return null;
			where = {
				slug,
				user: { username },
				AND: [shelfVisibleWhere(lookup.viewer)],
			};
		}
		const row = await db.shelf.findFirst({
			where,
			select: {
				id: true,
				slug: true,
				title: true,
				description: true,
				isWishlist: true,
				user: ownerSelect,
			},
		});
		if (!row || row.isWishlist) return null;
		if (viewer && blocked(viewer, row.user.id)) return null;
		return {
			id: row.id,
			...owned(row.user),
			title: row.title,
			text: row.description
				? richContentPreview(row.description, TEXT_LENGTH) || null
				: null,
			href: `/users/${row.user.username}/shelves/${row.slug}`,
		};
	}

	// A profile: its name is the content. Nothing else is copied.
	const row = await db.user.findFirst({
		where: {
			...(lookup.by === "id" ? { id: lookup.id } : { username: lookup.ref }),
			...(viewer ? { AND: [memberListVisibleWhere(viewer)] } : {}),
		},
		select: { id: true, username: true, name: true, isAdmin: true },
	});
	if (!row) return null;
	return {
		id: row.id,
		...owned(row),
		title: row.name,
		text: null,
		href: `/users/${row.username}`,
	};
}

/** For a member filing a report: only what that member may see. */
export function findReportTargetForViewer(
	db: Database,
	viewer: Viewer,
	kind: ReportTargetKind,
	ref: string,
) {
	return loadTarget(db, kind, { by: "ref", ref, viewer });
}

/** For the admin queue: by internal id, `null` once the thing is deleted. */
export function findReportTargetById(
	db: Database,
	kind: ReportTargetKind,
	id: string,
) {
	return loadTarget(db, kind, { by: "id", id });
}

export function reportTargetLabel(kind: ReportTargetKind): string {
	return REPORT_TARGET_LABELS[kind];
}
