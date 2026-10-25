import type { Database, DatabaseTransaction } from "@bbrc/db";
import {
	MAX_MENTIONS_PER_CONTENT,
	type MentionNode,
	mentionLabel,
	parseStoredContent,
	type RichBlock,
	type RichDocument,
	type RichInline,
	replaceMentionsWithText,
	richContentPreview,
	serializeRichDocument,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { dispatchNotification } from "../notification/notification.service";
import {
	MENTION_PICKER_LIMIT,
	type MentionCandidate,
	type MentionItem,
	type MentionProfile,
} from "./mention.schema";

type Db = Database | DatabaseTransaction;
export type MentionKind = "post" | "comment" | "review";

const displayName = (user: { name: string | null; username: string }) =>
	user.name?.trim() || user.username;

/** Members who may show up in the picker and in rendered mentions. */
const visibleMemberWhere = {
	isHidden: false,
	status: { not: "banned" as const },
};

// ── Sanitising a document before it is saved ───────────────────────────────

type MentionedMember = { userId: string; username: string; name: string };

/**
 * Checks the mentions in `content` (a normalised stored document) against the
 * database and returns the document to save plus who is really mentioned.
 * A mention that cannot stand becomes plain text ("@Jon Doe"): an unknown or
 * deleted member, yourself, a hidden or banned member, a member who switched
 * mentions off (unless they were already mentioned in this content), and
 * anything past the limit of 10 members. Old username-only mentions get their
 * id and name filled in. Call it BEFORE persisting.
 */
export async function prepareContentMentions(
	db: Db,
	input: {
		content: string;
		authorId: string;
		/** Members already mentioned in this content (an edit): kept even if they switched mentions off. */
		alreadyMentionedIds?: ReadonlySet<string>;
	},
): Promise<{ content: string; mentioned: MentionedMember[] }> {
	const doc = parseStoredContent(input.content);
	const nodes: MentionNode[] = [];
	for (const block of doc.blocks) {
		if (block.t === "embed") continue;
		for (const node of block.inline) {
			if (node.t === "mention") nodes.push(node);
		}
	}
	if (nodes.length === 0) return { content: input.content, mentioned: [] };

	const ids = [...new Set(nodes.flatMap((n) => (n.userId ? [n.userId] : [])))];
	const usernames = [
		...new Set(
			nodes.filter((n) => !n.userId).map((n) => n.username.toLowerCase()),
		),
	];
	const users = await db.user.findMany({
		where: {
			OR: [
				...(ids.length ? [{ id: { in: ids } }] : []),
				...(usernames.length
					? [{ username: { in: usernames, mode: "insensitive" as const } }]
					: []),
			],
		},
		select: {
			id: true,
			username: true,
			name: true,
			isHidden: true,
			status: true,
			allowMentions: true,
		},
	});
	const byId = new Map(users.map((user) => [user.id, user]));
	const byUsername = new Map(
		users.map((user) => [user.username.toLowerCase(), user]),
	);

	const kept = new Map<string, MentionedMember>();
	const resolve = (node: MentionNode): MentionedMember | null => {
		const user = node.userId
			? byId.get(node.userId)
			: byUsername.get(node.username.toLowerCase());
		if (!user) return null;
		if (user.id === input.authorId) return null;
		if (user.isHidden || user.status === "banned") return null;
		const known = kept.get(user.id);
		if (known) return known;
		if (!user.allowMentions && !input.alreadyMentionedIds?.has(user.id)) {
			return null;
		}
		if (kept.size >= MAX_MENTIONS_PER_CONTENT) return null;
		const member = {
			userId: user.id,
			username: user.username,
			name: displayName(user),
		};
		kept.set(user.id, member);
		return member;
	};

	const mapInline = (node: RichInline): RichInline => {
		if (node.t !== "mention") return node;
		const member = resolve(node);
		return member
			? {
					t: "mention",
					username: member.username,
					userId: member.userId,
					name: member.name,
				}
			: { t: "text", s: `@${mentionLabel(node)}` };
	};
	const next: RichDocument = {
		...doc,
		blocks: doc.blocks.map(
			(block): RichBlock =>
				block.t === "embed"
					? block
					: ({ ...block, inline: block.inline.map(mapInline) } as RichBlock),
		),
	};
	return {
		content: serializeRichDocument(next),
		mentioned: [...kept.values()],
	};
}

type ContentRef =
	| { kind: "post"; id: string }
	| { kind: "comment"; id: string }
	| { kind: "review"; id: string };

const refWhere = (ref: ContentRef) =>
	ref.kind === "post"
		? { postId: ref.id }
		: ref.kind === "comment"
			? { commentId: ref.id }
			: { feedbackId: ref.id };

/** Member ids already mentioned in a piece of content (before an edit). */
export async function loadMentionedIds(
	db: Db,
	ref: ContentRef,
): Promise<Set<string>> {
	const rows = await db.contentMention.findMany({
		where: refWhere(ref),
		select: { mentionedUserId: true },
	});
	return new Set(rows.map((row) => row.mentionedUserId));
}

/**
 * Brings the `ContentMention` rows in line with the saved text: adds rows for
 * new members, removes rows for people no longer mentioned. Returns the ids
 * that are NEW, the only ones to notify.
 */
export async function syncContentMentions(
	db: Db,
	input: { ref: ContentRef; authorId: string; mentioned: MentionedMember[] },
): Promise<string[]> {
	const where = refWhere(input.ref);
	const existing = await db.contentMention.findMany({
		where,
		select: { id: true, mentionedUserId: true },
	});
	const have = new Set(existing.map((row) => row.mentionedUserId));
	const want = new Set(input.mentioned.map((member) => member.userId));

	const fresh = [...want].filter((id) => !have.has(id));
	const gone = existing.filter((row) => !want.has(row.mentionedUserId));

	if (gone.length > 0) {
		await db.contentMention.deleteMany({
			where: { id: { in: gone.map((row) => row.id) } },
		});
	}
	if (fresh.length > 0) {
		await db.contentMention.createMany({
			data: fresh.map((mentionedUserId) => ({
				mentionedUserId,
				authorId: input.authorId,
				...where,
			})),
			skipDuplicates: true,
		});
	}
	return fresh;
}

/** One "mentioned you" notification per new member (never the author). */
export async function notifyMentions(
	db: Database,
	input: {
		authorId: string;
		recipientIds: string[];
		content: string;
		href: string;
	},
): Promise<void> {
	const recipientUserIds = input.recipientIds.filter(
		(id) => id !== input.authorId,
	);
	if (recipientUserIds.length === 0) return;
	try {
		const author = await db.user.findUnique({
			where: { id: input.authorId },
			select: { name: true, username: true },
		});
		if (!author) return;
		await dispatchNotification(db, {
			kind: "mention",
			recipientUserIds,
			excludeUserIds: [input.authorId],
			title: `${displayName(author)} mentioned you`,
			body: richContentPreview(input.content, 140) || "You were mentioned.",
			href: input.href,
		});
	} catch (error) {
		console.error("mention notification failed", error);
	}
}

// ── The picker ─────────────────────────────────────────────────────────────

type Viewer = { id: string };

async function threadMemberIds(
	db: Db,
	context: { postSlug?: string; feedbackSlug?: string } | undefined,
): Promise<string[]> {
	if (context?.postSlug) {
		const post = await db.post.findUnique({
			where: { slug: context.postSlug },
			select: {
				id: true,
				authorId: true,
			},
		});
		if (!post) return [];
		const comments = await db.comment.findMany({
			where: { postId: post.id },
			orderBy: { createdAt: "desc" },
			take: 40,
			select: { authorId: true },
		});
		return [post.authorId, ...comments.map((comment) => comment.authorId)];
	}
	if (context?.feedbackSlug) {
		const feedback = await db.feedback.findUnique({
			where: { slug: context.feedbackSlug },
			select: { id: true, authorId: true },
		});
		if (!feedback) return [];
		const comments = await db.comment.findMany({
			where: { feedbackId: feedback.id },
			orderBy: { createdAt: "desc" },
			take: 40,
			select: { authorId: true },
		});
		return [feedback.authorId, ...comments.map((comment) => comment.authorId)];
	}
	return [];
}

const unique = <T>(values: T[]) => [...new Set(values)];

export async function searchMentionCandidates(
	db: Database,
	viewer: Viewer,
	input: {
		query: string;
		context?: { postSlug?: string; feedbackSlug?: string };
	},
): Promise<MentionCandidate[]> {
	const base = {
		id: { not: viewer.id },
		allowMentions: true,
		...visibleMemberWhere,
	};
	const select = { id: true, username: true, name: true, image: true } as const;
	const toCandidate = (
		user: { id: string; username: string; name: string; image: string | null },
		reason: MentionCandidate["reason"],
	): MentionCandidate => ({
		id: user.id,
		username: user.username,
		name: user.name,
		image: user.image ?? null,
		reason,
	});

	const [thread, recentRows] = await Promise.all([
		threadMemberIds(db, input.context),
		db.contentMention.findMany({
			where: { authorId: viewer.id },
			orderBy: { createdAt: "desc" },
			take: 20,
			select: { mentionedUserId: true },
		}),
	]);
	const threadIds = unique(thread);
	const recentIds = unique(recentRows.map((row) => row.mentionedUserId));

	const needle = input.query.trim();
	if (needle) {
		const rows = await db.user.findMany({
			where: {
				...base,
				OR: [
					{ name: { contains: needle, mode: "insensitive" } },
					{ username: { contains: needle, mode: "insensitive" } },
				],
			},
			select,
			take: 40,
		});
		const lower = needle.toLowerCase();
		const rank = (user: (typeof rows)[number]) => {
			const name = user.name.toLowerCase();
			const username = user.username.toLowerCase();
			const prefix =
				username.startsWith(lower) ||
				name.startsWith(lower) ||
				name.split(/\s+/).some((word) => word.startsWith(lower));
			let score = prefix ? 0 : 10;
			if (threadIds.includes(user.id)) score -= 2;
			else if (recentIds.includes(user.id)) score -= 1;
			return score;
		};
		return rows
			.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
			.slice(0, MENTION_PICKER_LIMIT)
			.map((user) => toCandidate(user, "match"));
	}

	// Nothing typed: the conversation, then who you mention, then who is around.
	const [recentComments, recentPosts] = await Promise.all([
		db.comment.findMany({
			where: { author: { ...base } },
			orderBy: { createdAt: "desc" },
			take: 30,
			select: { authorId: true },
		}),
		db.post.findMany({
			where: { author: { ...base } },
			orderBy: { createdAt: "desc" },
			take: 30,
			select: { authorId: true },
		}),
	]);
	const activeIds = unique([
		...recentComments.map((row) => row.authorId),
		...recentPosts.map((row) => row.authorId),
	]);
	const ordered: { id: string; reason: MentionCandidate["reason"] }[] = [];
	const seen = new Set<string>();
	for (const [ids, reason] of [
		[threadIds, "thread"],
		[recentIds, "recent"],
		[activeIds, "active"],
	] as const) {
		for (const id of ids) {
			if (id === viewer.id || seen.has(id)) continue;
			seen.add(id);
			ordered.push({ id, reason });
		}
	}
	const candidates = await db.user.findMany({
		where: {
			...base,
			id: { in: ordered.map((entry) => entry.id), not: viewer.id },
		},
		select,
	});
	const byId = new Map(candidates.map((user) => [user.id, user]));
	const picked: MentionCandidate[] = [];
	for (const entry of ordered) {
		const user = byId.get(entry.id);
		if (user) picked.push(toCandidate(user, entry.reason));
		if (picked.length >= MENTION_PICKER_LIMIT) break;
	}
	if (picked.length < MENTION_PICKER_LIMIT) {
		const have = new Set(picked.map((user) => user.id));
		const filler = await db.user.findMany({
			where: { ...base, id: { notIn: [...have, viewer.id] } },
			orderBy: { createdAt: "desc" },
			take: MENTION_PICKER_LIMIT - picked.length,
			select,
		});
		for (const user of filler) picked.push(toCandidate(user, "active"));
	}
	return picked;
}

export async function resolveMentionProfiles(
	db: Database,
	ids: string[],
): Promise<MentionProfile[]> {
	const users = await db.user.findMany({
		where: { id: { in: ids }, ...visibleMemberWhere },
		select: { id: true, username: true, name: true, image: true },
	});
	return users.map((user) => ({
		id: user.id,
		username: user.username,
		name: user.name,
		image: user.image ?? null,
	}));
}

// ── "Mentions" page and removing a mention of me ───────────────────────────

const mentionRowSelect = {
	id: true,
	createdAt: true,
	author: { select: { username: true, name: true, image: true } },
	post: { select: { slug: true, content: true } },
	comment: {
		select: {
			slug: true,
			content: true,
			post: { select: { slug: true } },
			feedback: { select: { slug: true, book: { select: { slug: true } } } },
		},
	},
	feedback: {
		select: { slug: true, review: true, book: { select: { slug: true } } },
	},
} as const;

export async function listMyMentions(
	db: Database,
	viewerId: string,
	input: { cursor?: string; limit: number },
): Promise<{ items: MentionItem[]; nextCursor: string | null }> {
	const rows = await db.contentMention.findMany({
		where: {
			mentionedUserId: viewerId,
			author: { ...visibleMemberWhere },
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: input.limit + 1,
		...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
		select: mentionRowSelect,
	});
	const page = rows.slice(0, input.limit);
	const items: MentionItem[] = page.flatMap((row): MentionItem[] => {
		const author = {
			username: row.author.username,
			name: row.author.name,
			image: row.author.image ?? null,
		};
		if (row.post) {
			return [
				{
					id: row.id,
					createdAt: row.createdAt,
					kind: "post" as const,
					author,
					excerpt: richContentPreview(row.post.content, 180),
					href: `/posts/${row.post.slug}`,
				},
			];
		}
		if (row.comment) {
			const comment = row.comment;
			const href = comment.post
				? `/posts/${comment.post.slug}/comments/${comment.slug}`
				: comment.feedback
					? `/books/${comment.feedback.book.slug}/feedbacks/${comment.feedback.slug}/comments/${comment.slug}`
					: null;
			return href
				? [
						{
							id: row.id,
							createdAt: row.createdAt,
							kind: "comment" as const,
							author,
							excerpt: richContentPreview(comment.content, 180),
							href,
						},
					]
				: [];
		}
		if (row.feedback) {
			return [
				{
					id: row.id,
					createdAt: row.createdAt,
					kind: "review" as const,
					author,
					excerpt: richContentPreview(row.feedback.review, 180),
					href: `/books/${row.feedback.book.slug}/feedbacks/${row.feedback.slug}`,
				},
			];
		}
		return [];
	});
	const nextCursor =
		rows.length > input.limit ? (page.at(-1)?.id ?? null) : null;
	return { items, nextCursor };
}

/** "Remove my mention": the mention of the member becomes plain text in the content. */
export async function removeMyMention(
	db: Database,
	viewer: { id: string },
	id: string,
): Promise<void> {
	const row = await db.contentMention.findUnique({
		where: { id },
		select: {
			mentionedUserId: true,
			postId: true,
			commentId: true,
			feedbackId: true,
			mentionedUser: { select: { username: true } },
		},
	});
	if (!row || row.mentionedUserId !== viewer.id) {
		throw new ORPCError("NOT_FOUND", { message: "Mention not found" });
	}
	const mineUsername = row.mentionedUser.username.toLowerCase();
	const isMine = (node: MentionNode) =>
		node.userId
			? node.userId === viewer.id
			: node.username.toLowerCase() === mineUsername;
	const strip = (raw: string) =>
		serializeRichDocument(
			replaceMentionsWithText(parseStoredContent(raw), (node) => !isMine(node)),
		);

	await db.$transaction(async (tx) => {
		if (row.postId) {
			const post = await tx.post.findUnique({
				where: { id: row.postId },
				select: { content: true, editedAt: true },
			});
			if (post) {
				await tx.post.update({
					where: { id: row.postId },
					data: { content: strip(post.content), editedAt: post.editedAt },
				});
			}
		} else if (row.commentId) {
			const comment = await tx.comment.findUnique({
				where: { id: row.commentId },
				select: { content: true, editedAt: true },
			});
			if (comment) {
				await tx.comment.update({
					where: { id: row.commentId },
					data: { content: strip(comment.content), editedAt: comment.editedAt },
				});
			}
		} else if (row.feedbackId) {
			const feedback = await tx.feedback.findUnique({
				where: { id: row.feedbackId },
				select: { review: true },
			});
			if (feedback) {
				await tx.feedback.update({
					where: { id: row.feedbackId },
					data: { review: strip(feedback.review) },
				});
			}
		}
		await tx.contentMention.deleteMany({ where: { id } });
	});
}

/**
 * The viewer's own mentions among the given content (posts, comments, reviews by
 * slug), so a page can show "Remove my mention" only where it applies.
 */
export async function findViewerMentions(
	db: Database,
	viewerId: string,
	input: {
		postSlugs?: string[];
		commentSlugs?: string[];
		feedbackSlugs?: string[];
	},
): Promise<{ kind: MentionKind; slug: string; mentionId: string }[]> {
	const postSlugs = input.postSlugs ?? [];
	const commentSlugs = input.commentSlugs ?? [];
	const feedbackSlugs = input.feedbackSlugs ?? [];
	const any = [
		...(postSlugs.length ? [{ post: { slug: { in: postSlugs } } }] : []),
		...(commentSlugs.length
			? [{ comment: { slug: { in: commentSlugs } } }]
			: []),
		...(feedbackSlugs.length
			? [{ feedback: { slug: { in: feedbackSlugs } } }]
			: []),
	];
	if (any.length === 0) return [];

	const rows = await db.contentMention.findMany({
		where: { mentionedUserId: viewerId, OR: any },
		select: {
			id: true,
			post: { select: { slug: true } },
			comment: { select: { slug: true } },
			feedback: { select: { slug: true } },
		},
	});
	const found: { kind: MentionKind; slug: string; mentionId: string }[] = [];
	for (const row of rows) {
		if (row.post) {
			found.push({ kind: "post", slug: row.post.slug, mentionId: row.id });
		} else if (row.comment) {
			found.push({
				kind: "comment",
				slug: row.comment.slug,
				mentionId: row.id,
			});
		} else if (row.feedback) {
			found.push({
				kind: "review",
				slug: row.feedback.slug,
				mentionId: row.id,
			});
		}
	}
	return found;
}

// ── Preferences ────────────────────────────────────────────────────────────

export async function getMentionPreferences(db: Database, userId: string) {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { allowMentions: true },
	});
	return { allowMentions: user?.allowMentions ?? true };
}

export async function setMentionPreferences(
	db: Database,
	userId: string,
	input: { allowMentions: boolean },
) {
	const user = await db.user.update({
		where: { id: userId },
		data: { allowMentions: input.allowMentions },
		select: { allowMentions: true },
	});
	return { allowMentions: user.allowMentions };
}
