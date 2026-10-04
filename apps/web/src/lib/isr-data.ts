import { getBookBySlug } from "@bbrc/api/modules/book/book.service";
import { listApprovedDocumentsByBook } from "@bbrc/api/modules/document/document.service";
import { getBookFeedbackList } from "@bbrc/api/modules/feedback/feedback.service";
import { getPostBySlug } from "@bbrc/api/modules/post/post.service";
import { getRpChart, getRpEventList } from "@bbrc/api/modules/rp/rp.service";
import { getShelfBySlug } from "@bbrc/api/modules/shelf/shelf.service";
import {
	getOngoingSitting,
	getSittingBySlug,
} from "@bbrc/api/modules/sitting/sitting.service";
import { getUserByUsername } from "@bbrc/api/modules/user/user.service";
import { getXpChart, getXpEventList } from "@bbrc/api/modules/xp/xp.service";
import { cache } from "react";
import { db } from "@/services";

/**
 * Data loaders for ISR/static detail routes.
 * Call API services directly — do not use the oRPC client here (it reads
 * `headers()` and breaks `revalidate` / `generateStaticParams` pages).
 */
const anonymousSession = null;

export const loadBookBySlugForIsr = cache((slug: string) =>
	getBookBySlug(slug, db),
);

export const loadBookFeedbackListForIsr = cache((slug: string) =>
	getBookFeedbackList({ bookSlug: slug }, db, anonymousSession),
);

export const loadApprovedDocumentsForIsr = cache((slug: string) =>
	listApprovedDocumentsByBook(slug, db),
);

export const loadPostBySlugForIsr = cache((slug: string) =>
	getPostBySlug(slug, db, anonymousSession),
);

export const loadSittingBySlugForIsr = cache((slug: string) =>
	getSittingBySlug(slug, db, anonymousSession),
);

export const loadUserByUsernameForIsr = cache((username: string) =>
	getUserByUsername({ username }, db),
);

export const loadShelfBySlugForIsr = cache(
	(username: string, shelfSlug: string, viewerUserId?: string) =>
		getShelfBySlug(username, shelfSlug, viewerUserId, db),
);

export const loadOngoingSittingForIsr = cache(() => getOngoingSitting(db));

export const loadRpChartForIsr = cache((username: string) =>
	getRpChart({ username }, db),
);

export const loadRpEventListForIsr = cache((username: string) =>
	getRpEventList({ username, limit: 20 }, db),
);

export const loadXpChartForIsr = cache((username: string) =>
	getXpChart({ username }, db),
);

export const loadXpEventListForIsr = cache((username: string) =>
	getXpEventList({ username, limit: 20 }, db),
);
