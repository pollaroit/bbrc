"use client";

import { subjectNameToSlug } from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

const SUBJECT_PREVIEW_LIMIT = 10;

type BookSubjectGroupProps = {
	label: string;
	items: string[];
	/** When true, each badge links to the books catalog filtered by that subject. */
	linkable?: boolean;
};

function SubjectBadge({ item, linkable }: { item: string; linkable: boolean }) {
	const badge = (
		<Badge variant="secondary" className="font-normal">
			{item}
		</Badge>
	);

	if (!linkable) {
		return badge;
	}

	const slug = subjectNameToSlug(item);
	const href = `/books?subjects=${encodeURIComponent(slug)}` as Route;

	return (
		<Link
			href={href}
			className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
		>
			{badge}
		</Link>
	);
}

function SubjectBadgeList({
	items,
	linkable,
}: {
	items: string[];
	linkable: boolean;
}) {
	return (
		<ul className="flex flex-wrap gap-1.5">
			{items.map((item) => (
				<li key={item}>
					<SubjectBadge item={item} linkable={linkable} />
				</li>
			))}
		</ul>
	);
}

export function BookSubjectGroup({
	label,
	items,
	linkable = false,
}: BookSubjectGroupProps) {
	const [dialogOpen, setDialogOpen] = useState(false);

	if (items.length === 0) {
		return null;
	}

	const preview = items.slice(0, SUBJECT_PREVIEW_LIMIT);
	const hiddenCount = items.length - preview.length;

	return (
		<>
			<div className="space-y-2">
				<h3 className="font-medium text-sm">{label}</h3>
				<ul className="flex flex-wrap gap-1.5">
					{preview.map((item) => (
						<li key={item}>
							<SubjectBadge item={item} linkable={linkable} />
						</li>
					))}
					{hiddenCount > 0 ? (
						<li>
							<button
								type="button"
								className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								onClick={() => setDialogOpen(true)}
							>
								<Badge variant="outline" className="font-normal tabular-nums">
									+{hiddenCount} more
								</Badge>
							</button>
						</li>
					) : null}
				</ul>
			</div>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="flex max-h-[min(85vh,560px)] max-w-lg flex-col gap-4">
					<DialogHeader>
						<DialogTitle>{label}</DialogTitle>
					</DialogHeader>
					<div className="-mx-1 overflow-y-auto px-1">
						<SubjectBadgeList items={items} linkable={linkable} />
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
