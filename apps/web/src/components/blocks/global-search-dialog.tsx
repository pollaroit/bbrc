"use client";

import type {
	GlobalSearchHit,
	GlobalSearchHitType,
} from "@bbrc/api/modules/search/global-search.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import {
	CommandDialog,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from "@bbrc/ui/components/command";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
	BookOpen,
	ExternalLink,
	FileText,
	Library,
	MessageSquare,
	PenLine,
	Star,
	User,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { useState } from "react";
import { globalSearchTypeLabels } from "@/components/blocks/global-search-provider";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const typeIcons: Record<
	GlobalSearchHitType,
	ComponentType<{ className?: string }>
> = {
	book: BookOpen,
	user: User,
	post: PenLine,
	feedback: Star,
	comment: MessageSquare,
	shelf: Library,
	document: FileText,
	author: BookOpen,
};

const searchHints = [
	"Book titles and authors",
	"Member names",
	"Posts and reviews",
	"Shelves and documents",
] as const;

type GlobalSearchDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function GlobalSearchDialog({
	open,
	onOpenChange,
}: GlobalSearchDialogProps) {
	const router = useRouter();
	const [query, setQuery] = useState("");
	const debouncedQuery = useDebouncedValue(query, 300);
	const trimmed = debouncedQuery.trim();
	const canSearch = trimmed.length >= 2;

	const searchQuery = useQuery({
		...orpc.globalSearch.search.queryOptions({
			input: { query: trimmed },
		}),
		enabled: open && canSearch,
	});

	const items = searchQuery.data?.items ?? [];
	const isSearching =
		canSearch && (searchQuery.isFetching || searchQuery.isPending);
	const showEmpty =
		canSearch && !isSearching && items.length === 0 && !searchQuery.isError;

	const navigate = (href: string) => {
		onOpenChange(false);
		setQuery("");
		router.push(href as Route);
	};

	return (
		<CommandDialog
			shouldFilter={false}
			open={open}
			onOpenChange={(nextOpen) => {
				onOpenChange(nextOpen);
				if (!nextOpen) {
					setQuery("");
				}
			}}
			title="Search the club"
			description="Find books, members, posts, and more across BBRC"
			className="gap-0 p-0 sm:max-w-xl"
		>
			<CommandInput
				placeholder="Search books, members, posts…"
				value={query}
				onValueChange={setQuery}
			/>
			<CommandList className="max-h-[min(52vh,22rem)] px-1.5 py-1.5">
				{!canSearch ? (
					<GlobalSearchIdleState />
				) : isSearching ? (
					<GlobalSearchLoadingState />
				) : showEmpty ? (
					<GlobalSearchNoResults query={trimmed} />
				) : (
					<>
						<CommandEmpty className="hidden" />
						{items.map((item, index) => (
							<GlobalSearchHitRow
								key={`${item.type}-${item.href}-${index}`}
								item={item}
								onNavigate={navigate}
							/>
						))}
					</>
				)}
			</CommandList>
			<GlobalSearchFooter hasQuery={query.length > 0} />
		</CommandDialog>
	);
}

function GlobalSearchIdleState() {
	return (
		<div className="px-3 py-5">
			<p className="text-pretty text-muted-foreground text-sm leading-relaxed">
				Start typing to search the library, members, and conversations.
			</p>
			<ul className="mt-4 space-y-2 border-border border-t pt-4">
				{searchHints.map((hint) => (
					<li
						key={hint}
						className="flex items-center gap-2.5 text-muted-foreground text-xs"
					>
						<span className="size-1 shrink-0 bg-primary/70" aria-hidden />
						{hint}
					</li>
				))}
			</ul>
		</div>
	);
}

function GlobalSearchLoadingState() {
	return (
		<div
			className="space-y-1.5 px-1 py-1"
			role="status"
			aria-busy="true"
			aria-live="polite"
		>
			<span className="sr-only">Searching</span>
			{[0, 1, 2].map((key) => (
				<div
					key={key}
					className="flex items-center gap-3 border border-transparent px-2.5 py-2.5"
				>
					<Skeleton className="size-9 shrink-0" />
					<div className="min-w-0 flex-1 space-y-2">
						<Skeleton className="h-3.5 w-[min(100%,14rem)]" />
						<Skeleton className="h-3 w-[min(100%,20rem)]" />
					</div>
					<Skeleton className="h-5 w-14 shrink-0" />
				</div>
			))}
		</div>
	);
}

function GlobalSearchNoResults({ query }: { query: string }) {
	return (
		<div className="px-3 py-8 text-center">
			<p className="font-medium text-foreground text-sm">No matches</p>
			<p className="mt-1.5 text-pretty text-muted-foreground text-xs leading-relaxed">
				Nothing matched{" "}
				<span className="text-foreground">&ldquo;{query}&rdquo;</span>. Try a
				book title, author, or @username.
			</p>
		</div>
	);
}

function GlobalSearchFooter({ hasQuery }: { hasQuery: boolean }) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2 border-border border-t bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
			<span>
				{hasQuery ? "Mixed results from across the club" : "Club-wide search"}
			</span>
			<span className="hidden sm:inline">
				<kbd className="border border-border bg-background px-1 font-mono text-[10px]">
					↑↓
				</kbd>{" "}
				move{" "}
				<kbd className="border border-border bg-background px-1 font-mono text-[10px]">
					↵
				</kbd>{" "}
				open{" "}
				<kbd className="border border-border bg-background px-1 font-mono text-[10px]">
					esc
				</kbd>{" "}
				close
			</span>
		</div>
	);
}

function GlobalSearchHitRow({
	item,
	onNavigate,
}: {
	item: GlobalSearchHit;
	onNavigate: (href: string) => void;
}) {
	const Icon = typeIcons[item.type];

	return (
		<CommandItem
			value={`${item.type} ${item.title} ${item.description}`}
			onSelect={() => onNavigate(item.href)}
			className={cn(
				"mb-0.5 items-center gap-3 border border-transparent px-2.5 py-2.5",
				"data-[selected=true]:border-border data-[selected=true]:bg-muted/45",
			)}
		>
			<div
				className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted/35 text-muted-foreground"
				aria-hidden
			>
				<Icon className="size-4" />
			</div>
			<div className="min-w-0 flex-1 text-left">
				<p className="truncate font-medium text-foreground text-sm leading-snug">
					{item.title}
				</p>
				<p className="mt-0.5 truncate text-muted-foreground text-xs leading-snug">
					{item.description}
				</p>
			</div>
			<div className="flex shrink-0 items-center gap-1.5">
				{item.action ? (
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						className="text-muted-foreground hover:text-foreground"
						aria-label={item.action.label}
						onClick={(event) => {
							event.stopPropagation();
							window.open(item.action?.href, "_blank", "noopener,noreferrer");
						}}
					>
						<ExternalLink className="size-3.5" aria-hidden />
					</Button>
				) : null}
				<Badge variant="outline" className="font-normal text-[10px]">
					{globalSearchTypeLabels[item.type]}
				</Badge>
			</div>
		</CommandItem>
	);
}
