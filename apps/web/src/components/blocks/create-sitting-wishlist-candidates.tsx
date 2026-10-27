"use client";

import type { PreviewSittingPollOptionsOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import type { WishlistPollCandidatesInput } from "@bbrc/api/modules/sitting/sitting-wishlist-candidates.schema";
import { Button } from "@bbrc/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Check, Plus } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { orpc } from "@/utils/orpc";

type PreviewOption = PreviewSittingPollOptionsOutput["options"][number];

type CreateSittingWishlistCandidatesProps = {
	/** The same input the poll preview uses (participants and poll filters). */
	previewInput: {
		participantUserIds: string[];
		poll?: WishlistPollCandidatesInput["poll"];
	};
	/** Books already on the poll. */
	onPollBookIds: ReadonlySet<string>;
	disabled?: boolean;
	onUse: (option: PreviewOption) => void;
};

/**
 * Books the chosen readers have on their wishlists that pass this poll's
 * filters, most wanted first. Only counts are shown, never whose wishlist.
 * Renders nothing until there is something to suggest.
 */
export function CreateSittingWishlistCandidates({
	previewInput,
	onPollBookIds,
	disabled = false,
	onUse,
}: CreateSittingWishlistCandidatesProps) {
	const { data } = useQuery({
		...orpc.sitting.wishlistPollCandidates.queryOptions({
			input: { ...previewInput, limit: 8 },
		}),
		staleTime: 60_000,
		retry: false,
	});

	if (!data || data.items.length === 0) return null;

	return (
		<section
			className="flex flex-col gap-3 border border-border border-dashed p-4"
			aria-labelledby="wished-heading"
		>
			<div className="flex flex-col gap-1">
				<h3
					id="wished-heading"
					className="flex items-center gap-2 font-medium text-sm"
				>
					<Bookmark className="size-4" aria-hidden />
					Most wished by your readers
				</h3>
				<p className="max-w-2xl text-muted-foreground text-xs leading-relaxed">
					Books on the readers' wishlists that match this poll. Putting one on
					the poll swaps it in for a book you haven't kept. You only see how
					many readers want a book, never who.
				</p>
			</div>
			<ul className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
				{data.items.map(({ option, wishlisted }) => {
					const coverSrc = bookCoverUrl(option.book.coverId);
					const onPoll = onPollBookIds.has(option.book.id);
					return (
						<li
							key={option.book.id}
							className="flex w-56 shrink-0 flex-col gap-3 border border-border bg-card p-3"
						>
							<div className="flex gap-3">
								<span className="relative aspect-2/3 w-12 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
									{coverSrc ? (
										<Image
											src={coverSrc}
											alt=""
											fill
											className="object-cover"
											sizes="48px"
										/>
									) : null}
								</span>
								<div className="flex min-w-0 flex-col gap-0.5">
									<Link
										href={`/books/${option.book.slug}` as Route}
										target="_blank"
										className="line-clamp-2 font-medium text-sm leading-snug hover:underline"
									>
										{option.book.title}
									</Link>
									<p className="line-clamp-1 text-muted-foreground text-xs">
										{formatBookAuthors(option.book.authors)}
									</p>
									<p className="mt-1 text-success-ink text-xs tabular-nums">
										Wished by {wishlisted} of {data.participantCount}
									</p>
								</div>
							</div>
							<Button
								type="button"
								size="xs"
								variant={onPoll ? "secondary" : "outline"}
								disabled={disabled || onPoll}
								onClick={() => onUse(option)}
							>
								{onPoll ? (
									<>
										<Check data-icon="inline-start" aria-hidden />
										On the poll
									</>
								) : (
									<>
										<Plus data-icon="inline-start" aria-hidden />
										Put on the poll
									</>
								)}
							</Button>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
