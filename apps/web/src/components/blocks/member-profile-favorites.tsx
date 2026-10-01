"use client";

import { Skeleton } from "@bbrc/ui/components/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { bookCoverUrl } from "@/lib/book-cover";
import { orpc } from "@/utils/orpc";

type MemberProfileFavoritesProps = {
	username: string;
};

export function MemberProfileFavorites({
	username,
}: MemberProfileFavoritesProps) {
	const { data, isPending, isError } = useQuery(
		orpc.favorite.getUserFavorites.queryOptions({
			input: { username },
		}),
	);

	if (isPending) {
		return (
			<section aria-labelledby="member-favorites-heading">
				<h2 id="member-favorites-heading" className="mb-3 font-medium text-sm">
					Favorite books
				</h2>
				<div className="flex gap-2">
					{Array.from({ length: 4 }, (_, i) => (
						<Skeleton key={i} className="size-16 shrink-0" />
					))}
				</div>
			</section>
		);
	}

	if (isError || !data?.length) {
		return null;
	}

	return (
		<section aria-labelledby="member-favorites-heading">
			<h2 id="member-favorites-heading" className="mb-3 font-medium text-sm">
				Favorite books
			</h2>
			<ul className="flex flex-wrap gap-2">
				{data.map((item) => {
					const href = `/books/${item.book.slug}` as Route;
					const coverSrc = bookCoverUrl(item.book.coverId);

					return (
						<li key={item.id}>
							<Tooltip>
								<TooltipTrigger
									render={
										<Link
											href={href}
											className="relative block size-16 overflow-hidden bg-muted ring-1 ring-foreground/10 transition-opacity hover:opacity-90"
										>
											{coverSrc ? (
												<Image
													src={coverSrc}
													alt=""
													fill
													className="object-cover"
													sizes="64px"
												/>
											) : (
												<span className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
													No cover
												</span>
											)}
										</Link>
									}
								/>
								<TooltipContent side="bottom">
									<p className="max-w-[14rem] font-medium text-sm">
										{item.book.title}
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
