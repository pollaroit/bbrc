"use client";

import { AUTHOR_FIELD_SOURCE_LABELS } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BadgeCheck, GitMerge, Pencil, Search } from "lucide-react";
import type { Route } from "next";
import { useState } from "react";
import { toast } from "sonner";
import {
	invalidateAuthorQueries,
	MergeAuthorDialog,
} from "@/components/blocks/author/admin/author-actions-panel";
import { AuthorStatusBadge } from "@/components/blocks/author/admin/author-status-badge";
import { AuthorPhoto } from "@/components/blocks/author/author-photo";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { Link } from "@/i18n/navigation";
import { client, orpc, queryClient } from "@/utils/orpc";

type Queue = Awaited<ReturnType<typeof client.authorAdmin.reviewQueue>>;
type ReviewRow = Queue["needsReview"][number];
type Summary = Queue["mergeSuggestions"][number]["a"];

const reasonText: Record<string, string> = {
	openlibrary_id: "Same Open Library record",
	wikidata_id: "Same Wikidata record",
	alias: "One is a spelling of the other",
	name: "Same name",
	similar: "Very similar names",
};

const queueInput = { limit: 50 };

type ReviewSort = "name" | "books" | "recent";
type ReviewFilter = "all" | "failed" | "no_bio" | "no_photo";

const sortLabels: Record<ReviewSort, string> = {
	name: "Name",
	books: "Most books",
	recent: "Newest",
};
const filterLabels: Record<ReviewFilter, string> = {
	all: "Everything",
	failed: "Lookup failed",
	no_bio: "No bio",
	no_photo: "No photo",
};

function matchesFilter(row: ReviewRow, filter: ReviewFilter) {
	if (filter === "failed") return row.enrichmentStatus === "failed";
	if (filter === "no_bio") return !row.hasBio;
	if (filter === "no_photo") return !row.photoUrl;
	return true;
}

function sortRows(rows: ReviewRow[], sort: ReviewSort): ReviewRow[] {
	if (sort === "name") {
		return rows.toSorted((a, b) => a.name.localeCompare(b.name));
	}
	if (sort === "books") {
		return rows.toSorted(
			(a, b) => b.bookCount - a.bookCount || a.name.localeCompare(b.name),
		);
	}
	return rows;
}

function Section({
	title,
	description,
	count,
	children,
}: {
	title: string;
	description: string;
	count: number;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3">
			<div className="flex flex-col gap-0.5">
				<h2 className="font-semibold text-lg tracking-tight">
					{title}{" "}
					<span className="font-normal text-muted-foreground tabular-nums">
						{count}
					</span>
				</h2>
				<p className="text-muted-foreground text-sm">{description}</p>
			</div>
			{children}
		</section>
	);
}

function AuthorLine({ author }: { author: Summary }) {
	return (
		<Link
			href={`/authors/${author.slug}/edit` as Route}
			className="flex min-w-0 items-center gap-3 hover:underline"
		>
			<AuthorPhoto size="sm" name={author.name} photoUrl={author.photoUrl} />
			<span className="flex min-w-0 flex-col">
				<span className="truncate font-medium text-sm">{author.name}</span>
				<span className="truncate text-muted-foreground text-xs tabular-nums">
					{[
						author.birthYear
							? `${author.birthYear}${author.deathYear ? `–${author.deathYear}` : ""}`
							: null,
						`${author.bookCount} ${author.bookCount === 1 ? "book" : "books"}`,
					]
						.filter(Boolean)
						.join(" · ")}
				</span>
			</span>
		</Link>
	);
}

export function AdminAuthorsReview() {
	const options = orpc.authorAdmin.reviewQueue.queryOptions({
		input: queueInput,
	});
	const queue = useQuery(options);
	const [mergeRow, setMergeRow] = useState<ReviewRow | null>(null);
	const [search, setSearch] = useState("");
	const [sort, setSort] = useState<ReviewSort>("recent");
	const [filter, setFilter] = useState<ReviewFilter>("all");
	const [pair, setPair] = useState<{ from: Summary; into: Summary } | null>(
		null,
	);

	const confirm = useMutation({
		mutationFn: (id: string) => client.authorAdmin.confirm({ id }),
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: options.queryKey });
			const previous = queryClient.getQueryData(options.queryKey);
			queryClient.setQueryData(options.queryKey, (old: Queue | undefined) =>
				old
					? {
							...old,
							needsReview: old.needsReview.filter((row) => row.id !== id),
							autoFilled: old.autoFilled.filter((row) => row.id !== id),
						}
					: old,
			);
			return { previous };
		},
		onSuccess: () => toast.success("Marked as verified."),
		onError: (error, _id, context) => {
			if (context?.previous)
				queryClient.setQueryData(options.queryKey, context.previous);
			toast.error(error.message || "Could not verify this author.");
		},
		onSettled: invalidateAuthorQueries,
	});

	const mergePair = useMutation({
		mutationFn: (vars: { fromId: string; intoId: string }) =>
			client.authorAdmin.merge(vars),
		onSuccess: (result) => {
			toast.success(`Merged into ${result.into.name}.`);
			setPair(null);
			invalidateAuthorQueries();
		},
		onError: (error) =>
			toast.error(error.message || "Could not merge these authors."),
	});

	if (queue.isPending) {
		return (
			<div className="flex flex-col gap-4" aria-hidden>
				<Skeleton className="h-24 w-full" />
				<Skeleton className="h-24 w-full" />
				<Skeleton className="h-24 w-full" />
			</div>
		);
	}
	if (queue.isError || !queue.data) {
		return (
			<p className="text-muted-foreground text-sm">
				Could not load the review queue.
			</p>
		);
	}

	const term = search.trim().toLowerCase();
	const matchesSearch = (name: string, slug: string) =>
		term === "" ||
		name.toLowerCase().includes(term) ||
		slug.toLowerCase().includes(term);
	const needsReview = sortRows(
		queue.data.needsReview.filter(
			(row) => matchesSearch(row.name, row.slug) && matchesFilter(row, filter),
		),
		sort,
	);
	const autoFilled = sortRows(
		queue.data.autoFilled.filter(
			(row) => matchesSearch(row.name, row.slug) && matchesFilter(row, filter),
		),
		sort,
	);
	const mergeSuggestions = queue.data.mergeSuggestions.filter(
		(suggestion) =>
			term === "" ||
			matchesSearch(suggestion.a.name, suggestion.a.slug) ||
			matchesSearch(suggestion.b.name, suggestion.b.slug),
	);

	const rowActions = (row: ReviewRow) => (
		<div className="flex shrink-0 flex-wrap gap-2">
			<Button
				type="button"
				size="sm"
				variant="outline"
				disabled={confirm.isPending && confirm.variables === row.id}
				onClick={() => confirm.mutate(row.id)}
			>
				<BadgeCheck data-icon="inline-start" />
				Confirm
			</Button>
			<Button
				render={<Link href={`/authors/${row.slug}/edit` as Route} />}
				nativeButton={false}
				size="sm"
				variant="outline"
			>
				<Pencil data-icon="inline-start" />
				Edit
			</Button>
			<Button
				type="button"
				size="sm"
				variant="ghost"
				onClick={() => setMergeRow(row)}
			>
				<GitMerge data-icon="inline-start" />
				Merge…
			</Button>
		</div>
	);

	const reviewList = (rows: ReviewRow[], empty: string) =>
		rows.length === 0 ? (
			<p className="text-muted-foreground text-sm">{empty}</p>
		) : (
			<ul className="divide-y divide-border border border-border">
				{rows.map((row) => (
					<li
						key={row.id}
						className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
					>
						<div className="flex min-w-0 flex-col gap-1">
							<div className="flex items-center gap-2">
								<AuthorLine author={row} />
								<AuthorStatusBadge status={row.status} />
							</div>
							<p className="text-muted-foreground text-xs">
								{row.autoFields.length > 0
									? `Filled in by a lookup: ${row.autoFields.join(", ")}.`
									: "Nothing was filled in."}
								{!row.hasBio ? " No bio yet." : ""}
								{row.enrichmentStatus === "failed"
									? ` The lookup failed${row.enrichmentError ? `: ${row.enrichmentError}` : "."}`
									: ""}
							</p>
						</div>
						{rowActions(row)}
					</li>
				))}
			</ul>
		);

	return (
		<div className="flex flex-col gap-10">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="relative min-w-0 flex-1 sm:max-w-md">
					<Search
						className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden
					/>
					<Input
						type="search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search by name or address…"
						className="ps-8"
						aria-label="Search the review queue"
					/>
				</div>
				<Select
					value={filter}
					onValueChange={(value) => setFilter(value as ReviewFilter)}
				>
					<SelectTrigger className="w-44" aria-label="Show">
						<SelectValue />
					</SelectTrigger>
					<SelectContent alignItemWithTrigger={false}>
						{(Object.keys(filterLabels) as ReviewFilter[]).map((value) => (
							<SelectItem key={value} value={value}>
								{filterLabels[value]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select
					value={sort}
					onValueChange={(value) => setSort(value as ReviewSort)}
				>
					<SelectTrigger className="w-40" aria-label="Sort by">
						<SelectValue />
					</SelectTrigger>
					<SelectContent alignItemWithTrigger={false}>
						{(Object.keys(sortLabels) as ReviewSort[]).map((value) => (
							<SelectItem key={value} value={value}>
								{sortLabels[value]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<Section
				title="Possible duplicates"
				description="Pairs that look like the same person. Names alone never merge authors; you decide."
				count={mergeSuggestions.length}
			>
				{mergeSuggestions.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						No look-alike authors right now.
					</p>
				) : (
					<ul className="divide-y divide-border border border-border">
						{mergeSuggestions.map((suggestion) => (
							<li
								key={`${suggestion.a.id}-${suggestion.b.id}`}
								className="flex flex-col gap-3 p-3"
							>
								<p className="text-muted-foreground text-xs">
									{reasonText[suggestion.reason] ?? "Look alike"}
								</p>
								<div className="grid gap-3 sm:grid-cols-2">
									<AuthorLine author={suggestion.a} />
									<AuthorLine author={suggestion.b} />
								</div>
								<div className="flex flex-wrap gap-2">
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() =>
											setPair({ from: suggestion.b, into: suggestion.a })
										}
									>
										<GitMerge data-icon="inline-start" />
										Keep {suggestion.a.name}
									</Button>
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() =>
											setPair({ from: suggestion.a, into: suggestion.b })
										}
									>
										<GitMerge data-icon="inline-start" />
										Keep {suggestion.b.name}
									</Button>
								</div>
							</li>
						))}
					</ul>
				)}
			</Section>

			<Section
				title="Needs review"
				description="The lookup was unsure about these: thin data or a possible duplicate."
				count={needsReview.length}
			>
				{reviewList(needsReview, "Nothing needs review. ")}
			</Section>

			<Section
				title="Filled in automatically"
				description={`These are live. Check what came from ${AUTHOR_FIELD_SOURCE_LABELS.ai} and confirm.`}
				count={autoFilled.length}
			>
				{reviewList(autoFilled, "Every author has been confirmed.")}
			</Section>

			{mergeRow ? (
				<MergeAuthorDialog
					author={{
						id: mergeRow.id,
						name: mergeRow.name,
						bookCount: mergeRow.bookCount,
					}}
					open
					onOpenChange={(open) => {
						if (!open) setMergeRow(null);
					}}
					onMerged={() => setMergeRow(null)}
				/>
			) : null}

			<DestructiveConfirmDialog
				open={pair != null}
				onOpenChange={(open) => {
					if (!open) setPair(null);
				}}
				title={
					pair
						? `Merge ${pair.from.name} into ${pair.into.name}?`
						: "Merge authors?"
				}
				description={
					pair
						? `${pair.from.name}'s ${pair.from.bookCount} ${pair.from.bookCount === 1 ? "book" : "books"}, followers and spellings move to ${pair.into.name}. The old address redirects. This cannot be undone.`
						: ""
				}
				confirmLabel="Merge authors"
				loading={mergePair.isPending}
				onConfirm={() => {
					if (pair)
						mergePair.mutate({ fromId: pair.from.id, intoId: pair.into.id });
				}}
			/>
		</div>
	);
}
