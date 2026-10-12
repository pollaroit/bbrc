"use client";

import { Skeleton } from "@bbrc/ui/components/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { bookCoverUrl } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

export type MemberProfileBookPanelItem = {
	id: string;
	title: string;
	slug: string;
	coverId?: number | null;
};

type MemberProfileBookPanelProps = {
	title: string;
	viewAllHref?: Route;
	viewAllLabel?: string;
	items: MemberProfileBookPanelItem[];
	isPending?: boolean;
	isError?: boolean;
	/** Sits inside the profile stat grid (no outer border). */
	embedded?: boolean;
};

const coverClassName =
	"relative block aspect-2/3 w-[4.75rem] overflow-hidden bg-muted ring-1 ring-foreground/10 transition-opacity hover:opacity-90 sm:w-[5.25rem]";

function panelShellClassName(embedded: boolean) {
	return cn(
		embedded ? "min-h-0" : "border border-border bg-muted/10 p-4 sm:p-5",
	);
}

export function MemberProfileBookPanel({
	title,
	viewAllHref,
	viewAllLabel = "View all",
	items,
	isPending = false,
	isError = false,
	embedded = false,
}: MemberProfileBookPanelProps) {
	if (isPending) {
		return (
			<section className={panelShellClassName(embedded)}>
				<div className="mb-4 flex items-center justify-between gap-3">
					<Skeleton className="h-5 w-32" />
				</div>
				<div className="flex flex-wrap gap-3">
					{Array.from({ length: 4 }, (_, i) => (
						<Skeleton key={i} className={coverClassName} />
					))}
				</div>
			</section>
		);
	}

	if (isError || items.length === 0) {
		return null;
	}

	const displayItems = items.slice(0, 4);

	return (
		<section className={panelShellClassName(embedded)}>
			<div className="mb-4 flex items-center justify-between gap-3">
				<h2 className="font-medium text-base tracking-tight">{title}</h2>
				{viewAllHref ? (
					<Link
						href={viewAllHref}
						className="text-muted-foreground text-sm transition-colors hover:text-foreground"
					>
						{viewAllLabel}
					</Link>
				) : null}
			</div>
			<ul
				className={cn(
					"flex flex-wrap gap-3 sm:gap-4",
					embedded && "justify-center sm:justify-start",
				)}
			>
				{displayItems.map((item) => {
					const href = `/books/${item.slug}` as Route;
					const coverSrc = bookCoverUrl(item.coverId);

					return (
						<li key={item.id}>
							<Tooltip>
								<TooltipTrigger
									render={
										<Link href={href} className={coverClassName}>
											{coverSrc ? (
												<Image
													src={coverSrc}
													alt=""
													fill
													className="object-cover"
													sizes="(max-width: 640px) 76px, 84px"
												/>
											) : (
												<span className="flex size-full items-center justify-center px-1 text-center text-[10px] text-muted-foreground">
													No cover
												</span>
											)}
										</Link>
									}
								/>
								<TooltipContent side="bottom">
									<p className="max-w-[14rem] font-medium text-sm">
										{item.title}
									</p>
								</TooltipContent>
							</Tooltip>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
