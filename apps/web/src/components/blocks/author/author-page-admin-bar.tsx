"use client";

import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { Pencil } from "lucide-react";
import type { Route } from "next";
import { Link } from "@/i18n/navigation";
import { useAuthorViewer } from "./author-page-viewer";

/** Admin-only: the edit link and how trustworthy the details are. Nothing renders for anyone else. */
export function AuthorPageAdminBar({ slug }: { slug: string }) {
	const data = useAuthorViewer(slug);

	if (!data?.viewer.isAdmin) {
		return null;
	}

	const status = data.profile.admin?.status;

	return (
		<>
			{status === "needs_review" ? (
				<Badge variant="outline" className="border-warning/40 text-warning-ink">
					Needs review
				</Badge>
			) : status === "auto" ? (
				<Badge variant="outline" className="border-info/40 text-info-ink">
					Auto-filled
				</Badge>
			) : null}
			<Button
				variant="outline"
				size="sm"
				nativeButton={false}
				render={<Link href={`/authors/${slug}/edit` as Route} />}
			>
				<Pencil className="size-3.5" aria-hidden />
				Edit
			</Button>
		</>
	);
}
