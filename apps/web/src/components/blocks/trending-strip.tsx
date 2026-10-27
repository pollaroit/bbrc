"use client";

import { useQuery } from "@tanstack/react-query";
import { Eye, Flame } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { bookCoverUrl } from "@/lib/book-cover";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type TrendingStripProps = {
	resource: "post" | "book";
	className?: string;
};

function Views({ count }: { count: number }) {
	return (
		<span className="inline-flex items-center gap-1 text-muted-foreground text-xs tabular-nums">
			<Eye className="size-3.5" aria-hidden />
			{count.toLocaleString("en-US")} {count === 1 ? "view" : "views"}
		</span>
	);
}

/**
 * The most opened books or posts of the week. It renders nothing until there is
 * something to show, so quiet weeks leave no gap on the page.
 */
export function TrendingStrip({ resource, className }: TrendingStripProps) {
	const { data } = useQuery(
		orpc.view.trending.queryOptions({
			input: { resource, days: 7, limit: 8 },
			staleTime: 5 * 60 * 1000,
		}),
	);
	const items = data?.items ?? [];
	if (items.length === 0) return null;

	return (
		<section
			aria-labelledby={`trending-${resource}`}
			className={cn("flex flex-col gap-2.5", className)}
		>
			<h2
				id={`trending-${resource}`}
				className="flex items-center gap-2 font-medium text-sm"
			>
				<Flame className="size-4 text-warning-ink" aria-hidden />
				Most viewed this week
			</h2>
			{/* `relative` keeps the screen-reader-only text (absolutely positioned) inside the scroller, so it cannot widen the page. */}
			<ul className="relative -mx-6 flex snap-x gap-3 overflow-x-auto px-6 pb-1 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
				{items.map((item, index) => {
					const cover =
						resource === "book" ? bookCoverUrl(item.coverId, "S") : null;
					return (
						<li key={item.ref} className="shrink-0 snap-start">
							<Link
								href={item.href as Route}
								className={cn(
									"flex h-full items-start gap-3 border border-border p-3 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring",
									resource === "book" ? "w-64" : "w-60",
								)}
							>
								{resource === "book" ? (
									<span className="relative block aspect-2/3 w-10 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
										{cover ? (
											<Image
												src={cover}
												alt=""
												fill
												className="object-cover"
												sizes="40px"
											/>
										) : null}
									</span>
								) : null}
								<span className="flex min-w-0 flex-1 flex-col gap-1">
									<span className="line-clamp-2 font-medium text-sm leading-snug">
										<span className="sr-only">Number {index + 1}: </span>
										{item.title}
									</span>
									{item.subtitle ? (
										<span className="truncate text-muted-foreground text-xs">
											{item.subtitle}
										</span>
									) : null}
									<Views count={item.views} />
								</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
