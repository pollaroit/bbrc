import type { Prisma } from "@bbrc/db";
import { z } from "zod";

/** One include for lists: the work's author records in position order (no extra queries). */
export const bookAuthorRefsSelect = {
	authorLinks: {
		orderBy: { position: "asc" as const },
		select: { author: { select: { id: true, slug: true, name: true } } },
	},
} satisfies Prisma.BookSelect;

export const BookAuthorRefsSchema = z.array(
	z.object({ id: z.string(), slug: z.string(), name: z.string() }),
);

export type BookAuthorRefs = z.infer<typeof BookAuthorRefsSchema>;

/** Empty before the backfill has linked the book; callers fall back to the names copy. */
export function mapBookAuthorRefs(
	links: { author: { id: string; slug: string; name: string } }[],
): BookAuthorRefs {
	return links.map((link) => link.author);
}
