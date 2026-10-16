"use client";

import type { GlobalSearchHit } from "@bbrc/api/modules/search/global-search.schema";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Field, FieldGroup, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { isAllowedRichLinkHref, normalizeHttpsUrl } from "@/lib/rich-link";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export type RichTextLinkDialogResult = {
	href: string;
	label: string;
};

type RichTextLinkDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialHref?: string;
	initialLabel?: string;
	onApply: (result: RichTextLinkDialogResult) => void;
	onRemove?: () => void;
};

const INTERNAL_HIT_TYPES = new Set([
	"book",
	"user",
	"post",
	"feedback",
	"comment",
	"shelf",
]);

export function RichTextLinkDialog({
	open,
	onOpenChange,
	initialHref = "",
	initialLabel = "",
	onApply,
	onRemove,
}: RichTextLinkDialogProps) {
	const [mode, setMode] = useState<"external" | "internal">("external");
	const [url, setUrl] = useState("");
	const [label, setLabel] = useState("");
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search, 300);
	const trimmedSearch = debouncedSearch.trim();
	const canSearch = trimmedSearch.length >= 2;

	useEffect(() => {
		if (!open) {
			return;
		}
		const href = initialHref.trim();
		if (href.startsWith("/")) {
			setMode("internal");
		} else {
			setMode("external");
			setUrl(href.startsWith("https://") ? href : "");
		}
		setLabel(initialLabel);
		setSearch("");
	}, [open, initialHref, initialLabel]);

	const searchQuery = useQuery({
		...orpc.globalSearch.search.queryOptions({
			input: { query: trimmedSearch },
		}),
		enabled: open && mode === "internal" && canSearch,
	});

	const internalHits =
		searchQuery.data?.items.filter((item) =>
			INTERNAL_HIT_TYPES.has(item.type),
		) ?? [];

	function applyExternal() {
		const normalized = normalizeHttpsUrl(url);
		if (!normalized) {
			return;
		}
		const text = label.trim() || normalized;
		onApply({ href: normalized, label: text });
		onOpenChange(false);
	}

	function applyInternal(hit: GlobalSearchHit) {
		if (!isAllowedRichLinkHref(hit.href)) {
			return;
		}
		const text = label.trim() || hit.title;
		onApply({ href: hit.href, label: text });
		onOpenChange(false);
	}

	const externalValid = normalizeHttpsUrl(url) != null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Insert link</DialogTitle>
					<DialogDescription>
						External links must use HTTPS. On-site links search books, posts,
						members, and more.
					</DialogDescription>
				</DialogHeader>

				<div className="flex gap-1 border border-border bg-muted/20 p-1">
					<Button
						type="button"
						size="sm"
						variant={mode === "external" ? "secondary" : "ghost"}
						className="flex-1"
						onClick={() => setMode("external")}
					>
						External (HTTPS)
					</Button>
					<Button
						type="button"
						size="sm"
						variant={mode === "internal" ? "secondary" : "ghost"}
						className="flex-1"
						onClick={() => setMode("internal")}
					>
						On-site
					</Button>
				</div>

				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="rich-link-label">Display text</FieldLabel>
						<Input
							id="rich-link-label"
							value={label}
							onChange={(event) => setLabel(event.target.value)}
							placeholder="Link label"
						/>
					</Field>

					{mode === "external" ? (
						<Field>
							<FieldLabel htmlFor="rich-link-url">URL</FieldLabel>
							<Input
								id="rich-link-url"
								value={url}
								onChange={(event) => setUrl(event.target.value)}
								placeholder="https://…"
								inputMode="url"
								autoComplete="off"
							/>
						</Field>
					) : (
						<Field>
							<FieldLabel htmlFor="rich-link-search">Search</FieldLabel>
							<Input
								id="rich-link-search"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Book, post, member…"
								autoComplete="off"
							/>
							<div className="mt-2 max-h-48 overflow-y-auto border border-border">
								{!canSearch ? (
									<p className="px-3 py-2 text-muted-foreground text-xs">
										Type at least 2 characters to search.
									</p>
								) : searchQuery.isFetching ? (
									<div className="space-y-2 p-2">
										<Skeleton className="h-8 w-full" />
										<Skeleton className="h-8 w-full" />
									</div>
								) : internalHits.length === 0 ? (
									<p className="px-3 py-2 text-muted-foreground text-xs">
										No on-site matches.
									</p>
								) : (
									<ul>
										{internalHits.map((hit) => (
											<li key={`${hit.type}-${hit.href}`}>
												<button
													type="button"
													className={cn(
														"flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm",
														"hover:bg-muted/60",
													)}
													onClick={() => applyInternal(hit)}
												>
													<span className="font-medium">{hit.title}</span>
													<span className="text-muted-foreground text-xs">
														{hit.description} · {hit.href}
													</span>
												</button>
											</li>
										))}
									</ul>
								)}
							</div>
						</Field>
					)}
				</FieldGroup>

				<DialogFooter className="gap-2 sm:justify-between">
					{onRemove && initialHref ? (
						<Button
							type="button"
							variant="ghost"
							className="text-destructive"
							onClick={() => {
								onRemove();
								onOpenChange(false);
							}}
						>
							Remove link
						</Button>
					) : (
						<span />
					)}
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						{mode === "external" ? (
							<Button
								type="button"
								disabled={!externalValid}
								onClick={applyExternal}
							>
								Apply
							</Button>
						) : null}
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
