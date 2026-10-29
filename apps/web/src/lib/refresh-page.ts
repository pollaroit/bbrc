import type { useRouter } from "next/navigation";
import { queryClient } from "@/utils/orpc";

/** Scrolls the page to the top (instantly when the member prefers less motion). */
export function scrollPageToTop() {
	const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
}

/** Whether the page is already at (or within a couple of pixels of) the top. */
export function pageIsAtTop() {
	return window.scrollY <= 2;
}

/**
 * Reloads what the page shows without a full browser reload, which is what an
 * installed app needs: the server-rendered parts, and every list or count the
 * screen has loaded in the browser. Resolves when the lists have refetched.
 */
export async function refreshPage(router: ReturnType<typeof useRouter>) {
	router.refresh();
	await queryClient.invalidateQueries({ refetchType: "active" });
}
