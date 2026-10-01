"use client";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
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
			<div className="mx-auto w-full max-w-lg">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Favorite books</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex justify-center gap-3">
							{Array.from({ length: 4 }, (_, i) => (
								<Skeleton
									key={i}
									className="aspect-2/3 w-[4.75rem] shrink-0 sm:w-[5.5rem]"
								/>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (isError || !data?.length) {
		return null;
	}

	return (
		<div className="mx-auto w-full max-w-lg">
			<Card size="sm">
				<CardHeader className="text-center">
					<CardTitle>Favorite books</CardTitle>
				</CardHeader>
				<CardContent>
					<ul className="flex flex-wrap items-end justify-center gap-3 sm:gap-4">
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
													className="relative block aspect-2/3 w-[4.75rem] overflow-hidden bg-muted ring-1 ring-foreground/10 transition-opacity hover:opacity-90 sm:w-[5.5rem]"
												>
													{coverSrc ? (
														<Image
															src={coverSrc}
															alt=""
															fill
															className="object-cover"
															sizes="(max-width: 640px) 76px, 88px"
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
												{item.book.title}
											</p>
										</TooltipContent>
									</Tooltip>
								</li>
							);
						})}
					</ul>
				</CardContent>
			</Card>
		</div>
	);
}
