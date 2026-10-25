import { editionRouter } from "@bbrc/api/modules/edition/edition.router";
import type { EditionLookup } from "@bbrc/api/modules/edition/edition.schema";
import { call } from "@orpc/server";
import { cache } from "react";
import { db } from "@/services";

/**
 * The edition page's data for ISR/static rendering. It calls the `edition.get`
 * procedure directly with an anonymous context (like the other `*ForIsr` loaders,
 * it must not use the HTTP client, which reads `headers()`), so the answer is the
 * public, cacheable part: no names, nothing about the viewer.
 */
export const loadEditionLookupForIsr = cache(
	(bookSlug: string, key: string): Promise<EditionLookup> =>
		call(
			editionRouter.get,
			{ bookSlug, key },
			{ context: { session: null, db } },
		),
);
