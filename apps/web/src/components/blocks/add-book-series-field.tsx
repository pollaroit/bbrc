"use client";

import type { CreateSeriesInput } from "@bbrc/api/modules/series/series.schema";
import { CreateSeriesInputSchema } from "@bbrc/api/modules/series/series.schema";
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
import { Layers, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export type AddBookSeriesSelection =
	| { kind: "existing"; slug: string; title: string }
	| { kind: "new"; draft: CreateSeriesInput };

type AddBookSeriesFieldProps = {
	selection: AddBookSeriesSelection | null;
	onChange: (selection: AddBookSeriesSelection | null) => void;
	className?: string;
};

export function AddBookSeriesField({
	selection,
	onChange,
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
		setCreateOpen(false);
		setSearchInput("");
	};

	const selectExisting = (item: { slug: string; title: string }) => {
		onChange({ kind: "existing", slug: item.slug, title: item.title });
		setSearchInput("");
	};

	return (
		<Field className={cn("gap-3", className)}>
			<div className="space-y-1">
				<FieldLegend variant="label">Series (optional)</FieldLegend>
				<FieldDescription>
					Append this book as the last title in a series. New series are created
					only when you save the book.
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
								? "Existing series · added at the end on save"
								: "New series · created on save, book added last"}
						</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						aria-label="Clear series selection"
						onClick={() => onChange(null)}
					>
						<X className="size-3.5" aria-hidden />
					</Button>
				</div>
			) : (
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
