"use client";

import type { AuthorAboutOutput } from "@bbrc/api/modules/author/author.schema";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { orpc } from "@/utils/orpc";
import { useAuthorViewer } from "./author-page-viewer";

const MISSING_LABEL: Record<AuthorAboutOutput["missing"][number], string> = {
	bio: "a biography",
	birth: "the birth date",
	death: "the death date",
	places: "places",
	nationality: "the nationality",
	gender: "the gender",
	photo: "a photo",
	links: "links",
};

/** Admin-only notes under the sources: locked fields and what is still missing. */
export function AuthorPageAboutAdminNotes({ slug }: { slug: string }) {
	const viewer = useAuthorViewer(slug);
	const isAdmin = viewer?.viewer.isAdmin === true;
	const { data } = useQuery({
		...orpc.author.about.queryOptions({ input: { slug } }),
		enabled: isAdmin,
	});

	if (!isAdmin || !data) {
		return null;
	}

	const locked = data.sources.filter((entry) => entry.locked);

	return (
		<div className="flex flex-col gap-1 border border-border border-dashed p-3 text-muted-foreground text-xs">
			<p className="font-medium text-foreground">Admin notes</p>
			{locked.length > 0 ? (
				<p className="flex flex-wrap items-center gap-1.5">
					<Lock className="size-3.5" aria-hidden />
					Locked against automatic updates:{" "}
					{locked.map((entry) => entry.label).join(", ")}.
				</p>
			) : (
				<p>No locked fields.</p>
			)}
			{data.missing.length > 0 ? (
				<p>
					Still missing: {data.missing.map((m) => MISSING_LABEL[m]).join(", ")}.
				</p>
			) : null}
		</div>
	);
}
