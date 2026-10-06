"use client";

import { openLibraryWorkKeyToOlid } from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Card, CardContent } from "@bbrc/ui/components/card";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import Image from "next/image";
import type { OpenLibrarySearchWork } from "@/lib/open-library/types";
import { cn } from "@/lib/utils";

function coverUrl(coverId: number | null) {
	if (coverId == null) {
		return null;
	}

	return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
}

function formatAuthors(authors: string[]) {
	if (authors.length === 0) {
		return "Unknown author";
	}

	return authors.join(", ");
}

type OpenLibraryWorkResultsProps = {
	works: OpenLibrarySearchWork[];
	selectedWorkKey: string | null;
	onSelect: (work: OpenLibrarySearchWork) => void;
	/** Work OLIDs already in the club catalog — rows are disabled with an Added badge. */
	inCatalogOlids?: ReadonlySet<string>;
	isLoading?: boolean;
	className?: string;
};

export function OpenLibraryWorkResults({
	works,
	selectedWorkKey,
	onSelect,
	inCatalogOlids,
	isLoading = false,
	className,
}: OpenLibraryWorkResultsProps) {
	if (isLoading) {
		return (
			<div className={cn("flex flex-col gap-2", className)}>
				{Array.from({ length: 4 }, (_, index) => (
					<Skeleton key={index} className="h-24 w-full" />
				))}
			</div>
		);
	}

	if (works.length === 0) {
		return (
			<p className={cn("text-muted-foreground text-sm", className)}>
				No Open Library works match your search.
			</p>
		);
	}

	return (
		<ul className={cn("flex flex-col gap-2", className)}>
			{works.map((work) => {
				const isSelected = work.workKey === selectedWorkKey;
				const src = coverUrl(work.coverId);
				const olid = openLibraryWorkKeyToOlid(work.workKey);
				const inCatalog = olid != null && (inCatalogOlids?.has(olid) ?? false);

				return (
					<li key={work.workKey}>
						<button
							type="button"
							disabled={inCatalog}
							onClick={() => {
								if (inCatalog) {
									return;
								}
								onSelect(work);
							}}
							className={cn(
								"w-full text-left",
								inCatalog && "cursor-not-allowed",
							)}
						>
							<Card
								size="sm"
								className={cn(
									"transition-colors",
									!inCatalog && "hover:bg-muted/40",
									isSelected && "ring-2 ring-ring",
									inCatalog && "opacity-60",
								)}
							>
								<CardContent className="flex gap-3">
									<div className="relative aspect-2/3 w-14 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
										{src ? (
											<Image
												src={src}
												alt=""
												fill
												className="object-cover"
												sizes="56px"
											/>
										) : (
											<div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
												No cover
											</div>
										)}
									</div>
									<div className="min-w-0 flex-1 space-y-1">
										<div className="flex flex-wrap items-start gap-2">
											{inCatalog ? (
												<Badge variant="destructive">Added</Badge>
											) : null}
											<p className="line-clamp-2 min-w-0 flex-1 font-medium text-sm leading-snug">
												{work.title}
											</p>
										</div>
										<p className="truncate text-muted-foreground text-xs">
											{formatAuthors(work.authors)}
											{work.publishedIn != null
												? ` · ${work.publishedIn}`
												: null}
										</p>
										{work.description ? (
											<p className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">
												{work.description}
											</p>
										) : null}
									</div>
								</CardContent>
							</Card>
						</button>
					</li>
				);
			})}
		</ul>
	);
}
