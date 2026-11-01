import type { Database } from "@bbrc/db";
import { clipAuditText } from "@bbrc/shared";
import type { AuditTarget } from "./audit.service";

/** Shared pieces for `audited(...)` specs, so each procedure's declaration stays one or two lines. */

export const memberTarget = (member: {
	id: string;
	name: string;
}): AuditTarget => ({ type: "member", id: member.id, label: member.name });

/** The member a `username` points at, read before a change (rename, delete) alters it. */
export async function memberByUsername(
	db: Database,
	username: string,
): Promise<{ id: string; name: string; username: string } | null> {
	return db.user.findUnique({
		where: { username },
		select: { id: true, name: true, username: true },
	});
}

/** A short label for free text such as a fact body. */
export const excerpt = (text: string | null | undefined) =>
	clipAuditText(text, 80);

export async function authorBefore(
	db: Database,
	id: string,
): Promise<{ id: string; name: string } | null> {
	return db.author.findUnique({
		where: { id },
		select: { id: true, name: true },
	});
}

/** An author target by id, using the name read before the change. */
export const authorTarget = (
	before: { id: string; name: string } | null | undefined,
	id: string,
): AuditTarget => ({ type: "author", id, label: before?.name ?? null });

type Named = { id: string; label: string | null };

/** A member-added edition, labelled by its own title or its book's. */
export async function editionBefore(
	db: Database,
	id: string,
): Promise<Named | null> {
	const row = await db.bookEdition.findUnique({
		where: { id },
		select: { id: true, title: true, book: { select: { title: true } } },
	});
	return row ? { id: row.id, label: row.title ?? row.book.title } : null;
}

export async function documentBefore(
	db: Database,
	id: string,
): Promise<Named | null> {
	const row = await db.document.findUnique({
		where: { id },
		select: { id: true, name: true },
	});
	return row ? { id: row.id, label: row.name } : null;
}

export async function bookRequestBefore(
	db: Database,
	id: string,
): Promise<Named | null> {
	const row = await db.bookRequest.findUnique({
		where: { id },
		select: { id: true, title: true, olid: true },
	});
	return row ? { id: row.id, label: row.title ?? row.olid } : null;
}

/** A quiz is labelled by its book. */
export async function quizBefore(
	db: Database,
	id: string,
): Promise<Named | null> {
	const row = await db.quiz.findUnique({
		where: { id },
		select: { id: true, book: { select: { title: true } } },
	});
	return row ? { id: row.id, label: row.book.title } : null;
}

export async function bookBeforeBySlug(
	db: Database,
	slug: string,
): Promise<Named | null> {
	const row = await db.book.findUnique({
		where: { slug },
		select: { id: true, title: true },
	});
	return row ? { id: row.id, label: row.title } : null;
}

export const namedTarget = (
	type: AuditTarget["type"],
	before: Named | null | undefined,
	id: string,
): AuditTarget => ({ type, id, label: before?.label ?? null });

export async function seriesBefore(
	db: Database,
	slug: string,
): Promise<Named | null> {
	const row = await db.series.findUnique({
		where: { slug },
		select: { id: true, title: true },
	});
	return row ? { id: row.id, label: row.title } : null;
}

/** A sitting is named by its slug (it carries no title of its own). */
export const sittingTarget = (slug: string): AuditTarget => ({
	type: "sitting",
	id: slug,
	label: slug,
});

export async function memberNameById(
	db: Database,
	id: string,
): Promise<string | null> {
	const row = await db.user.findUnique({
		where: { id },
		select: { name: true },
	});
	return row?.name ?? null;
}
