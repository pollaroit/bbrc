import type { EditionSummary } from "@bbrc/api/modules/edition/edition.schema";
import { Star, Users } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { EditionSourceBadge } from "@/components/blocks/edition-page/edition-hero";
import { EditionSection } from "@/components/blocks/edition-page/section";
import { Link } from "@/i18n/navigation";
import { bookCoverFrameClassName } from "@/lib/book-cover";
import { coverSrc, editionPath, summaryLine } from "@/lib/edition/format";
import { cn } from "@/lib/utils";

/** The book's other editions as a strip of small cards (club favourites first). */
export function EditionOthers({
	bookSlug,
	items,
}: {
	bookSlug: string;
	items: EditionSummary[];
}) {
	if (items.length === 0) return null;

	return (
		<EditionSection
			id="edition-others"
			title="Other editions of this book"
			aside={
				<Link
					href={`/books/${bookSlug}/editions` as Route}
					className="text-sm underline underline-offset-4"
				>
					All editions
				</Link>
			}
		>
			<ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
				{items.map((item) => {
					const thumb = coverSrc(item.cover, "M");
					return (
						<li key={item.key} className="w-44 shrink-0 snap-start">
							<Link
								href={editionPath(bookSlug, item.key) as Route}
								className="flex h-full flex-col gap-2 border border-border bg-card p-3 transition-colors hover:bg-muted/40"
							>
								<span
									className={cn(
										"relative block aspect-2/3 w-full",
										bookCoverFrameClassName,
									)}
								>
									{thumb ? (
										<Image
											src={thumb}
											alt=""
											fill
											className="object-cover"
											sizes="176px"
										/>
									) : (
										<span className="flex size-full items-center justify-center px-2 text-center text-muted-foreground text-xs">
											No cover
										</span>
									)}
								</span>
								<span className="line-clamp-2 font-medium text-sm leading-snug">
									{item.label}
								</span>
								<span className="line-clamp-2 text-muted-foreground text-xs">
									{summaryLine(item)}
								</span>
								<span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1">
									<EditionSourceBadge
										source={item.source}
										verified={item.verified}
									/>
									{item.isClubFavourite ? (
										<span className="inline-flex items-center gap-1 text-warning-ink text-xs">
											<Star className="size-3" aria-hidden />
											Favourite
										</span>
									) : null}
									{item.readers > 0 ? (
										<span className="inline-flex items-center gap-1 text-muted-foreground text-xs tabular-nums">
											<Users className="size-3" aria-hidden />
											{item.readers}
										</span>
									) : null}
								</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</EditionSection>
	);
}
