import type { IsrRevalidator } from "@bbrc/api/isr-revalidation";
import { cachedPathsForAllLocales } from "@bbrc/i18n";
import {
	authorDetailIsrPath,
	authorsListIsrPath,
	bookDetailIsrPath,
	postDetailIsrPath,
	seriesDetailIsrPath,
	seriesListIsrPath,
	sittingDetailIsrPath,
	sittingVoteIsrPath,
	userProfileIsrPath,
	userShelfDetailIsrPath,
	userShelvesListIsrPath,
} from "@bbrc/shared";
import { revalidatePath as nextRevalidatePath } from "next/cache";

/** Refreshes a page in every language (the English address and each `/az/...` copy). */
function revalidatePath(path: string, type?: "page" | "layout") {
	for (const cached of cachedPathsForAllLocales(path)) {
		if (type) nextRevalidatePath(cached, type);
		else nextRevalidatePath(cached);
	}
}

function revalidatePageAndLayout(path: string) {
	revalidatePath(path);
	revalidatePath(path, "layout");
}

export function createIsrRevalidator(): IsrRevalidator {
	return {
		revalidateBook(slug) {
			revalidatePageAndLayout(bookDetailIsrPath(slug));
		},
		revalidateSitting(slug) {
			revalidatePageAndLayout(sittingDetailIsrPath(slug));
			revalidatePath(sittingVoteIsrPath(slug));
			revalidatePath("/sittings");
			revalidatePath("/");
		},
		revalidatePost(slug) {
			revalidatePageAndLayout(postDetailIsrPath(slug));
		},
		revalidateUser(username) {
			revalidatePageAndLayout(userProfileIsrPath(username));
		},
		revalidateUserShelves(username, shelfSlug) {
			revalidatePageAndLayout(userShelvesListIsrPath(username));
			if (shelfSlug) {
				revalidatePageAndLayout(userShelfDetailIsrPath(username, shelfSlug));
			}
		},
		revalidateHome() {
			revalidatePath("/");
		},
		revalidateFeeds() {
			// Feeds are English only and sit outside the language segment.
			nextRevalidatePath("/feed");
			nextRevalidatePath("/feed/posts");
			nextRevalidatePath("/feed/books");
		},
		revalidateSeries(slug) {
			revalidatePageAndLayout(seriesListIsrPath());
			revalidatePageAndLayout(seriesDetailIsrPath(slug));
		},
		revalidateBooksCatalog() {
			revalidatePath("/books");
		},
		revalidateAuthor(slug) {
			revalidatePageAndLayout(authorDetailIsrPath(slug));
			revalidatePath(authorsListIsrPath());
		},
	};
}
