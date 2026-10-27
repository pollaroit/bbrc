import { useTranslations } from "next-intl";

/*
 * The names of enum and status values, in the page's language. The identifiers stay in code;
 * the words come from the `labels` messages. No "use client": these work in client components
 * and in (non-async) server components alike.
 */

export type ProgressValue = "not_started" | "in_progress" | "completed" | "dnf";
export type SittingStatusValue = "voting" | "reading" | "finished";
export type BookStatusValue = "completed" | "reading" | "wishlist";

/** `{ not_started: "Not started", ... }` for a member's progress in a sitting. */
export function useProgressLabels(): Record<ProgressValue, string> {
	const t = useTranslations("labels.progress");
	return {
		not_started: t("not_started"),
		in_progress: t("in_progress"),
		completed: t("completed"),
		dnf: t("dnf"),
	};
}

export function useSittingStatusLabels(): Record<SittingStatusValue, string> {
	const t = useTranslations("labels.sittingStatus");
	return {
		voting: t("voting"),
		reading: t("reading"),
		finished: t("finished"),
	};
}

/** The name and the one-line description of each book status. */
export function useBookStatusLabels(): {
	label: Record<BookStatusValue, string>;
	description: Record<BookStatusValue, string>;
} {
	const t = useTranslations("labels.bookStatus");
	return {
		label: {
			completed: t("completed"),
			reading: t("reading"),
			wishlist: t("wishlist"),
		},
		description: {
			completed: t("description.completed"),
			reading: t("description.reading"),
			wishlist: t("description.wishlist"),
		},
	};
}
