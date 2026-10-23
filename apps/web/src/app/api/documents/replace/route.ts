import { replaceDocumentFile } from "@bbrc/api/modules/document/document.service";
import {
	DOCUMENT_FORMATS,
	DOCUMENT_FORMATS_LABEL,
	MAX_DOCUMENT_BYTES,
	resolveDocumentFormat,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { createContext } from "@/context";

export const runtime = "nodejs";

const ReplaceBodySchema = z.object({
	bookSlug: z.string().min(1),
	documentSlug: z.string().min(1),
});

export async function POST(req: NextRequest) {
	const context = await createContext(req);
	const session = context.session;

	if (!session?.user) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (session.user.status === "banned") {
		return Response.json({ error: "Forbidden" }, { status: 403 });
	}

	let formData: FormData;
	try {
		formData = await req.formData();
	} catch {
		return Response.json({ error: "Invalid form data" }, { status: 400 });
	}

	const parsed = ReplaceBodySchema.safeParse({
		bookSlug: formData.get("bookSlug"),
		documentSlug: formData.get("documentSlug"),
	});

	if (!parsed.success) {
		return Response.json({ error: "Invalid input" }, { status: 400 });
	}

	const file = formData.get("file");
	if (!(file instanceof File)) {
		return Response.json({ error: "Missing file" }, { status: 400 });
	}

	const format = resolveDocumentFormat(file);
	if (!format) {
		return Response.json(
			{ error: `Only ${DOCUMENT_FORMATS_LABEL} files are allowed.` },
			{ status: 400 },
		);
	}

	if (file.size > MAX_DOCUMENT_BYTES) {
		return Response.json(
			{ error: "The file must be 10 MB or smaller." },
			{ status: 400 },
		);
	}

	const buffer = Buffer.from(await file.arrayBuffer());

	try {
		const result = await replaceDocumentFile(
			{
				bookSlug: parsed.data.bookSlug,
				documentSlug: parsed.data.documentSlug,
				buffer,
				contentType: DOCUMENT_FORMATS[format].mime,
				contentLength: buffer.length,
			},
			session,
			context.db,
			context,
		);

		return Response.json(result);
	} catch (error) {
		if (error instanceof ORPCError) {
			const status =
				error.code === "UNAUTHORIZED"
					? 401
					: error.code === "FORBIDDEN"
						? 403
						: error.code === "NOT_FOUND"
							? 404
							: 400;
			return Response.json({ error: error.message }, { status });
		}
		const message =
			error instanceof Error ? error.message : "Could not replace document.";
		return Response.json({ error: message }, { status: 400 });
	}
}
