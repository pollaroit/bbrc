"use client";

import type { CreateSeriesInput } from "@bbrc/api/modules/series/series.schema";
import { CreateSeriesInputSchema } from "@bbrc/api/modules/series/series.schema";
import type { SeriesPlacementValue } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useQuery } from "@tanstack/react-query";
import { Layers, Plus, Search, Undo2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SeriesPositionPicker } from "@/components/blocks/series-position-picker";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export type AddBookSeriesSelection =
	| { kind: "existing"; slug: string; title: string }
	| { kind: "new"; draft: CreateSeriesInput };

/** Where the book goes; `position: null` is the end of the series. */
export type AddBookSeriesPlacement = SeriesPlacementValue;

export const DEFAULT_SERIES_PLACEMENT: AddBookSeriesPlacement = {
	position: null,
	shiftLater: false,
};

/**
 * Series chooser for the add and edit pages.
 *
 * - `selection`  the chosen series (existing or new), or `null` for none.
 * - `placement` / `onPlacementChange`  where the book goes in an existing series
 *   (see SeriesPositionPicker). Defaults to the end. Reset it to
 *   DEFAULT_SERIES_PLACEMENT when the series changes (this field does it for you
 *   when `onPlacementChange` is given).
 * - `bookTitle`  shown on the marker in the order list.
 * - `mode`  "add" (default) or "edit".
 *
 * Edit mode: start `selection` as the book's current series
 * (`{ kind: "existing", slug, title }`) and pass the same value as
 * `restoreSelection`. Clearing it then shows "will be removed from its series"
 * with an Undo. Map the result to the update call like this:
 *   - selection unchanged and placement unchanged -> leave `series` out
 *   - selection null while the book had a series  -> `series: null`
 *   - existing -> `series: { seriesSlug, position: placement.position ?? undefined, shiftLater: placement.shiftLater }`
 *   - new      -> `series: { newSeries: draft }`
 * Pass `excludeBookSlug` (the book being edited) so it can be moved within its own series.
 */
type AddBookSeriesFieldProps = {
	selection: AddBookSeriesSelection | null;
	onChange: (selection: AddBookSeriesSelection | null) => void;
	placement?: AddBookSeriesPlacement;
	onPlacementChange?: (placement: AddBookSeriesPlacement) => void;
	bookTitle?: string;
	mode?: "add" | "edit";
	restoreSelection?: AddBookSeriesSelection | null;
	excludeBookSlug?: string;
	className?: string;
};

export function AddBookSeriesField({
	selection,
	onChange,
	placement = DEFAULT_SERIES_PLACEMENT,
	onPlacementChange,
	bookTitle = "",
	mode = "add",
	restoreSelection = null,
	excludeBookSlug,
	className,
}: AddBookSeriesFieldProps) {
	const [searchInput, setSearchInput] = useState("");
	const debouncedQuery = useDebouncedValue(searchInput, 300);
	const trimmed = debouncedQuery.trim();

	const [createOpen, setCreateOpen] = useState(false);
	const [draftTitle, setDraftTitle] = useState("");
	const [draftSlug, setDraftSlug] = useState("");
	const [draftDescription, setDraftDescription] = useState("");

	const seriesQuery = useQuery({
		...orpc.series.getList.queryOptions({
			input: {
				limit: 10,
				sortBy: "title",
				sortDirection: "asc",
				...(trimmed.length >= 2 ? { search: trimmed } : {}),
			},
		}),
		enabled: trimmed.length >= 2 && selection == null,
	});

	const searchResults = useMemo(() => {
		return seriesQuery.data?.items ?? [];
	}, [seriesQuery.data?.items]);

	const openCreateDialog = () => {
		setDraftTitle("");
		setDraftSlug("");
		setDraftDescription("");
		setCreateOpen(true);
	};

	const confirmNewSeries = () => {
		const parsed = CreateSeriesInputSchema.safeParse({
			title: draftTitle,
			...(draftSlug.trim().length > 0 ? { slug: draftSlug.trim() } : {}),
			...(draftDescription.trim().length > 0
				? { description: draftDescription.trim() }
				: {}),
		});

		if (!parsed.success) {
			toast.error(parsed.error.issues[0]?.message ?? "Invalid series details.");
			return;
		}

		onChange({ kind: "new", draft: parsed.data });
		onPlacementChange?.(DEFAULT_SERIES_PLACEMENT);
		setCreateOpen(false);
		setSearchInput("");
	};

	const selectExisting = (item: { slug: string; title: string }) => {
		onChange({ kind: "existing", slug: item.slug, title: item.title });
		onPlacementChange?.(DEFAULT_SERIES_PLACEMENT);
		setSearchInput("");
	};

	return (
		<Field className={cn("gap-3", className)}>
			<div className="space-y-1">
				<FieldLegend variant="label">Series (optional)</FieldLegend>
				<FieldDescription>
					{mode === "edit"
						? "Move this book within its series, to another series, or out of it."
						: "Choose where this book goes in a series (the end by default). New series are created only when you save the book."}
				</FieldDescription>
			</div>

			{selection ? (
				<div className="flex items-start gap-2 border border-border bg-muted/15 px-3 py-2">
					<Layers
						className="mt-0.5 size-4 shrink-0 text-muted-foreground"
						aria-hidden
					/>
					<div className="min-w-0 flex-1">
						<p className="font-medium text-sm">
							{selection.kind === "existing"
								? selection.title
								: selection.draft.title}
						</p>
						<p className="text-muted-foreground text-xs">
							{selection.kind === "existing"
								? mode === "edit"
									? "Existing series"
									: "Existing series. Pick its place below."
								: "New series, created on save. This book will be #1."}
						</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						aria-label="Clear series selection"
						onClick={() => {
							onChange(null);
							onPlacementChange?.(DEFAULT_SERIES_PLACEMENT);
						}}
					>
						<X className="size-3.5" aria-hidden />
					</Button>
				</div>
			) : mode === "edit" && restoreSelection ? (
				<div className="flex flex-wrap items-center gap-3 border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
					<p className="min-w-0 flex-1 text-warning-ink">
						This book will be removed from{" "}
						<span className="font-medium">
							{restoreSelection.kind === "existing"
								? restoreSelection.title
								: restoreSelection.draft.title}
						</span>{" "}
						when you save.
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => onChange(restoreSelection)}
					>
						<Undo2 data-icon="inline-start" />
						Keep it
					</Button>
				</div>
			) : null}

			{selection?.kind === "existing" ? (
				<SeriesPositionPicker
					seriesSlug={selection.slug}
					newBookTitle={bookTitle}
					value={placement}
					onChange={(next) => onPlacementChange?.(next)}
					excludeBookSlug={excludeBookSlug}
				/>
			) : null}

			{selection ? null : (
				<>
					<div className="relative">
						<Search
							className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
							aria-hidden
						/>
						<Input
							value={searchInput}
							onChange={(event) => setSearchInput(event.target.value)}
							placeholder="Search series by title…"
							className="ps-8"
							autoComplete="off"
						/>
					</div>

					{trimmed.length >= 2 ? (
						<div className="max-h-52 overflow-y-auto border border-border">
							{seriesQuery.isPending ? (
								<p className="px-3 py-4 text-muted-foreground text-xs">
									Searching…
								</p>
							) : searchResults.length === 0 ? (
								<p className="px-3 py-4 text-muted-foreground text-xs">
									No matching series. Create one below.
								</p>
							) : (
								<ul>
									{searchResults.map((item) => (
										<li
											key={item.slug}
											className="border-border border-b last:border-b-0"
										>
											<button
												type="button"
												className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-muted/30"
												onClick={() => selectExisting(item)}
											>
												<span className="font-medium text-sm">
													{item.title}
												</span>
												<span className="text-muted-foreground text-xs">
													{item.bookCount}{" "}
													{item.bookCount === 1 ? "book" : "books"}
												</span>
											</button>
										</li>
									))}
								</ul>
							)}
						</div>
					) : (
						<p className="text-muted-foreground text-xs">
							Type at least two characters to search, or create a new series.
						</p>
					)}

					<Button
						type="button"
						variant="outline"
						size="sm"
						className="w-fit"
						onClick={openCreateDialog}
					>
						<Plus data-icon="inline-start" />
						Add series
					</Button>
				</>
			)}

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>New series</DialogTitle>
						<DialogDescription>
							Details are saved locally until you add this book. The series is
							created only when the book is saved.
						</DialogDescription>
					</DialogHeader>
					<FieldGroup className="gap-4">
						<Field>
							<FieldLabel htmlFor="add-book-new-series-title">Title</FieldLabel>
							<Input
								id="add-book-new-series-title"
								value={draftTitle}
								autoFocus
								onChange={(event) => setDraftTitle(event.target.value)}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="add-book-new-series-slug">Slug</FieldLabel>
							<Input
								id="add-book-new-series-slug"
								value={draftSlug}
								placeholder="Generated from title when empty"
								onChange={(event) => setDraftSlug(event.target.value)}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="add-book-new-series-description">
								Description for readers
							</FieldLabel>
							<Textarea
								id="add-book-new-series-description"
								value={draftDescription}
								rows={4}
								maxLength={2000}
								onChange={(event) => setDraftDescription(event.target.value)}
							/>
						</Field>
					</FieldGroup>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setCreateOpen(false)}
						>
							Cancel
						</Button>
						<Button type="button" onClick={confirmNewSeries}>
							Use this series
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Field>
	);
}
