import { NextResponse } from "next/server";
import { db } from "@/services";

export const dynamic = "force-dynamic";

/**
 * Serves a cover an admin uploaded. Book pages ask for `/api/covers/<n>` when
 * a book's cover id is negative (`-n`); the file itself lives in storage.
 * Each upload gets a new id, so the answer can be cached forever.
 */
export async function GET(
	_request: Request,
	context: { params: Promise<{ id: string }> },
) {
	const { id } = await context.params;
	const coverId = -Number.parseInt(id, 10);
	if (!Number.isInteger(coverId) || coverId >= 0) {
		return new NextResponse(null, { status: 404 });
	}

	const book = await db.book.findFirst({
		where: { coverId },
		select: { customCoverUrl: true },
	});
	if (!book?.customCoverUrl) {
		return new NextResponse(null, { status: 404 });
	}

	const upstream = await fetch(book.customCoverUrl);
	if (!upstream.ok || !upstream.body) {
		return new NextResponse(null, { status: 502 });
	}

	return new NextResponse(upstream.body, {
		headers: {
			"content-type": upstream.headers.get("content-type") ?? "image/webp",
			"cache-control": "public, max-age=31536000, immutable",
		},
	});
}
