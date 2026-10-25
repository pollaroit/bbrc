"use client";

import { Button } from "@bbrc/ui/components/button";
import { Textarea } from "@bbrc/ui/components/textarea";
import { ListPlus, SkipForward, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { bookCoverUrl } from "@/lib/book-cover";
import { cn } from "@/lib/utils";
import type { BookQueue, QueueItem } from "./use-book-queue";

/*
 * Queue UI for the book flow.
 *
 * - `BookQueuePanel`   the list: progress ("2 of 5"), the current book marked,
 *                      remove buttons, "Review next", and (admins) a box to paste
 *                      one title per line. Props:
 *                        queue            from `useBookQueue()`
 *                        onOpen(item)     open that queue item in the form
 *                        allowPaste       show the paste-titles box (admins)
 *                        actionLabel      what opening does ("Review" / "Request")
 * - `BookQueueProgress` one line for the workspace header: "Book 2 of 5", with
 *                      Skip. Props: `queue`, `onSkip` (defaults to `queue.skip`).
 */

function itemTitle(item: QueueItem) {
	return item.kind === "work" ? item.work.title : item.query;
}

function itemSubtitle(item: QueueItem) {
	if (item.kind === "title")
		return "Pasted title: looked up when you get to it";
	return item.work.authors.join(", ") || "Unknown author";
}

export function BookQueuePanel({
	queue,
	onOpen,
	allowPaste = false,
	actionLabel = "Review",
	className,
}: {
	queue: BookQueue;
	onOpen: (item: QueueItem) => void;
	allowPaste?: boolean;
	actionLabel?: string;
	className?: string;
}) {
	const [pasteOpen, setPasteOpen] = useState(false);
	const [pasted, setPasted] = useState("");
	const [notice, setNotice] = useState<string | null>(null);

	function addPasted() {
		const added = queue.addTitles(pasted);
		setNotice(
			added === 0
				? "No new titles found. Put one title on each line."
				: `Added ${added} ${added === 1 ? "title" : "titles"}.`,
		);
		if (added > 0) setPasted("");
	}

	if (queue.count === 0 && !allowPaste) return null;

	return (
		<section
			aria-label="Queue"
			className={cn("flex flex-col border border-border", className)}
		>
			<header className="flex items-center justify-between gap-3 border-border border-b px-3 py-2">
				<h2 className="font-medium text-sm">
					Queue
					{queue.count > 0 ? (
						<span className="ms-2 font-normal text-muted-foreground text-xs tabular-nums">
							{queue.position} of {queue.count}
						</span>
					) : null}
				</h2>
				<div className="flex items-center gap-1">
					{allowPaste ? (
						<Button
							type="button"
							variant="ghost"
							size="xs"
							aria-expanded={pasteOpen}
							onClick={() => setPasteOpen((value) => !value)}
						>
							<ListPlus data-icon="inline-start" aria-hidden />
							Paste titles
						</Button>
					) : null}
					{queue.count > 0 ? (
						<Button
							type="button"
							variant="ghost"
							size="xs"
							className="text-muted-foreground"
							onClick={queue.clear}
						>
							Clear
						</Button>
					) : null}
				</div>
			</header>

			{pasteOpen ? (
				<div className="flex flex-col gap-2 border-border border-b p-3">
					<Textarea
						value={pasted}
						rows={5}
						placeholder={"One title per line\nThe Trial\nInvisible Man"}
						aria-label="Titles to queue, one per line"
						onChange={(event) => {
							setPasted(event.target.value);
							setNotice(null);
						}}
					/>
					<div className="flex items-center justify-between gap-3">
						<p className="text-muted-foreground text-xs" aria-live="polite">
							{notice ?? "Up to 50 titles. Each is looked up on Open Library."}
						</p>
						<Button
							type="button"
							size="sm"
							disabled={pasted.trim().length === 0}
							onClick={addPasted}
						>
							Add to queue
						</Button>
					</div>
				</div>
			) : null}

			{queue.count === 0 ? (
				<p className="px-3 py-4 text-muted-foreground text-sm">
					Nothing queued. Tick “Add to queue” on search results, or paste a list
					of titles.
				</p>
			) : (
				<>
					<ul className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto">
						{queue.items.map((item) => {
							const current = item.id === queue.current?.id;
							const src =
								item.kind === "work"
									? bookCoverUrl(item.work.coverId, "S")
									: null;
							return (
								<li
									key={item.id}
									className={cn(
										"flex items-center gap-3 px-3 py-2",
										current && "bg-muted/40",
									)}
								>
									<div className="relative aspect-2/3 w-7 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
										{src ? (
											<Image
												src={src}
												alt=""
												fill
												sizes="28px"
												className="object-cover"
											/>
										) : null}
									</div>
									<button
										type="button"
										className="min-w-0 flex-1 text-start"
										onClick={() => {
											queue.select(item.id);
											onOpen(item);
										}}
									>
										<span className="block truncate font-medium text-sm">
											{itemTitle(item)}
										</span>
										<span className="block truncate text-muted-foreground text-xs">
											{itemSubtitle(item)}
										</span>
									</button>
									{current ? (
										<span className="shrink-0 border border-foreground px-1.5 py-0.5 text-3xs">
											Next up
										</span>
									) : null}
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										aria-label={`Remove ${itemTitle(item)} from the queue`}
										onClick={() => queue.remove(item.id)}
									>
										<X aria-hidden />
									</Button>
								</li>
							);
						})}
					</ul>
					<footer className="flex justify-end border-border border-t p-2">
						<Button
							type="button"
							size="sm"
							onClick={() => queue.current && onOpen(queue.current)}
						>
							{actionLabel} next
						</Button>
					</footer>
				</>
			)}
		</section>
	);
}

export function BookQueueProgress({
	queue,
	onSkip,
	className,
}: {
	queue: BookQueue;
	onSkip?: () => void;
	className?: string;
}) {
	if (queue.count === 0 || queue.position === 0) return null;
	const percent = Math.round((queue.position / queue.count) * 100);

	return (
		<div
			className={cn(
				"flex items-center gap-3 border border-border px-3 py-2 text-sm",
				className,
			)}
		>
			<span className="font-medium tabular-nums">
				Book {queue.position} of {queue.count}
			</span>
			<div
				className="h-1 min-w-12 flex-1 bg-muted"
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={queue.count}
				aria-valuenow={queue.position}
			>
				<div
					className="h-full bg-foreground"
					style={{ width: `${percent}%` }}
				/>
			</div>
			{queue.count > 1 ? (
				<Button
					type="button"
					variant="ghost"
					size="xs"
					onClick={onSkip ?? queue.skip}
				>
					<SkipForward data-icon="inline-start" aria-hidden />
					Skip
				</Button>
			) : null}
		</div>
	);
}
