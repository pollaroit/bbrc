import type { Database } from "@bbrc/db";

import type { Context } from "./context";

export function revalidateBookIsr(context: Context, slug: string) {
	context.revalidateIsr?.revalidateBook(slug);
}

export function revalidateSittingIsr(context: Context, slug: string) {
	context.revalidateIsr?.revalidateSitting(slug);
}

export function revalidatePostIsr(context: Context, slug: string) {
	context.revalidateIsr?.revalidatePost(slug);
}

export function revalidateUserIsr(context: Context, username: string) {
	context.revalidateIsr?.revalidateUser(username);
}

export function revalidateUserShelvesIsr(
	context: Context,
	username: string,
	shelfSlug?: string,
) {
	context.revalidateIsr?.revalidateUserShelves(username, shelfSlug);
}

export function revalidateHomeIsr(context: Context) {
	context.revalidateIsr?.revalidateHome();
}

export function revalidateFeedsIsr(context: Context) {
	context.revalidateIsr?.revalidateFeeds();
}

export function revalidateSeriesIsr(context: Context, slug: string) {
	context.revalidateIsr?.revalidateSeries(slug);
}

export function revalidateBooksCatalogIsr(context: Context) {
	context.revalidateIsr?.revalidateBooksCatalog();
}

export async function revalidateCommentIsr(
	context: Context,
	db: Database,
	commentSlug: string,
) {
	const comment = await db.comment.findUnique({
		where: { slug: commentSlug },
		select: {
			post: { select: { slug: true } },
			feedback: { select: { book: { select: { slug: true } } } },
		},
	});

	if (comment?.post?.slug) {
		revalidatePostIsr(context, comment.post.slug);
	}

	if (comment?.feedback?.book?.slug) {
		revalidateBookIsr(context, comment.feedback.book.slug);
	}
}

export function revalidateAuthorIsr(context: Context, slug: string) {
	context.revalidateIsr?.revalidateAuthor(slug);
}
