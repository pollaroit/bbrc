import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BookStatusBadge } from "@/components/blocks/book-status-badge";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

type SittingReadingBookProps = {
	book: NonNullable<GetSittingBySlugOutput["selectedBook"]>;
	heading?: string;
	variant?: "compact" | "hero";
	footer?: ReactNode;
};

export function SittingReadingBook({
	book,
	heading = "Club read",
	variant = "compact",
	footer,
}: SittingReadingBookProps) {
	const href = `/books/${book.slug}` as Route;
	const coverSrc = bookCoverUrl(book.coverId, variant === "hero" ? "L" : "M");
	const isHero = variant === "hero";

	return (
		<Card className={cn(isHero && "overflow-hidden")}>
			<CardHeader className={cn(isHero && "border-border border-b pb-4")}>
				<CardTitle className={cn(isHero ? "text-lg" : "text-base")}>
					{heading}
				</CardTitle>
			</CardHeader>
			<CardContent className={cn(isHero && "p-6 sm:p-8")}>
				<div
					className={cn(
						"flex gap-6",
						isHero ? "flex-col sm:flex-row sm:items-start" : "items-stretch",
					)}
				>
					<Link
						href={href}
						className={cn("shrink-0", isHero ? "mx-auto sm:mx-0" : "")}
					>
						<div
							className={cn(
								"relative aspect-2/3 overflow-hidden bg-muted ring-1 ring-foreground/10",
								isHero ? "w-40 sm:w-48 lg:w-56" : "w-19",
							)}
						>
							{coverSrc ? (
								<Image
									src={coverSrc}
									alt=""
									fill
									className="object-cover"
									sizes={isHero ? "224px" : "80px"}
									priority={isHero}
								/>
							) : (
								<div className="flex size-full items-center justify-center text-muted-foreground text-xs">
									No cover
								</div>
							)}
						</div>
					</Link>

					<div
						className={cn(
							"flex min-w-0 flex-1 flex-col gap-4",
							isHero && "text-center sm:text-left",
						)}
					>
						<Link href={href} className="group flex flex-col gap-2">
							<p
								className={cn(
									"line-clamp-3 font-medium leading-snug group-hover:underline",
									isHero ? "text-xl sm:text-2xl" : "text-sm",
								)}
							>
								{book.title}
							</p>
							<p
								className={cn(
									"text-muted-foreground",
									isHero ? "text-sm" : "text-xs",
								)}
							>
								{formatBookAuthors(book.authors)}
							</p>
						</Link>

						<div
							className={cn(
								"flex flex-wrap items-center gap-2",
								isHero
									? "justify-center sm:justify-start"
									: "mt-auto justify-between",
							)}
						>
							<BookStatusBadge status={book.status} />
							<p
								className={cn(
									"text-muted-foreground tabular-nums",
									isHero ? "text-sm" : "text-xs",
								)}
							>
								{book.openLibraryRating != null
									? `${book.openLibraryRating.toFixed(1)} OL`
									: "— OL"}{" "}
								· {book.pages} pp
							</p>
						</div>

						{footer ? (
							<div
								className={cn(
									"flex flex-col gap-3 border-border border-t pt-4",
									isHero && "items-center sm:items-start",
								)}
							>
								{footer}
							</div>
						) : null}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
