import type { Database } from "@bbrc/db";
import { evaluateAchievementsForUser } from "../achievement/achievement.service";
import { notifyMentions } from "../mention/mention.service";
import { notifyMemberPosted } from "../notification/notification-triggers";
import { awardPostXp } from "../xp/xp.service";

export type PublishDuePostsResult = {
	published: string[];
	skipped: string[];
};

async function runPublishSideEffects(
	db: Database,
	post: {
		id: string;
		slug: string;
		content: string;
		authorId: string;
		visibility: "public" | "friends" | "private";
	},
): Promise<void> {
	await db.$transaction(async (tx) => {
		await awardPostXp({ userId: post.authorId, postId: post.id }, tx);
	});

	const mentionRows = await db.contentMention.findMany({
		where: { postId: post.id },
		select: { mentionedUserId: true },
	});
	const mentionedIds = mentionRows.map((row) => row.mentionedUserId);

	void notifyMentions(db, {
		authorId: post.authorId,
		recipientIds: mentionedIds,
		content: post.content,
		href: `/posts/${post.slug}`,
	});
	void notifyMemberPosted(
		db,
		post.authorId,
		post.slug,
		mentionedIds,
		post.visibility,
	);

	try {
		await evaluateAchievementsForUser(db, post.authorId, {
			sections: ["posts"],
		});
	} catch (error) {
		console.error("Achievement check failed after publish", error);
	}
}

/** Publish one scheduled post now (owner action). Idempotent if already published. */
export async function publishScheduledPostById(
	db: Database,
	postId: string,
	now = new Date(),
): Promise<"published" | "skipped" | "already"> {
	const claimed = await db.post.updateMany({
		where: { id: postId, status: "scheduled" },
		data: {
			status: "published",
			publishedAt: now,
			scheduledAt: null,
		},
	});

	if (claimed.count === 0) {
		const row = await db.post.findUnique({
			where: { id: postId },
			select: { status: true },
		});
		return row?.status === "published" ? "already" : "skipped";
	}

	const post = await db.post.findUniqueOrThrow({
		where: { id: postId },
		select: {
			id: true,
			slug: true,
			content: true,
			authorId: true,
			visibility: true,
		},
	});

	await runPublishSideEffects(db, post);
	return "published";
}

/** Hourly sweep: publish every post whose scheduled time has passed. */
export async function publishDueScheduledPosts(
	db: Database,
	now = new Date(),
	batchSize = 50,
): Promise<PublishDuePostsResult> {
	const published: string[] = [];
	const skipped: string[] = [];

	const due = await db.post.findMany({
		where: {
			status: "scheduled",
			scheduledAt: { lte: now },
		},
		orderBy: { scheduledAt: "asc" },
		take: batchSize,
		select: {
			id: true,
			slug: true,
			content: true,
			authorId: true,
			visibility: true,
		},
	});

	for (const post of due) {
		const claimed = await db.post.updateMany({
			where: { id: post.id, status: "scheduled" },
			data: {
				status: "published",
				publishedAt: now,
				scheduledAt: null,
			},
		});
		if (claimed.count === 0) {
			continue;
		}
		try {
			await runPublishSideEffects(db, post);
			published.push(post.slug);
		} catch (error) {
			console.error("post publish side effects failed", post.slug, error);
			skipped.push(post.slug);
		}
	}

	return { published, skipped };
}
