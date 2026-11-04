import { getSittingBySlug } from "@bbrc/api/modules/sitting/sitting.service";
import { cache } from "react";
import { getRequestViewer } from "@/lib/request-viewer";
import { db } from "@/services";

/** Sitting pages are per viewer: private sittings must not be ISR-cached anonymously. */
export const loadSittingBySlugForRequest = cache((slug: string) =>
	getRequestViewer().then((viewer) => getSittingBySlug(slug, viewer, db)),
);
