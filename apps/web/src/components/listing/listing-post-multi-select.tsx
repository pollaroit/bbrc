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

function previewContent(content: string, max = 100) {
	const trimmed = content.trim();
	if (trimmed.length <= max) {
		return trimmed;
	}
	return `${trimmed.slice(0, max - 1)}…`;
}

type ListingPostMultiSelectProps = {
	legend?: string;
	selectedSlugs: string[];
	onSelectedSlugsChange: (slugs: string[]) => void;
};

export function ListingPostMultiSelect({
	legend = "Posts",
	selectedSlugs,
	onSelectedSlugsChange,
}: ListingPostMultiSelectProps) {
	const [search, setSearch] = useState("");

	const postsQuery = useQuery(
		orpc.admin.listPosts.queryOptions({
			input: {
				limit: 60,
				page: 1,
				sortBy: "createdAt",
				sortDirection: "desc",
				search: search.trim() || undefined,
			},
		}),
	);

	const posts = postsQuery.data?.items ?? [];

	const visiblePosts = useMemo(() => posts, [posts]);

	const toggle = (slug: string, checked: boolean) => {
		const next = checked
			? [...new Set([...selectedSlugs, slug])]
			: selectedSlugs.filter((value) => value !== slug);
		onSelectedSlugsChange(next);
	};

	return (
		<FieldSet className="min-w-0 max-w-full">
			<FieldLegend>{legend}</FieldLegend>
			<Field>
				<FieldLabel className="sr-only">Search posts</FieldLabel>
				<div className="relative">
					<SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search by content, slug, or author…"
						className="pl-9"
						aria-label="Search posts in list"
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
			<ScrollArea className="h-48 w-full min-w-0 border border-border">
				{postsQuery.isPending ? (
					<div className="flex flex-col gap-2 p-3">
						<Skeleton className="h-8 w-full" />
						<Skeleton className="h-8 w-full" />
					</div>
				) : postsQuery.isError ? (
					<p className="p-3 text-destructive text-sm">
						{postsQuery.error.message}
					</p>
				) : visiblePosts.length === 0 ? (
					<p className="p-3 text-muted-foreground text-sm">
						No posts match. Try searching content or @username.
					</p>
				) : (
					<ul className="divide-y divide-border">
						{visiblePosts.map((post) => (
							<li key={post.id}>
								<div className="flex min-w-0 cursor-pointer items-start gap-3 p-3 hover:bg-muted/40">
									<Checkbox
										className="shrink-0"
										checked={selectedSlugs.includes(post.slug)}
										onCheckedChange={(checked) => {
											toggle(post.slug, checked === true);
										}}
									/>
									<span className="min-w-0 flex-1 overflow-hidden">
										<FieldTitle className="line-clamp-2 break-words text-sm [overflow-wrap:anywhere]">
											{previewContent(post.content)}
										</FieldTitle>
										<span className="block break-words text-muted-foreground text-xs [overflow-wrap:anywhere]">
											@{post.author.username}
											{" · "}
											<span className="font-mono">{post.slug}</span>
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
