import type { Database } from "@bbrc/db";

export async function bookSlugStaticParams(db: Database) {
	const rows = await db.book.findMany({ select: { slug: true } });
	return rows.map(({ slug }) => ({ slug }));
}

export async function postSlugStaticParams(db: Database) {
	const rows = await db.post.findMany({ select: { slug: true } });
	return rows.map(({ slug }) => ({ slug }));
}

export async function sittingSlugStaticParams(db: Database) {
	const rows = await db.sitting.findMany({ select: { slug: true } });
	return rows.map(({ slug }) => ({ slug }));
}

export async function usernameStaticParams(db: Database) {
	const rows = await db.user.findMany({
		where: { isHidden: false },
		select: { username: true },
	});
	return rows.map(({ username }) => ({ username }));
}
