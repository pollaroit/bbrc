import type { Database, DatabaseTransaction } from "@bbrc/db";
import {
	isTierlistColor,
	normalizeTierlistText,
	tierlistSetupProblems,
} from "@bbrc/shared";
import { loadR2ConfigFromEnv } from "@bbrc/storage";
import { ORPCError } from "@orpc/server";
import { findAuthorBySlug } from "../../lib/authors";
import type {
	CreateTierlistInput,
	PostTierlistView,
} from "./post-tierlist.schema";

type Db = Database | DatabaseTransaction;

/** The picture must be a file we stored ourselves under `tierlists/`. */
export function assertOwnTierlistImageUrl(url: string) {
	const config = loadR2ConfigFromEnv();
	const base = config?.publicBaseUrl.replace(/\/$/, "");
	const clean = url.split("?")[0] ?? "";
	if (
		!base ||
		!clean.startsWith(`${base}/`) ||
		!clean.includes("/tierlists/") ||
		!clean.endsWith(".webp")
	) {
		throw new ORPCError("BAD_REQUEST", {
			message: "That picture was not uploaded here. Upload it again.",
		});
	}
}

type ResolvedItem = {
	kind: "text" | "image" | "book" | "author";
	label: string | null;
	imageUrl: string | null;
	bookId: string | null;
	authorId: string | null;
	dedupeKey: string;
};

async function resolveItem(
	db: Db,
	item: CreateTierlistInput["tiers"][number]["items"][number],
): Promise<ResolvedItem> {
	const none = { imageUrl: null, bookId: null, authorId: null };

	if (item.kind === "text") {
		const text = normalizeTierlistText(item.label);
		return {
			...none,
			kind: "text",
			label: text,
			dedupeKey: `text:${text.toLowerCase()}`,
		};
	}

	if (item.kind === "image") {
		const url = item.imageUrl?.trim() ?? "";
		assertOwnTierlistImageUrl(url);
		const caption = normalizeTierlistText(item.label);
		return {
			...none,
			kind: "image",
			label: caption || null,
			imageUrl: url,
			dedupeKey: `image:${url}`,
		};
	}

	if (item.kind === "book") {
		const book = await db.book.findUnique({
			where: { slug: item.bookSlug?.trim() ?? "" },
			select: { id: true, title: true },
		});
		if (!book) throw new ORPCError("NOT_FOUND", { message: "Book not found." });
		return {
			...none,
			kind: "book",
			label: book.title,
			bookId: book.id,
			dedupeKey: `book:${book.id}`,
		};
	}

	const author = await findAuthorBySlug(db, item.authorSlug ?? "");
	if (!author?.id) {
		throw new ORPCError("NOT_FOUND", { message: "Author not found." });
	}
	return {
		...none,
		kind: "author",
		label: author.name,
		authorId: author.id,
		dedupeKey: `author:${author.id}`,
	};
}

/** Creates the tierlist of a new post. Runs inside the post's transaction. */
export async function createPostTierlist(
	tx: DatabaseTransaction,
	postId: string,
	input: CreateTierlistInput,
): Promise<void> {
	const problems = tierlistSetupProblems(input.tiers);
	if (problems.length > 0) {
		throw new ORPCError("BAD_REQUEST", { message: problems[0] });
	}

	const tierlist = await tx.postTierlist.create({
		data: { postId },
		select: { id: true },
	});

	const seen = new Set<string>();
	for (const [tierIndex, tier] of input.tiers.entries()) {
		if (!isTierlistColor(tier.color)) {
			throw new ORPCError("BAD_REQUEST", { message: "Unknown tier colour." });
		}
		const row = await tx.postTierlistTier.create({
			data: {
				tierlistId: tierlist.id,
				name: normalizeTierlistText(tier.name),
				color: tier.color,
				position: tierIndex,
			},
			select: { id: true },
		});

		const resolved: ResolvedItem[] = [];
		for (const item of tier.items) {
			const next = await resolveItem(tx, item);
			// Two different addresses can still be the same book or author.
			if (seen.has(next.dedupeKey)) {
				throw new ORPCError("BAD_REQUEST", {
					message: "The same item is placed twice.",
				});
			}
			seen.add(next.dedupeKey);
			resolved.push(next);
		}

		if (resolved.length > 0) {
			await tx.postTierlistItem.createMany({
				data: resolved.map((item, position) => ({
					tierlistId: tierlist.id,
					tierId: row.id,
					kind: item.kind,
					label: item.label,
					imageUrl: item.imageUrl,
					bookId: item.bookId,
					authorId: item.authorId,
					dedupeKey: item.dedupeKey,
					position,
				})),
			});
		}
	}
}

const tierlistViewSelect = {
	postId: true,
	tiers: {
		orderBy: { position: "asc" },
		select: {
			id: true,
			name: true,
			color: true,
			items: {
				orderBy: { position: "asc" },
				select: {
					id: true,
					kind: true,
					label: true,
					imageUrl: true,
					book: {
						select: { slug: true, title: true, authors: true, coverId: true },
					},
					author: { select: { slug: true, name: true, photoUrl: true } },
				},
			},
		},
	},
} as const;

/** The tierlists of these posts, by post id. Posts without one are absent. */
export async function loadTierlistViews(
	db: Db,
	postIds: string[],
): Promise<Map<string, PostTierlistView>> {
	const views = new Map<string, PostTierlistView>();
	if (postIds.length === 0) return views;

	const rows = await db.postTierlist.findMany({
		where: { postId: { in: postIds } },
		select: tierlistViewSelect,
	});

	for (const row of rows) {
		const tiers = row.tiers.map((tier) => ({
			id: tier.id,
			name: tier.name,
			color: tier.color,
			items: tier.items.map((item) => ({
				id: item.id,
				kind: item.kind,
				// The live name when the book or author still exists, else what was saved.
				label:
					item.kind === "book"
						? (item.book?.title ?? item.label)
						: item.kind === "author"
							? (item.author?.name ?? item.label)
							: item.label,
				imageUrl: item.imageUrl,
				book: item.book,
				author: item.author,
			})),
		}));
		views.set(row.postId, {
			tiers,
			itemCount: tiers.reduce((sum, tier) => sum + tier.items.length, 0),
		});
	}
	return views;
}

/** The pictures of a post's tierlist, so deleting the post can remove the files too. */
export async function tierlistImageUrls(
	db: Db,
	postId: string,
): Promise<string[]> {
	const rows = await db.postTierlistItem.findMany({
		where: { tierlist: { postId }, imageUrl: { not: null } },
		select: { imageUrl: true },
	});
	return rows.flatMap((row) => (row.imageUrl ? [row.imageUrl] : []));
}
