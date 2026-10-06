import { type Database, Prisma } from "@bbrc/db";
import {
	computePostEngagementScore,
	computePostHotScore,
	POST_FEED_COMMENT_WEIGHT,
	POST_FEED_LIKE_WEIGHT,
	POST_FEED_SHARE_WEIGHT,
	type PostFeedCursor,
	type PostFeedRange,
	postFeedRangeMin,
} from "@bbrc/shared";

type RankedRow = {
	slug: string;
	like_count: number;
	comment_count: number;
	share_count: number;
	created_at: Date;
};

const engagementSql = Prisma.sql`
  (
    COALESCE(lc.cnt, 0) * ${POST_FEED_LIKE_WEIGHT}
    + COALESCE(cc.cnt, 0) * ${POST_FEED_COMMENT_WEIGHT}
    + COALESCE(sc.cnt, 0) * ${POST_FEED_SHARE_WEIGHT}
  )::double precision
`;

const hotScoreSql = Prisma.sql`(LOG(GREATEST(${engagementSql}, 1)) + EXTRACT(EPOCH FROM p.created_at) / 45000.0)`;

function rankedScoreSql(mode: "top" | "hot"): Prisma.Sql {
	return mode === "top" ? engagementSql : hotScoreSql;
}

function buildRankedWhere(
	mode: "top" | "hot",
	rangeMin: Date | undefined,
	authorUsername: string | undefined,
	cursor: Extract<PostFeedCursor, { kind: "top" | "hot" }> | null,
): Prisma.Sql {
	const parts: Prisma.Sql[] = [Prisma.sql`TRUE`];

	if (rangeMin) {
		parts.push(Prisma.sql`p.created_at >= ${rangeMin}`);
	}

	if (authorUsername) {
		parts.push(Prisma.sql`u.username = ${authorUsername}`);
	}

	if (cursor && cursor.kind === mode) {
		const scoreExpr = rankedScoreSql(mode);
		parts.push(
			Prisma.sql`(
        ${scoreExpr} < ${cursor.score}
        OR (${scoreExpr} = ${cursor.score} AND p.slug < ${cursor.slug})
      )`,
		);
	}

	return Prisma.join(parts, " AND ");
}

const rankedFromSql = Prisma.sql`
  FROM post p
  INNER JOIN "user" u ON u.id = p.author_id
  LEFT JOIN (
    SELECT post_id, COUNT(*)::int AS cnt
    FROM "like"
    WHERE source = 'post' AND post_id IS NOT NULL
    GROUP BY post_id
  ) lc ON lc.post_id = p.id
  LEFT JOIN (
    SELECT post_id, COUNT(*)::int AS cnt
    FROM comment
    WHERE post_id IS NOT NULL
    GROUP BY post_id
  ) cc ON cc.post_id = p.id
  LEFT JOIN (
    SELECT attached_post_id AS post_id, COUNT(*)::int AS cnt
    FROM post_attachment
    WHERE kind = 'post' AND attached_post_id IS NOT NULL
    GROUP BY attached_post_id
  ) sc ON sc.post_id = p.id
`;

export async function queryRankedPostSlugs(
	db: Database,
	input: {
		mode: "top" | "hot";
		feedRange: PostFeedRange;
		authorUsername?: string;
		limit: number;
		cursor: PostFeedCursor | null;
	},
): Promise<{ slug: string; score: number; createdAt: Date }[]> {
	const rangeMin =
		input.mode === "hot" ? undefined : postFeedRangeMin(input.feedRange);

	const cursor = input.cursor?.kind === input.mode ? input.cursor : null;

	const where = buildRankedWhere(
		input.mode,
		rangeMin,
		input.authorUsername,
		cursor,
	);

	const orderBy =
		input.mode === "top"
			? Prisma.sql`${engagementSql} DESC, p.slug DESC`
			: Prisma.sql`${hotScoreSql} DESC, p.slug DESC`;

	const rows = await db.$queryRaw<RankedRow[]>(Prisma.sql`
    SELECT
      p.slug,
      COALESCE(lc.cnt, 0)::int AS like_count,
      COALESCE(cc.cnt, 0)::int AS comment_count,
      COALESCE(sc.cnt, 0)::int AS share_count,
      p.created_at
    ${rankedFromSql}
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT ${input.limit}
  `);

	return rows.map((row) => {
		const engagement = computePostEngagementScore(
			row.like_count,
			row.comment_count,
			row.share_count,
		);
		const score =
			input.mode === "top"
				? engagement
				: computePostHotScore(engagement, row.created_at);

		return {
			slug: row.slug,
			score,
			createdAt: row.created_at,
		};
	});
}
