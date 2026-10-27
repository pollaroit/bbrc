"use client";

import type { EditionSummary } from "@bbrc/api/modules/edition/edition.schema";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { GitCompareArrows, Star } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { bookCoverFrameClassName } from "@/lib/book-cover";
import { coverSrc, editionPath } from "@/lib/edition/format";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

/*
 * Two or three editions side by side. Where the editions disagree, the cell is
 * tinted, so the differences are what the eye finds.
 *
 * <CompareEditionsDialog bookSlug keys open onOpenChange />
 *   used by the editions list, which already knows which editions were ticked.
 * <CompareEditionsButton bookSlug currentKey candidates currentLabel />
 *   used by the edition page: pick one or two others to compare with this one.
 */

/** Header and footer stay put; only the middle scrolls, so the buttons are always on screen. */
const DIALOG_SHELL =
	"flex max-h-[90dvh] min-w-0 flex-col gap-3 overflow-hidden p-0 sm:max-w-3xl";
const DIALOG_BODY =
	"min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4";
const DIALOG_FOOTER =
	"flex flex-wrap items-center justify-end gap-2 border-border border-t px-4 py-3";

type Row = {
	label: string;
	value: (item: EditionSummary) => string;
};

const ROWS: Row[] = [
	{ label: "Language", value: (item) => item.language ?? "—" },
	{ label: "Format", value: (item) => item.format ?? "—" },
	{ label: "Pages", value: (item) => (item.pages ? String(item.pages) : "—") },
	{
		label: "Published",
		value: (item) => (item.publishedYear ? String(item.publishedYear) : "—"),
	},
	{ label: "Publisher", value: (item) => item.publisher ?? "—" },
	{ label: "Translator", value: (item) => item.translator ?? "—" },
	{ label: "Readers", value: (item) => String(item.readers) },
	{
		label: "Time to finish",
		value: (item) =>
			item.averageDaysToFinish != null
				? `${item.averageDaysToFinish % 1 === 0 ? item.averageDaysToFinish : item.averageDaysToFinish.toFixed(1)} days`
				: "—",
	},
];

/** The differing rows, worked out once and used by both layouts. */
function rowsFor(items: EditionSummary[]) {
	return ROWS.map((row) => {
		const values = items.map(row.value);
		return { label: row.label, values, differs: new Set(values).size > 1 };
	});
}

function EditionHead({
	bookSlug,
	item,
}: {
	bookSlug: string;
	item: EditionSummary;
}) {
	const thumb = coverSrc(item.cover, "M");
	return (
		<Link
			href={editionPath(bookSlug, item.key) as Route}
			className="flex min-w-0 flex-col items-start gap-1.5 hover:bg-muted/40"
		>
			<span
				className={cn(
					"relative block aspect-2/3 w-10 shrink-0 sm:w-14",
					bookCoverFrameClassName,
				)}
			>
				{thumb ? (
					<Image
						src={thumb}
						alt=""
						fill
						className="object-cover"
						sizes="56px"
					/>
				) : null}
			</span>
			<span className="flex min-w-0 flex-col gap-0.5">
				<span className="line-clamp-3 break-words font-medium text-xs leading-snug underline-offset-4 hover:underline sm:text-sm">
					{item.label}
				</span>
				{item.isClubFavourite ? (
					<span className="inline-flex items-center gap-1 text-3xs text-warning-ink sm:text-xs">
						<Star className="size-3 shrink-0" aria-hidden />
						Club favourite
					</span>
				) : null}
			</span>
		</Link>
	);
}

/**
 * Editions side by side, compact enough to fit a phone without scrolling
 * sideways. Rows where the editions disagree are tinted.
 */
function CompareTable({
	bookSlug,
	items,
}: {
	bookSlug: string;
	items: EditionSummary[];
}) {
	const rows = rowsFor(items);
	const columns = `minmax(4.25rem,6.5rem) repeat(${items.length}, minmax(0,1fr))`;
	return (
		<div className="w-full min-w-0 max-w-full">
			<div
				className="grid w-full min-w-0 gap-px border border-border bg-border text-xs sm:text-sm"
				style={{ gridTemplateColumns: columns }}
			>
				<div className="bg-card" />
				{items.map((item) => (
					<div key={item.key} className="min-w-0 bg-card p-2 sm:p-3">
						<EditionHead bookSlug={bookSlug} item={item} />
					</div>
				))}
				{rows.map((row) => (
					<div key={row.label} className="contents">
						<div className="bg-card p-2 text-muted-foreground sm:p-3">
							{row.label}
						</div>
						{row.values.map((value, index) => (
							<div
								key={items[index]?.key ?? index}
								className={cn(
									"min-w-0 break-words bg-card p-2 tabular-nums sm:p-3",
									row.differs && "bg-info/10",
								)}
							>
								{value}
							</div>
						))}
					</div>
				))}
			</div>
			<p className="mt-2 text-muted-foreground text-xs">
				Tinted rows are where the editions differ.
			</p>
		</div>
	);
}

export function CompareEditionsDialog({
	bookSlug,
	keys,
	open,
	onOpenChange,
}: {
	bookSlug: string;
	keys: string[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const ready = keys.length >= 2 && keys.length <= 3;
	const query = useQuery({
		...orpc.edition.compare.queryOptions({ input: { bookSlug, keys } }),
		enabled: open && ready,
		staleTime: 60_000,
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className={DIALOG_SHELL}>
				<DialogHeader className="px-4 pt-4">
					<DialogTitle>Compare editions</DialogTitle>
					<DialogDescription>
						Pages, language, who published it and how long members take.
					</DialogDescription>
				</DialogHeader>
				<div className={DIALOG_BODY}>
					{!ready ? (
						<p className="text-muted-foreground text-sm">
							Pick two or three editions to compare.
						</p>
					) : query.isPending ? (
						<Skeleton className="h-64 w-full" aria-hidden />
					) : query.isError ? (
						<p className="text-destructive text-sm">
							Could not compare these editions. Try again in a moment.
						</p>
					) : (
						<CompareTable bookSlug={bookSlug} items={query.data.items} />
					)}
				</div>
				<div className={DIALOG_FOOTER}>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Close
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

/** On an edition page: choose one or two other editions to put next to this one. */
export function CompareEditionsButton({
	bookSlug,
	currentKey,
	currentLabel,
	candidates,
}: {
	bookSlug: string;
	currentKey: string;
	currentLabel: string;
	candidates: EditionSummary[];
}) {
	const [open, setOpen] = useState(false);
	const [picked, setPicked] = useState<string[]>([]);
	const [comparing, setComparing] = useState(false);

	function toggle(key: string) {
		setPicked((current) =>
			current.includes(key)
				? current.filter((value) => value !== key)
				: current.length >= 2
					? current
					: [...current, key],
		);
	}

	return (
		<>
			<Button
				type="button"
				size="sm"
				variant="outline"
				onClick={() => setOpen(true)}
			>
				<GitCompareArrows data-icon="inline-start" aria-hidden />
				Compare editions
			</Button>
			<Dialog
				open={open}
				onOpenChange={(next) => {
					setOpen(next);
					if (!next) setComparing(false);
				}}
			>
				<DialogContent className={DIALOG_SHELL}>
					<DialogHeader className="px-4 pt-4">
						<DialogTitle>Compare editions</DialogTitle>
						<DialogDescription>
							{comparing
								? `${currentLabel} next to your choices.`
								: "Pick one or two editions to put next to this one."}
						</DialogDescription>
					</DialogHeader>
					<div className={DIALOG_BODY}>
						{comparing ? (
							<InlineCompare
								bookSlug={bookSlug}
								keys={[currentKey, ...picked]}
							/>
						) : (
							<ul className="flex flex-col divide-y divide-border border border-border">
								{candidates.map((item) => {
									const checked = picked.includes(item.key);
									const disabled = !checked && picked.length >= 2;
									return (
										<li key={item.key}>
											<label
												className={cn(
													"flex cursor-pointer items-center gap-3 p-3 text-sm hover:bg-muted/40",
													disabled && "cursor-not-allowed opacity-50",
												)}
											>
												<input
													type="checkbox"
													checked={checked}
													disabled={disabled}
													onChange={() => toggle(item.key)}
													className="size-4 shrink-0 accent-primary"
												/>
												<span className="flex min-w-0 flex-col">
													<span className="truncate font-medium">
														{item.label}
													</span>
													<span className="truncate text-muted-foreground text-xs">
														{[
															item.language,
															item.format,
															item.pages ? `${item.pages} pp.` : null,
														]
															.filter(Boolean)
															.join(" · ")}
													</span>
												</span>
											</label>
										</li>
									);
								})}
							</ul>
						)}
					</div>
					<div className={DIALOG_FOOTER}>
						{comparing ? (
							<Button
								type="button"
								variant="outline"
								onClick={() => setComparing(false)}
							>
								Choose different editions
							</Button>
						) : (
							<>
								<Button
									type="button"
									variant="ghost"
									onClick={() => setOpen(false)}
								>
									Cancel
								</Button>
								<Button
									type="button"
									disabled={picked.length === 0}
									onClick={() => setComparing(true)}
								>
									Compare {picked.length + 1}
								</Button>
							</>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

function InlineCompare({
	bookSlug,
	keys,
}: {
	bookSlug: string;
	keys: string[];
}) {
	const query = useQuery({
		...orpc.edition.compare.queryOptions({ input: { bookSlug, keys } }),
		staleTime: 60_000,
	});
	return query.isPending ? (
		<Skeleton className="h-64 w-full" aria-hidden />
	) : query.isError ? (
		<p className="text-destructive text-sm">
			Could not compare these editions. Try again in a moment.
		</p>
	) : (
		<CompareTable bookSlug={bookSlug} items={query.data.items} />
	);
}
