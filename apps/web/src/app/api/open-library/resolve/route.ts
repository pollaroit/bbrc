import { OPEN_LIBRARY_ORIGIN } from "@bbrc/api/lib/open-library/constants";
import {
	openLibraryBookJsonUrl,
	openLibraryFetchDocumentJson,
} from "@bbrc/api/lib/open-library/fetch";
import { openLibraryErrorResponse } from "@bbrc/api/lib/open-library/http-response";
import {
	isValidIsbn,
	normalizeIsbn,
	openLibraryEditionKeyToOlid,
	openLibraryWorkKeyToOlid,
} from "@bbrc/shared";
import { withOpenLibraryGuard } from "@/lib/open-library/guard";

type EditionDocument = { works?: { key?: string }[] };

/**
 * Turns an ISBN or an edition id into the id of its work, so a pasted ISBN or
 * edition link can jump straight to the book. `{ olid: null }` means no match.
 */
export async function GET(request: Request) {
	const params = new URL(request.url).searchParams;
	const kind = params.get("kind");
	const value = params.get("value")?.trim() ?? "";

	let url: string | null = null;
	if (kind === "isbn" && isValidIsbn(value)) {
		url = `${OPEN_LIBRARY_ORIGIN}/isbn/${normalizeIsbn(value)}.json`;
	} else if (kind === "edition") {
		const editionOlid = openLibraryEditionKeyToOlid(value);
		if (editionOlid) url = openLibraryBookJsonUrl(editionOlid);
	}
	if (!url) {
		return Response.json(
			{ olid: null, error: "Invalid lookup" },
			{ status: 400 },
		);
	}

	return withOpenLibraryGuard(
		request,
		`ol:resolve:${kind}:${value}`,
		async () => {
			try {
				const document =
					await openLibraryFetchDocumentJson<EditionDocument>(url);
				const key = document?.works?.[0]?.key;
				const olid = key ? openLibraryWorkKeyToOlid(key) : null;
				return Response.json({ olid });
			} catch (error) {
				return openLibraryErrorResponse(error, { olid: null });
			}
		},
	);
}
