"use client";

import type { GlobalSearchHit } from "@bbrc/api/modules/search/global-search.schema";
import { internalLinkRefFromHref } from "@bbrc/shared";
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
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Check, Globe, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { GlobalSearchThumb } from "@/components/blocks/global-search-thumb";
import {
	ExternalLinkCard,
	LinkPreviewCard,
} from "@/components/blocks/link-preview-card";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { describeExternalUrl, toSitePath } from "@/lib/link-preview/site-path";
import { normalizeHttpsUrl } from "@/lib/rich-link";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export type RichTextLinkDisplay = "link" | "card";

export type RichTextLinkDialogResult = {
	href: string;
	label: string;
	display: RichTextLinkDisplay;
};

type RichTextLinkDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialHref?: string;
	initialLabel?: string;
	/** Text is selected in the editor, so the link wraps it and no label is needed. */
	hasSelection?: boolean;
	onApply: (result: RichTextLinkDialogResult) => void;
	onRemove?: () => void;
};

type Tab = "site" | "web";

/** Accepts `example.com/page` as well as `https://example.com/page`. */
function toHttpsUrl(input: string): string | null {
	const trimmed = input.trim();
	if (!trimmed) return null;
	const direct = normalizeHttpsUrl(trimmed);
	if (direct) return direct;
	if (
		!/^[a-z][a-z0-9+.-]*:/i.test(trimmed) &&
		/^[^\s/]+\.[^\s/]{2,}/.test(trimmed)
	) {
		return normalizeHttpsUrl(`https://${trimmed}`);
	}
	return null;
}

export function RichTextLinkDialog({
	open,
	onOpenChange,
	initialHref = "",
	initialLabel = "",
	hasSelection = false,
	onApply,
	onRemove,
}: RichTextLinkDialogProps) {
	const [tab, setTab] = useState<Tab>("site");
	const [display, setDisplay] = useState<RichTextLinkDisplay>("link");
	const [label, setLabel] = useState("");
	const [search, setSearch] = useState("");
	const [url, setUrl] = useState("");
	const [picked, setPicked] = useState<{
		href: string;
		title: string;
	} | null>(null);
	const debouncedSearch = useDebouncedValue(search.trim(), 250);
	const editing = initialHref.trim().length > 0;

	useEffect(() => {
		if (!open) return;
		const href = toSitePath(initialHref);
		setDisplay("link");
		setLabel(initialLabel);
		setSearch("");
		setUrl("");
		setPicked(null);
		if (href.startsWith("/")) {
			setTab("site");
			setPicked({ href, title: initialLabel || href });
		} else if (href) {
			setTab("web");
			setUrl(href);
		} else {
			setTab("site");
		}
	}, [open, initialHref, initialLabel]);

	// A pasted address of a page on this site counts as an on-site link.
	const pastedSitePath = (() => {
		const path = toSitePath(search.trim());
		return path.startsWith("/") && internalLinkRefFromHref(path) ? path : null;
	})();

	const hits = useQuery({
		...orpc.globalSearch.search.queryOptions({
			input: { query: debouncedSearch },
		}),
		enabled: open && tab === "site" && debouncedSearch.length >= 2 && !picked,
	});
	const results = (hits.data?.items ?? [])
		.filter((hit) => internalLinkRefFromHref(hit.href) != null)
		.slice(0, 8);

	const webUrl = toHttpsUrl(url);
	const debouncedWebUrl = useDebouncedValue(webUrl, 700);
	const webSitePath =
		webUrl && toSitePath(webUrl).startsWith("/") ? toSitePath(webUrl) : null;
	const target =
		tab === "site"
			? (picked?.href ?? null)
			: webSitePath
				? webSitePath
				: webUrl;
	const targetTitle =
		tab === "site"
			? picked?.title
			: webUrl
				? describeExternalUrl(webUrl).host
				: "";

	function apply() {
		if (!target) return;
		onApply({
			href: target,
			label: label.trim() || targetTitle || target,
			display,
		});
		onOpenChange(false);
	}

	function pickHit(hit: GlobalSearchHit) {
		setPicked({ href: hit.href, title: hit.title });
		setSearch("");
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{editing ? "Edit link" : "Add a link"}</DialogTitle>
					<DialogDescription>
						Link to a page on BBRC, or to another website.
					</DialogDescription>
				</DialogHeader>

				<SegmentedControl<Tab>
					label="Where the link goes"
					value={tab}
					onChange={setTab}
					options={[
						{ id: "site", label: "On BBRC" },
						{ id: "web", label: "Web" },
					]}
				/>

				{tab === "site" ? (
					<div className="flex flex-col gap-3">
						{picked ? (
							<div className="flex flex-col gap-2">
								<LinkPreviewCard
									href={picked.href}
									variant="compact"
									asStatic
								/>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="w-fit"
									onClick={() => setPicked(null)}
								>
									Choose something else
								</Button>
							</div>
						) : (
							<>
								<div className="relative">
									<Search
										className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
										aria-hidden
									/>
									<Input
										value={search}
										onChange={(event) => setSearch(event.target.value)}
										placeholder="Search books, members, posts, shelves…"
										aria-label="Search BBRC"
										autoComplete="off"
										autoFocus
										className="ps-9"
									/>
								</div>
								{pastedSitePath ? (
									<button
										type="button"
										onClick={() => {
											setPicked({
												href: pastedSitePath,
												title: pastedSitePath,
											});
											setSearch("");
										}}
										className="flex items-center gap-2 border border-border border-dashed p-3 text-start text-sm transition-colors hover:bg-muted/40"
									>
										<Check className="size-4" aria-hidden />
										Use this BBRC page
									</button>
								) : null}
								{debouncedSearch.length < 2 ? (
									<p className="text-muted-foreground text-sm">
										Type at least 2 letters, or paste the address of a BBRC
										page.
									</p>
								) : hits.isFetching ? (
									<Skeleton className="h-24 w-full" aria-hidden />
								) : results.length === 0 ? (
									<p className="text-muted-foreground text-sm">
										Nothing on BBRC matches “{debouncedSearch}”.
									</p>
								) : (
									<ul className="max-h-64 divide-y divide-border overflow-y-auto border border-border">
										{results.map((hit) => (
											<li key={`${hit.type}-${hit.href}`}>
												<button
													type="button"
													onClick={() => pickHit(hit)}
													className="flex w-full items-center gap-3 p-2.5 text-start transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
												>
													<GlobalSearchThumb hit={hit} />
													<span className="flex min-w-0 flex-col">
														<span className="truncate font-medium text-sm">
															{hit.title}
														</span>
														<span className="truncate text-muted-foreground text-xs">
															{hit.description}
														</span>
													</span>
												</button>
											</li>
										))}
									</ul>
								)}
							</>
						)}
					</div>
				) : (
					<div className="flex flex-col gap-3">
						<div className="relative">
							<Globe
								className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
								aria-hidden
							/>
							<Input
								value={url}
								onChange={(event) => setUrl(event.target.value)}
								placeholder="example.com/article"
								aria-label="Web address"
								inputMode="url"
								autoComplete="off"
								autoFocus
								className="ps-9"
								aria-invalid={url.trim().length > 0 && webUrl == null}
							/>
						</div>
						{url.trim().length > 0 && webUrl == null ? (
							<p className="text-destructive text-xs">
								Enter a secure address, like https://example.com. Only https
								links are allowed.
							</p>
						) : null}
						{webSitePath ? (
							<LinkPreviewCard href={webSitePath} variant="compact" asStatic />
						) : webUrl ? (
							<ExternalLinkCard
								href={webUrl}
								variant="compact"
								asStatic
								// Wait until the address stops changing before asking the server about it.
								enabled={debouncedWebUrl === webUrl}
							/>
						) : null}
					</div>
				)}

				<div className="flex flex-col gap-3 border-border border-t pt-4">
					<label
						htmlFor="rich-link-label"
						className="flex flex-col gap-1.5 font-medium text-sm"
					>
						Text to show
						<Input
							id="rich-link-label"
							value={label}
							onChange={(event) => setLabel(event.target.value)}
							placeholder={
								hasSelection && display === "link"
									? "Uses the text you selected"
									: (targetTitle ?? "The name of the link")
							}
							disabled={hasSelection && display === "link"}
							autoComplete="off"
						/>
					</label>

					<div className="flex flex-col gap-1.5">
						<span className="font-medium text-sm">Show it as</span>
						<SegmentedControl<RichTextLinkDisplay>
							label="Show the link as"
							value={display}
							onChange={setDisplay}
							options={[
								{ id: "link", label: "Link in text" },
								{ id: "card", label: "Preview card" },
							]}
						/>
						<p
							className={cn(
								"text-muted-foreground text-xs",
								display === "card" && "text-foreground",
							)}
						>
							{display === "card"
								? "A card on its own line, with a picture and details. Up to 3 per post."
								: "Underlined text inside your sentence. Pointing at it shows a preview."}
						</p>
					</div>
				</div>

				<DialogFooter className="gap-2 sm:justify-between">
					{onRemove && editing ? (
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
						<Button type="button" disabled={!target} onClick={apply}>
							{editing ? "Update" : "Add link"}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
