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
};

const coverClassName =
	"relative block aspect-2/3 w-20 shrink-0 snap-start overflow-hidden bg-muted ring-1 ring-foreground/10 transition-opacity hover:opacity-90 sm:w-24";

/** A titled, horizontally scrolling row of book covers. */
export function MemberProfileBookPanel({
	title,
	viewAllHref,
	viewAllLabel = "View all",
	items,
	isPending = false,
	isError = false,
}: MemberProfileBookPanelProps) {
	if (!isPending && (isError || items.length === 0)) {
		return null;
	}

	return (
		<section className="flex min-w-0 flex-col gap-3">
			<div className="flex items-center justify-between gap-3">
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
			<ul className="-mx-6 flex snap-x gap-3 overflow-x-auto px-6 pb-1 md:mx-0 md:px-0">
				{isPending
					? Array.from({ length: 4 }, (_, i) => (
							<li key={i}>
								<Skeleton className={coverClassName} />
							</li>
						))
					: items.map((item) => {
							const coverSrc = bookCoverUrl(item.coverId);

							return (
								<li key={item.id} className="shrink-0">
									<Tooltip>
										<TooltipTrigger
											render={
												<Link
													href={`/books/${item.slug}` as Route}
													className={coverClassName}
													aria-label={item.title}
												>
													{coverSrc ? (
														<Image
															src={coverSrc}
															alt=""
															fill
															className="object-cover"
															sizes="96px"
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
