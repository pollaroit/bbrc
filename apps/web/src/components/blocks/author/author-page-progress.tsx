"use client";

import { Progress } from "@bbrc/ui/components/progress";
import { useTranslations } from "next-intl";
import { useAuthorViewer } from "./author-page-viewer";

/** "You have read 3 of 8": only for a signed-in member, and only once there is something to show. */
export function AuthorPageProgress({ slug }: { slug: string }) {
	const t = useTranslations("authors");
	const data = useAuthorViewer(slug);
	if (!data?.viewer.isSignedIn || data.viewer.totalBooks === 0) {
		return null;
	}
	const { read, total, percent } = data.viewer.progress;

	return (
		<div className="flex flex-col gap-2 border border-border p-3">
			<p className="text-sm">
				{read === 0
					? t("progress.none", { total })
					: read === total
						? t("progress.all", { total })
						: t("progress.some", { read, total })}
			</p>
			<Progress value={percent} aria-label={t("progress.label")} />
		</div>
	);
}
