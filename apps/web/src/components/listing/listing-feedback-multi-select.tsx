"use client";

import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	Field,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { ScrollArea } from "@bbrc/ui/components/scroll-area";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { orpc } from "@/utils/orpc";

function previewReview(review: string, max = 100) {
	const trimmed = review.trim();
	if (trimmed.length <= max) {
		return trimmed;
	}
	return `${trimmed.slice(0, max - 1)}…`;
}

type ListingFeedbackMultiSelectProps = {
	legend?: string;
	selectedSlugs: string[];
	onSelectedSlugsChange: (slugs: string[]) => void;
};

export function ListingFeedbackMultiSelect({
	legend = "Feedbacks",
	selectedSlugs,
	onSelectedSlugsChange,
}: ListingFeedbackMultiSelectProps) {
	const [search, setSearch] = useState("");

	const feedbacksQuery = useQuery(
		orpc.admin.listFeedbacks.queryOptions({
			input: {
				limit: 60,
				page: 1,
				sortBy: "createdAt",
				sortDirection: "desc",
				search: search.trim() || undefined,
			},
		}),
	);

	const feedbacks = feedbacksQuery.data?.items ?? [];

	const visibleFeedbacks = useMemo(() => feedbacks, [feedbacks]);

	const toggle = (slug: string, checked: boolean) => {
		const next = checked
			? [...new Set([...selectedSlugs, slug])]
			: selectedSlugs.filter((value) => value !== slug);
		onSelectedSlugsChange(next);
	};

	return (
		<FieldSet>
			<FieldLegend>{legend}</FieldLegend>
			<Field>
				<FieldLabel className="sr-only">Search feedbacks</FieldLabel>
				<div className="relative">
					<SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search by review, book, author, or slug…"
						className="pl-9"
						aria-label="Search feedbacks in list"
					/>
				</div>
			</Field>
			{selectedSlugs.length > 0 ? (
				<div className="flex flex-wrap gap-2">
					{selectedSlugs.map((slug) => (
						<Button
							key={slug}
							type="button"
							variant="outline"
							size="sm"
							className="font-mono text-xs"
							onClick={() => toggle(slug, false)}
						>
							{slug} ×
						</Button>
					))}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => onSelectedSlugsChange([])}
					>
						Clear all
					</Button>
				</div>
			) : null}
			<ScrollArea className="h-48 border border-border">
				{feedbacksQuery.isPending ? (
					<div className="flex flex-col gap-2 p-3">
						<Skeleton className="h-8 w-full" />
						<Skeleton className="h-8 w-full" />
					</div>
				) : feedbacksQuery.isError ? (
					<p className="p-3 text-destructive text-sm">
						{feedbacksQuery.error.message}
					</p>
				) : visibleFeedbacks.length === 0 ? (
					<p className="p-3 text-muted-foreground text-sm">
						No feedbacks match. Try book title, review text, or @username.
					</p>
				) : (
					<ul className="divide-y divide-border">
						{visibleFeedbacks.map((feedback) => (
							<li key={feedback.id}>
								<div className="flex cursor-pointer items-start gap-3 p-3 hover:bg-muted/40">
									<Checkbox
										checked={selectedSlugs.includes(feedback.slug)}
										onCheckedChange={(checked) => {
											toggle(feedback.slug, checked === true);
										}}
									/>
									<span className="min-w-0 flex-1">
										<FieldTitle className="line-clamp-1 text-sm">
											{feedback.book.title}
										</FieldTitle>
										<p className="line-clamp-2 text-muted-foreground text-xs">
											{previewReview(feedback.review)}
										</p>
										<span className="text-muted-foreground text-xs">
											@{feedback.author.username}
											{" · "}
											{feedback.rating.toFixed(1)}★{" · "}
											<span className="font-mono">{feedback.slug}</span>
										</span>
									</span>
								</div>
							</li>
						))}
					</ul>
				)}
			</ScrollArea>
		</FieldSet>
	);
}
