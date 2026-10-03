import type { IsrRevalidator } from "@bbrc/api/isr-revalidation";
import {
	bookDetailIsrPath,
	postDetailIsrPath,
	sittingDetailIsrPath,
	sittingVoteIsrPath,
	userProfileIsrPath,
	userShelfDetailIsrPath,
	userShelvesListIsrPath,
} from "@bbrc/shared";
import { revalidatePath } from "next/cache";

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
			revalidatePath("/feed");
			revalidatePath("/feed/posts");
			revalidatePath("/feed/books");
		},
	};
}
