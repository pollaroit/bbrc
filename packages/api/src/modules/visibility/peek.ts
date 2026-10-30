import type { Database } from "@bbrc/db";
import {
	canView,
	effectiveVisibility,
	type ProfileVisibility,
	relationTo,
	type Viewer,
	type Visibility,
} from "@bbrc/shared";

/*
 * What to show someone who may not open an item, without leaking more than the
 * rules allow. A friends-level item has people who legitimately hold links (the
 * owner's friends), so a stranger gets a LOCKED page that names only the owner
 * (name, username and avatar are public). An only-me item has no legitimate link
 * holders, so it is simply UNAVAILABLE: no page, no preview, nothing that shows it
 * exists.
 */

export type PeekAuthor = {
	name: string;
	username: string;
	image: string | null;
};

export type PeekResult =
	| { state: "visible" }
	| { state: "locked"; author: PeekAuthor }
	| { state: "unavailable" };

/** The pure decision, from what the owner and the item set. */
export function decidePeek(input: {
	viewer: Viewer;
	ownerId: string;
	profile: ProfileVisibility;
	section?: Visibility | null;
	item?: Visibility | null;
	author: PeekAuthor;
}): PeekResult {
	const relation = relationTo(input.viewer, input.ownerId);
	const settings = {
		profile: input.profile,
		section: input.section,
		item: input.item,
	};
	if (canView(relation, settings)) return { state: "visible" };
	if (relation === "blocked") return { state: "unavailable" };
	return effectiveVisibility(settings) === "friends"
		? { state: "locked", author: input.author }
		: { state: "unavailable" };
}

const authorSelect = {
	id: true,
	name: true,
	username: true,
	image: true,
	profileVisibility: true,
} as const;

function identity(user: {
	name: string;
	username: string;
	image: string | null;
}): PeekAuthor {
	return {
		name: user.name,
		username: user.username,
		image: user.image ?? null,
	};
}

export async function peekPost(
	db: Database,
	viewer: Viewer,
	slug: string,
): Promise<PeekResult> {
	const post = await db.post.findUnique({
		where: { slug },
		select: { visibility: true, author: { select: authorSelect } },
	});
	if (!post) return { state: "unavailable" };
	return decidePeek({
		viewer,
		ownerId: post.author.id,
		profile: post.author.profileVisibility,
		item: post.visibility,
		author: identity(post.author),
	});
}

export async function peekFeedback(
	db: Database,
	viewer: Viewer,
	slug: string,
): Promise<PeekResult> {
	const review = await db.feedback.findUnique({
		where: { slug },
		select: {
			visibility: true,
			author: { select: { ...authorSelect, reviewsVisibility: true } },
		},
	});
	if (!review) return { state: "unavailable" };
	return decidePeek({
		viewer,
		ownerId: review.author.id,
		profile: review.author.profileVisibility,
		section: review.author.reviewsVisibility,
		item: review.visibility,
		author: identity(review.author),
	});
}

export async function peekShelf(
	db: Database,
	viewer: Viewer,
	username: string,
	shelfSlug: string,
): Promise<PeekResult> {
	const shelf = await db.shelf.findFirst({
		where: { slug: shelfSlug, user: { username } },
		select: { status: true, visibility: true, user: { select: authorSelect } },
	});
	// A draft or archived shelf is for its owner and collaborators only.
	if (!shelf || shelf.status !== "active") return { state: "unavailable" };
	return decidePeek({
		viewer,
		ownerId: shelf.user.id,
		profile: shelf.user.profileVisibility,
		item: shelf.visibility,
		author: identity(shelf.user),
	});
}
