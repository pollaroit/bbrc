"use client";

import type { PreviewSittingPollOptionsOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import type { SearchPollNomineesInput } from "@bbrc/api/modules/sitting/sitting-poll-nominees.schema";
import {
	canNominatePollBook,
	pollNomineeReadWarning,
	pollNomineeReasonLabel,
	primaryPollNomineeReason,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@bbrc/ui/components/sheet";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { useMediaQuery } from "@/lib/reading-mode/use-media-query";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type PreviewOption = PreviewSittingPollOptionsOutput["options"][number];

type CreateSittingNomineeSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The participants and poll filters the preview was drawn with. */
	previewInput: Pick<SearchPollNomineesInput, "participantUserIds" | "poll">;
	/** Books now on the poll, so "already in the poll" can be told. */
	currentOptionBookIds: string[];
	onPick: (option: PreviewOption) => void;
};

/**
 * Search the whole library and put one book on the poll. A book that cannot go on
 * the poll stays in the list, disabled, with the reason (decided by the server,
 * which owns the poll rules). A book some readers have already read can still be
 * chosen: it only carries a warning.
 */
export function CreateSittingNomineeSheet({
	open,
	onOpenChange,
	previewInput,
	currentOptionBookIds,
	onPick,
}: CreateSittingNomineeSheetProps) {
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const [text, setText] = useState("");
	const [active, setActive] = useState(0);
	const query = useDebouncedValue(text.trim(), 250);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (open) {
			setText("");
			setActive(0);
		}
	}, [open]);

	const search = useQuery({
		...orpc.sitting.searchPollNominees.queryOptions({
			input: {
				...previewInput,
				currentOptionBookIds,
				query: query || "-",
				limit: 8,
			},
		}),
		enabled: open && query.length > 0,
		staleTime: 30_000,
		retry: false,
	});

	const items = query.length > 0 ? (search.data?.items ?? []) : [];
	const participantCount = search.data?.participantCount ?? 0;

	useEffect(() => {
		setActive(0);
	}, [items.length, query]);

	function pick(index: number) {
		const item = items[index];
		if (!item || !canNominatePollBook(item.reasons)) return;
		onPick(item.option);
		onOpenChange(false);
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side={isDesktop ? "right" : "bottom"}
				className="max-h-[85dvh] md:max-h-none md:sm:max-w-md"
			>
				<SheetHeader>
					<SheetTitle>Choose a book for this slot</SheetTitle>
					<SheetDescription>
						Search by title or author. Books that can't go on this poll are
						shown with the reason.
					</SheetDescription>
				</SheetHeader>

				<div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">
					<div className="relative">
						<Search
							className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
							aria-hidden
						/>
						<Input
							ref={inputRef}
							autoFocus
							value={text}
							placeholder="Search the library"
							className="pl-8"
							aria-label="Search the library"
							onChange={(event) => setText(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "ArrowDown") {
									event.preventDefault();
									setActive((current) =>
										Math.min(current + 1, Math.max(items.length - 1, 0)),
									);
								} else if (event.key === "ArrowUp") {
									event.preventDefault();
									setActive((current) => Math.max(current - 1, 0));
								} else if (event.key === "Enter") {
									event.preventDefault();
									pick(active);
								}
							}}
						/>
					</div>

					<div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
						{query.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								Type a title or an author to start.
							</p>
						) : search.isPending ? (
							<div className="flex flex-col gap-2">
								{[0, 1, 2].map((key) => (
									<Skeleton key={key} className="h-20 w-full" />
								))}
							</div>
						) : search.isError ? (
							<p className="text-destructive text-sm">
								Could not search. Try again.
							</p>
						) : items.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No books match “{query}”.
							</p>
						) : (
							<ul className="flex flex-col gap-2">
								{items.map((item, index) => {
									const { book } = item.option;
									const blocked = !canNominatePollBook(item.reasons);
									const reason = primaryPollNomineeReason(item.reasons);
									const warning = pollNomineeReadWarning(
										item.option.participantReadCount,
										participantCount,
									);
									const coverSrc = bookCoverUrl(book.coverId);
									return (
										<li
											key={book.id}
											aria-current={index === active}
											className={cn(
												"flex gap-3 border p-3",
												index === active
													? "border-foreground"
													: "border-border",
												blocked && "opacity-70",
											)}
											onMouseEnter={() => setActive(index)}
										>
											<div className="relative aspect-2/3 w-12 shrink-0 self-start overflow-hidden bg-muted ring-1 ring-foreground/10">
												{coverSrc ? (
													<Image
														src={coverSrc}
														alt=""
														fill
														className="object-cover"
														sizes="48px"
													/>
												) : null}
											</div>
											<div className="flex min-w-0 flex-1 flex-col gap-1">
												<p className="line-clamp-2 font-medium text-sm leading-snug">
													{book.title}
												</p>
												<p className="truncate text-muted-foreground text-xs">
													{formatBookAuthors(book.authors)} · {book.pages} pages
												</p>
												{reason ? (
													<p className="text-muted-foreground text-xs">
														{pollNomineeReasonLabel(reason, item.filters)}
													</p>
												) : warning ? (
													<p className="w-fit border border-warning/50 px-1.5 py-0.5 text-warning-ink text-xs">
														{warning}
													</p>
												) : null}
											</div>
											<Button
												type="button"
												size="xs"
												variant="outline"
												className="self-center"
												disabled={blocked}
												onClick={() => pick(index)}
											>
												Use
											</Button>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
