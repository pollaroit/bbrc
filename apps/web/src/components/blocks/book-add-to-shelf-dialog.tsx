"use client";

import type { ListMyEditableShelvesOutput } from "@bbrc/api/modules/shelf/shelf.schema";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Input } from "@bbrc/ui/components/input";
import { RadioGroup, RadioGroupItem } from "@bbrc/ui/components/radio-group";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Library, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { deckButtonClass, deckLabelClass } from "@/lib/book-deck";
import { BOOK_TONES } from "@/lib/book-tones";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type BookAddToShelfDialogProps = {
	bookSlug: string;
	username: string;
	/** `deck`: the labelled, tinted button of the book page's action dock. */
	trigger?: "button" | "icon" | "deck";
	className?: string;
	tooltipSide?: "top" | "right" | "bottom" | "left";
};

export function BookAddToShelfDialog({
	bookSlug,
	username,
	trigger = "button",
	className,
	tooltipSide = "top",
}: BookAddToShelfDialogProps) {
	const [open, setOpen] = useState(false);
	/** `owner/slug`: the same slug can exist under several owners. */
	const [selectedKey, setSelectedKey] = useState<string | null>(null);
	const [search, setSearch] = useState("");

	const shelvesQuery = useQuery({
		...orpc.shelf.listMineEditable.queryOptions({
			input: { bookSlug },
		}),
		enabled: open,
	});

	const editableKey = orpc.shelf.listMineEditable.queryKey({
		input: { bookSlug },
	});

	const addMutation = useMutation(
		orpc.shelf.addBook.mutationOptions({
			// Adds to the same shelf run one at a time, in click order.
			scope: { id: `shelf-${selectedKey ?? "none"}` },
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: editableKey });
				const previous = queryClient.getQueryData(editableKey);

				queryClient.setQueryData(editableKey, (old) =>
					old
						? {
								...old,
								items: old.items.map((shelf) =>
									shelf.slug === variables.shelfSlug &&
									shelf.ownerUsername === (variables.ownerUsername ?? username)
										? {
												...shelf,
												containsBook: true,
												bookCount: shelf.bookCount + 1,
											}
										: shelf,
								),
							}
						: old,
				);

				setOpen(false);
				setSelectedKey(null);
				return { previous };
			},
			onError: (error, _variables, context) => {
				if (context) {
					queryClient.setQueryData(editableKey, context.previous);
				}
				toast.error(error.message ?? "Could not add book.");
			},
			onSettled: () => {
				void queryClient.invalidateQueries({
					queryKey: orpc.shelf.listForBook.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.shelf.listMineEditable.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.shelf.getBySlug.key(),
				});
			},
		}),
	);

	const items = shelvesQuery.data?.items ?? [];
	const max = shelvesQuery.data?.maxBooksPerShelf ?? 50;

	const newShelfHref =
		`/users/${username}/shelves/new?addBookSlug=${encodeURIComponent(bookSlug)}&returnTo=${encodeURIComponent(`/books/${bookSlug}`)}` as Route;

	const openDialog = () => setOpen(true);

	const triggerNode =
		trigger === "icon" ? (
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className={cn("size-8 shrink-0", className)}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								openDialog();
							}}
							aria-label="Add to shelf"
						/>
					}
				>
					<Library className="size-4" aria-hidden />
				</TooltipTrigger>
				<TooltipContent side={tooltipSide}>Add to shelf</TooltipContent>
			</Tooltip>
		) : trigger === "deck" ? (
			<Button
				type="button"
				variant="ghost"
				onClick={openDialog}
				aria-label="Add to shelf"
				className={cn(deckButtonClass, className)}
			>
				<Library className={cn("size-4", BOOK_TONES.info.ink)} aria-hidden />
				<span className={deckLabelClass}>Shelf</span>
			</Button>
		) : (
			<Button type="button" variant="outline" size="sm" onClick={openDialog}>
				Add to shelf
			</Button>
		);

	const needle = search.trim().toLowerCase();
	const visible = needle
		? items.filter((shelf) => shelf.title.toLowerCase().includes(needle))
		: items;
	const mine = visible.filter((shelf) => shelf.isOwner);
	const shared = visible.filter((shelf) => !shelf.isOwner);
	const chosen = items.find(
		(shelf) => `${shelf.ownerUsername}/${shelf.slug}` === selectedKey,
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{triggerNode}
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add to a shelf</DialogTitle>
					<DialogDescription>
						Choose where this book goes. A shelf holds up to {max} books.
					</DialogDescription>
				</DialogHeader>

				{shelvesQuery.isPending ? (
					<div className="flex flex-col gap-2" aria-busy>
						{[0, 1, 2].map((i) => (
							<div
								key={i}
								className="h-14 bg-muted motion-safe:animate-pulse"
							/>
						))}
					</div>
				) : items.length === 0 ? (
					<p className="border border-border border-dashed p-6 text-center text-muted-foreground text-sm">
						You have no shelves yet. Make one to start collecting books.
					</p>
				) : (
					<div className="flex flex-col gap-3">
						{items.length > 5 ? (
							<Input
								type="search"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Search shelves"
								aria-label="Search shelves"
							/>
						) : null}
						<RadioGroup
							value={selectedKey ?? ""}
							onValueChange={(value) => setSelectedKey(String(value))}
							aria-label="Shelves"
							className="max-h-72 gap-4 overflow-y-auto"
						>
							{[
								{ label: "Your shelves", rows: mine },
								{ label: "Shared with you", rows: shared },
							].map((group) =>
								group.rows.length === 0 ? null : (
									<div key={group.label} className="flex flex-col gap-1.5">
										{mine.length > 0 && shared.length > 0 ? (
											<p className="text-muted-foreground text-xs">
												{group.label}
											</p>
										) : null}
										<ul className="divide-y divide-border border border-border">
											{group.rows.map((shelf) => (
												<ShelfRow
													key={`${shelf.ownerUsername}/${shelf.slug}`}
													shelf={shelf}
													max={max}
												/>
											))}
										</ul>
									</div>
								),
							)}
							{visible.length === 0 ? (
								<p className="p-4 text-center text-muted-foreground text-sm">
									No shelf matches “{search.trim()}”.
								</p>
							) : null}
						</RadioGroup>
					</div>
				)}

				<DialogFooter className="sm:justify-between">
					<Button
						type="button"
						variant="ghost"
						render={<Link href={newShelfHref} />}
						nativeButton={false}
						onClick={() => setOpen(false)}
					>
						<Plus className="size-4" aria-hidden />
						New shelf
					</Button>
					<Button
						type="button"
						disabled={!chosen || addMutation.isPending}
						onClick={() => {
							if (!chosen) return;
							addMutation.mutate({
								ownerUsername: chosen.ownerUsername,
								shelfSlug: chosen.slug,
								bookSlug,
							});
						}}
					>
						{chosen ? (
							<span className="max-w-48 truncate">Add to {chosen.title}</span>
						) : (
							"Add to shelf"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

type ShelfOption = ListMyEditableShelvesOutput["items"][number];

function ShelfRow({ shelf, max }: { shelf: ShelfOption; max: number }) {
	const key = `${shelf.ownerUsername}/${shelf.slug}`;
	const full = shelf.bookCount >= max;
	const disabled = full || shelf.containsBook;

	return (
		<li>
			{/* biome-ignore lint/a11y/noLabelWithoutControl: the radio is inside the label */}
			<label
				className={cn(
					"flex items-center gap-3 px-3 py-2.5 transition-colors has-data-checked:bg-muted/60 motion-reduce:transition-none",
					disabled
						? "cursor-not-allowed opacity-60"
						: "cursor-pointer hover:bg-muted/40",
				)}
			>
				<RadioGroupItem value={key} disabled={disabled} />
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="flex items-center gap-2">
						<span className="truncate font-medium text-sm">{shelf.title}</span>
						{shelf.status === "draft" ? (
							<span className="shrink-0 border border-border px-1.5 text-muted-foreground text-xs">
								Draft
							</span>
						) : null}
					</span>
					<span className="truncate text-muted-foreground text-xs">
						{shelf.isOwner ? "" : `By @${shelf.ownerUsername}, `}
						{shelf.bookCount} of {max} books
					</span>
				</span>
				{shelf.containsBook ? (
					<span className="flex shrink-0 items-center gap-1 text-success-ink text-xs">
						<Check className="size-3.5" aria-hidden />
						On this shelf
					</span>
				) : full ? (
					<span className="shrink-0 text-muted-foreground text-xs">Full</span>
				) : (
					<span
						className="h-1 w-12 shrink-0 bg-muted"
						role="img"
						aria-label={`${shelf.bookCount} of ${max} books`}
					>
						<span
							className="block h-full bg-info"
							style={{ width: `${(shelf.bookCount / max) * 100}%` }}
						/>
					</span>
				)}
			</label>
		</li>
	);
}
