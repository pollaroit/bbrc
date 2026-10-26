"use client";

import { Progress } from "@bbrc/ui/components/progress";
import { useAuthorViewer } from "./author-page-viewer";

/** "You have read 3 of 8": only for a signed-in member, and only once there is something to show. */
export function AuthorPageProgress({ slug }: { slug: string }) {
	const data = useAuthorViewer(slug);
	if (!data?.viewer.isSignedIn || data.viewer.totalBooks === 0) {
		return null;
	}
	const { read, total, percent } = data.viewer.progress;

	return (
		<div className="flex flex-col gap-2 border border-border p-3">
			<p className="text-sm">
				{read === 0
					? `You have not read any of the ${total} ${total === 1 ? "book" : "books"} by this author yet.`
					: read === total
						? `You have read all ${total} ${total === 1 ? "book" : "books"} by this author.`
						: `You have read ${read} of ${total} books by this author.`}
			</p>
			<Progress value={percent} aria-label="Your reading progress" />
		</div>
	);
}
