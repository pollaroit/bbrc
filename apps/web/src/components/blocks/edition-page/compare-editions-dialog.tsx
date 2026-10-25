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
import Link from "next/link";
import { useState } from "react";
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

function CompareTable({
	bookSlug,
	items,
}: {
	bookSlug: string;
	items: EditionSummary[];
}) {
	const columns = `minmax(6.5rem,8rem) repeat(${items.length}, minmax(9rem,1fr))`;
	return (
		<div className="overflow-x-auto">
			<div
				className="grid min-w-max gap-px border border-border bg-border text-sm"
				style={{ gridTemplateColumns: columns }}
			>
				<div className="bg-card" />
				{items.map((item) => {
					const thumb = coverSrc(item.cover, "M");
					return (
						<Link
							key={item.key}
							href={editionPath(bookSlug, item.key) as Route}
							className="flex flex-col items-start gap-2 bg-card p-3 hover:bg-muted/40"
						>
							<span
								className={cn(
									"relative block aspect-2/3 w-16",
									bookCoverFrameClassName,
								)}
							>
								{thumb ? (
									<Image
										src={thumb}
										alt=""
										fill
										className="object-cover"
										sizes="64px"
									/>
								) : null}
							</span>
							<span className="flex flex-col gap-1">
								<span className="font-medium leading-snug underline-offset-4 hover:underline">
									{item.label}
								</span>
								{item.isClubFavourite ? (
									<span className="inline-flex items-center gap-1 text-warning-ink text-xs">
										<Star className="size-3" aria-hidden />
										Club favourite
									</span>
								) : null}
							</span>
						</Link>
					);
				})}
				{ROWS.map((row) => {
					const values = items.map(row.value);
					const differs = new Set(values).size > 1;
					return (
						<div key={row.label} className="contents">
							<div className="bg-card p-3 text-muted-foreground">
								{row.label}
							</div>
							{values.map((value, index) => (
								<div
									key={items[index]?.key ?? index}
									className={cn(
										"bg-card p-3 tabular-nums",
										differs && "bg-info/10",
									)}
								>
									{value}
								</div>
							))}
						</div>
					);
				})}
			</div>
			<p className="mt-2 text-muted-foreground text-xs">
				Tinted cells are where the editions differ.
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
			<DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>Compare editions</DialogTitle>
					<DialogDescription>
						Pages, language, who published it and how long members take.
					</DialogDescription>
				</DialogHeader>
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
				<DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-3xl">
					<DialogHeader>
						<DialogTitle>Compare editions</DialogTitle>
						<DialogDescription>
							{comparing
								? `${currentLabel} next to your choices.`
								: "Pick one or two editions to put next to this one."}
						</DialogDescription>
					</DialogHeader>
					{comparing ? (
						<InlineCompare
							bookSlug={bookSlug}
							keys={[currentKey, ...picked]}
							onBack={() => setComparing(false)}
						/>
					) : (
						<div className="flex flex-col gap-3">
							<ul className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto border border-border">
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
													className="size-4 accent-primary"
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
							<div className="flex justify-end">
								<Button
									type="button"
									disabled={picked.length === 0}
									onClick={() => setComparing(true)}
								>
									Compare {picked.length + 1}
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}

function InlineCompare({
	bookSlug,
	keys,
	onBack,
}: {
	bookSlug: string;
	keys: string[];
	onBack: () => void;
}) {
	const query = useQuery({
		...orpc.edition.compare.queryOptions({ input: { bookSlug, keys } }),
		staleTime: 60_000,
	});
	return (
		<div className="flex flex-col gap-3">
			{query.isPending ? (
				<Skeleton className="h-64 w-full" aria-hidden />
			) : query.isError ? (
				<p className="text-destructive text-sm">
					Could not compare these editions. Try again in a moment.
				</p>
			) : (
				<CompareTable bookSlug={bookSlug} items={query.data.items} />
			)}
			<div>
				<Button type="button" variant="ghost" size="sm" onClick={onBack}>
					Choose different editions
				</Button>
			</div>
		</div>
	);
}
