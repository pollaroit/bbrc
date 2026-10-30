import { AuthorBooksInputSchema } from "@bbrc/api/modules/author/author.schema";
import { getAuthorBooks } from "@bbrc/api/modules/author/author-books.service";
import {
	getAuthor,
	getAuthorAbout,
} from "@bbrc/api/modules/author/author-directory.service";
import {
	getAuthorMore,
	getAuthorStats,
} from "@bbrc/api/modules/author/author-tabs.service";
import { getBookBySlug } from "@bbrc/api/modules/book/book.service";
import { getBookCatalogDiscovery } from "@bbrc/api/modules/book/book-catalog-discovery.service";
import {
	countBookSittings,
	getBookSittings,
} from "@bbrc/api/modules/book/book-sittings.service";
import { getBookStats } from "@bbrc/api/modules/book/book-stats.service";
import { listApprovedDocumentsByBook } from "@bbrc/api/modules/document/document.service";
import { listBookFavorites } from "@bbrc/api/modules/favorite/favorite.service";
import { getBookFeedbackList } from "@bbrc/api/modules/feedback/feedback.service";
import { getPostBySlug } from "@bbrc/api/modules/post/post.service";
import { listBookReads } from "@bbrc/api/modules/read/read.service";
import { getRpChart, getRpEventList } from "@bbrc/api/modules/rp/rp.service";
import { getSeriesBySlug } from "@bbrc/api/modules/series/series.service";
import {
	getShelfBySlug,
	listShelvesForBook,
} from "@bbrc/api/modules/shelf/shelf.service";
import {
	getOngoingSitting,
	getSittingBySlug,
} from "@bbrc/api/modules/sitting/sitting.service";
import { getUserByUsername } from "@bbrc/api/modules/user/user.service";
import { getXpChart, getXpEventList } from "@bbrc/api/modules/xp/xp.service";
import { ANONYMOUS_VIEWER } from "@bbrc/shared";
import { cache } from "react";
import { db } from "@/services";

/**
 * Data loaders for ISR/static detail routes.
 * Call API services directly — do not use the oRPC client here (it reads
 * `headers()` and breaks `revalidate` / `generateStaticParams` pages).
 */
/** Cached pages are built for an anonymous visitor: friends-only extras load per viewer after the page opens. */
const anonymousSession = ANONYMOUS_VIEWER;

export const loadAuthorForIsr = cache((slug: string) =>
	getAuthor(slug, db, anonymousSession),
);

export const loadAuthorAboutForIsr = cache((slug: string) =>
	getAuthorAbout(slug, db, anonymousSession),
);

export const loadAuthorMoreForIsr = cache((slug: string) =>
	getAuthorMore(slug, db, anonymousSession),
);

export const loadAuthorStatsForIsr = cache((slug: string) =>
	getAuthorStats(slug, db, anonymousSession),
);

/** The author's best known books (most read first) for the overview and the timeline. */
export const loadAuthorTopBooksForIsr = cache((slug: string) =>
	getAuthorBooks(
		AuthorBooksInputSchema.parse({
			slug,
			limit: 100,
			sortBy: "publishedIn",
			sortDirection: "asc",
		}),
		db,
		anonymousSession,
	),
);

export const loadBookBySlugForIsr = cache((slug: string) =>
	getBookBySlug(slug, db),
);

export const loadBookCatalogDiscoveryForIsr = cache((slug: string) =>
	getBookCatalogDiscovery(slug, db),
);

export const loadBookFeedbackListForIsr = cache((slug: string) =>
	getBookFeedbackList({ bookSlug: slug }, db, anonymousSession),
);

export const loadApprovedDocumentsForIsr = cache((slug: string) =>
	listApprovedDocumentsByBook(slug, db),
);

export const loadBookReadsForIsr = cache((slug: string) =>
	listBookReads({ bookSlug: slug }, db, anonymousSession),
);

export const loadBookSittingsForIsr = cache((slug: string) =>
	getBookSittings(slug, db),
);

export const loadBookSittingCountForIsr = cache((slug: string) =>
	countBookSittings(slug, db),
);

export const loadBookStatsForIsr = cache((slug: string) =>
	getBookStats(slug, db, anonymousSession),
);

export const loadBookFavoritesForIsr = cache((slug: string) =>
	listBookFavorites({ bookSlug: slug }, db, anonymousSession),
);

export const loadBookShelvesForIsr = cache((slug: string) =>
	listShelvesForBook(slug, anonymousSession, db),
);

export const loadSeriesBySlugForIsr = cache((slug: string) =>
	getSeriesBySlug(slug, db),
);

export const loadPostBySlugForIsr = cache((slug: string) =>
	getPostBySlug(slug, db, anonymousSession),
);

export const loadSittingBySlugForIsr = cache((slug: string) =>
	getSittingBySlug(slug, anonymousSession, db),
);

export const loadUserByUsernameForIsr = cache((username: string) =>
	getUserByUsername({ username }, db, anonymousSession),
);

export const loadShelfBySlugForIsr = cache(
	(username: string, shelfSlug: string) =>
		getShelfBySlug(username, shelfSlug, anonymousSession, db),
);

export const loadOngoingSittingForIsr = cache(() => getOngoingSitting(db));

export const loadRpChartForIsr = cache((username: string) =>
	getRpChart({ username }, db, anonymousSession),
);

export const loadRpEventListForIsr = cache((username: string) =>
	getRpEventList({ username, limit: 20 }, db, anonymousSession),
);

export const loadXpChartForIsr = cache((username: string) =>
	getXpChart({ username }, db, anonymousSession),
);

export const loadXpEventListForIsr = cache((username: string) =>
	getXpEventList({ username, limit: 20 }, db, anonymousSession),
);
