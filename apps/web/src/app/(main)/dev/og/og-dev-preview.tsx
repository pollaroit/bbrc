/** biome-ignore-all lint/performance/noImgElement: dev-only OG preview */
"use client";

import { Copy, ExternalLink, ImageIcon, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ogPathFromPagePath } from "@/lib/seo/og/paths";
import { cn } from "@/lib/utils";

export type OgEntry = {
	id: string;
	label: string;
	/** Page path, or null when the database has no sample for it. */
	path: string | null;
	note?: string;
};

export type OgGroup = {
	id: string;
	label: string;
	entries: OgEntry[];
};

function OgCard({ entry, version }: { entry: OgEntry; version: number }) {
	const [copied, setCopied] = useState(false);

	if (!entry.path) {
		return (
			<article className="flex flex-col gap-2 border border-border border-dashed p-4">
				<h3 className="font-medium text-sm">{entry.label}</h3>
				<p className="flex items-center gap-2 text-muted-foreground text-xs">
					<ImageIcon className="size-4 shrink-0" aria-hidden />
					{entry.note ?? "No sample data."}
				</p>
			</article>
		);
	}

	const ogSrc = `${ogPathFromPagePath(entry.path)}?v=${version}`;

	return (
		<article className="flex flex-col gap-3 border border-border bg-card p-3">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h3 className="font-medium text-sm">{entry.label}</h3>
				<code className="max-w-full truncate text-muted-foreground text-xs">
					{entry.path}
				</code>
			</div>
			<div className="aspect-[1200/630] overflow-hidden border border-border bg-muted/30">
				<img
					src={ogSrc}
					alt={`Social card: ${entry.label}`}
					width={1200}
					height={630}
					loading="lazy"
					className="size-full object-cover"
				/>
			</div>
			<div className="flex flex-wrap items-center gap-3 text-xs">
				<a
					className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
					href={ogSrc}
					target="_blank"
					rel="noreferrer"
				>
					<ImageIcon className="size-3.5" aria-hidden />
					Image
				</a>
				<a
					className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
					href={entry.path}
					target="_blank"
					rel="noreferrer"
				>
					<ExternalLink className="size-3.5" aria-hidden />
					Page
				</a>
				<button
					type="button"
					className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
					onClick={() => {
						void navigator.clipboard.writeText(entry.path ?? "");
						setCopied(true);
						window.setTimeout(() => setCopied(false), 1200);
					}}
				>
					<Copy className="size-3.5" aria-hidden />
					{copied ? "Copied" : "Copy path"}
				</button>
			</div>
		</article>
	);
}

export function OgDevPreview({ groups }: { groups: OgGroup[] }) {
	const [query, setQuery] = useState("");
	const [activeGroup, setActiveGroup] = useState<string>("all");
	const [version, setVersion] = useState(() => Date.now());
	const [columns, setColumns] = useState<1 | 2>(2);

	const needle = query.trim().toLowerCase();

	const visibleGroups = useMemo(
		() =>
			groups
				.filter((group) => activeGroup === "all" || group.id === activeGroup)
				.map((group) => ({
					...group,
					entries: group.entries.filter(
						(item) =>
							!needle ||
							`${item.label} ${item.path ?? ""} ${group.label}`
								.toLowerCase()
								.includes(needle),
					),
				}))
				.filter((group) => group.entries.length > 0),
		[groups, activeGroup, needle],
	);

	const total = groups.reduce((sum, group) => sum + group.entries.length, 0);
	const shown = visibleGroups.reduce(
		(sum, group) => sum + group.entries.length,
		0,
	);
	const missing = groups.reduce(
		(sum, group) =>
			sum + group.entries.filter((item) => item.path == null).length,
		0,
	);

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
			<header className="flex flex-col gap-2">
				<h1 className="font-semibold text-2xl">Open Graph previews</h1>
				<p className="max-w-3xl text-muted-foreground text-sm leading-relaxed">
					Every page that has its own social card, rendered from real rows in
					this database. Images come from{" "}
					<code className="bg-muted px-1">/og/…</code>, which mirrors the page
					path. Story cards live at{" "}
					<a
						href="/dev/story"
						className="text-primary underline-offset-4 hover:underline"
					>
						/dev/story
					</a>
					.
				</p>
			</header>

			<div className="sticky top-14 z-20 flex flex-col gap-3 border border-border bg-background/95 p-3 backdrop-blur-sm">
				<div className="flex flex-wrap items-center gap-2">
					<label className="relative min-w-60 flex-1">
						<span className="sr-only">Search pages</span>
						<Search
							className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
							aria-hidden
						/>
						<input
							type="search"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search by name or path, e.g. vote, books, xp…"
							className="w-full border border-input bg-background py-2 pr-3 pl-9 text-sm"
						/>
					</label>
					<button
						type="button"
						className="inline-flex items-center gap-1.5 border border-input px-3 py-2 text-sm hover:bg-muted/50"
						onClick={() => setColumns((c) => (c === 2 ? 1 : 2))}
					>
						{columns === 2 ? "Larger cards" : "Smaller cards"}
					</button>
					<button
						type="button"
						className="inline-flex items-center gap-1.5 border border-input px-3 py-2 text-sm hover:bg-muted/50"
						onClick={() => setVersion(Date.now())}
					>
						<RefreshCw className="size-4" aria-hidden />
						Regenerate
					</button>
				</div>
				<div className="flex flex-wrap items-center gap-1.5">
					{[
						{ id: "all", label: "All", count: total },
						...groups.map((g) => ({
							id: g.id,
							label: g.label,
							count: g.entries.length,
						})),
					].map((chip) => (
						<button
							key={chip.id}
							type="button"
							aria-pressed={activeGroup === chip.id}
							onClick={() => setActiveGroup(chip.id)}
							className={cn(
								"border px-2.5 py-1 text-xs transition-colors",
								activeGroup === chip.id
									? "border-foreground bg-foreground text-background"
									: "border-border hover:bg-muted/50",
							)}
						>
							{chip.label}{" "}
							<span className="tabular-nums opacity-70">{chip.count}</span>
						</button>
					))}
				</div>
				<p className="text-muted-foreground text-xs tabular-nums">
					Showing {shown} of {total}
					{missing > 0 ? ` · ${missing} without sample data` : ""}
				</p>
			</div>

			{visibleGroups.length === 0 ? (
				<p className="border border-border border-dashed px-4 py-10 text-center text-muted-foreground text-sm">
					Nothing matches “{query}”.
				</p>
			) : (
				visibleGroups.map((group) => (
					<section
						key={group.id}
						className="flex flex-col gap-4"
						aria-labelledby={`og-group-${group.id}`}
					>
						<h2
							id={`og-group-${group.id}`}
							className="border-border border-b pb-2 font-semibold text-lg"
						>
							{group.label}{" "}
							<span className="font-normal text-muted-foreground text-sm tabular-nums">
								{group.entries.length}
							</span>
						</h2>
						<div
							className={cn(
								"grid gap-4",
								columns === 2 ? "lg:grid-cols-2" : "grid-cols-1",
							)}
						>
							{group.entries.map((item) => (
								<OgCard
									key={`${group.id}:${item.id}`}
									entry={item}
									version={version}
								/>
							))}
						</div>
					</section>
				))
			)}
		</div>
	);
}
