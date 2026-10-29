"use client";

import type { PostPollOptionKind } from "@bbrc/shared";
import { Input } from "@bbrc/ui/components/input";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { bookCoverUrl } from "@/lib/book-cover";
import { countryFlag } from "@/lib/poll/format";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export type PollTargetPick = {
	kind: Exclude<PostPollOptionKind, "text">;
	key: string;
	label: string;
	sublabel: string | null;
	coverId: number | null;
	image: string | null;
};

type PollTargetPickerProps = {
	kind: Exclude<PostPollOptionKind, "text">;
	onPick: (pick: PollTargetPick) => void;
	/** Keys that are already on the poll; shown but not pickable. */
	taken?: ReadonlySet<string>;
	autoFocus?: boolean;
	className?: string;
};

const noun = {
	book: "books",
	author: "authors",
	series: "series",
	country: "countries",
	user: "members",
} as const;

/** Search the club for something to use as a poll option. */
export function PollTargetPicker({
	kind,
	onPick,
	taken,
	autoFocus,
	className,
}: PollTargetPickerProps) {
	const [search, setSearch] = useState("");
	const query = useDebouncedValue(search.trim(), 250);

	const results = useQuery({
		...orpc.postPoll.searchTargets.queryOptions({ input: { kind, query } }),
		enabled: query.length > 0,
	});

	const listId = useId();
	const rowRefs = useRef<Map<number, HTMLElement>>(new Map());
	const items = results.data?.items ?? [];
	const pickable = (item: (typeof items)[number]) =>
		!(taken?.has(item.key) ?? false) && item.disabledReason == null;
	// The highlighted row: the one the arrows moved to, else the first that can be picked.
	const [activeKey, setActiveKey] = useState<string | null>(null);
	const keyed = items.findIndex(
		(item) => item.key === activeKey && pickable(item),
	);
	const active = keyed >= 0 ? keyed : items.findIndex(pickable);

	useEffect(() => {
		rowRefs.current.get(active)?.scrollIntoView({ block: "nearest" });
	}, [active]);

	function step(direction: 1 | -1) {
		let next = active;
		for (let count = 0; count < items.length; count++) {
			next = (next + direction + items.length) % items.length;
			const item = items[next];
			if (item && pickable(item)) {
				setActiveKey(item.key);
				return;
			}
		}
	}

	function pick(index: number) {
		const item = items[index];
		if (!item || !pickable(item)) return;
		onPick({ ...item, kind });
		setSearch("");
		setActiveKey(null);
	}

	return (
		<div className={cn("flex flex-col gap-2", className)}>
			<div className="relative">
				<Search
					className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden
				/>
				<Input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder={`Search ${noun[kind]}…`}
					aria-label={`Search ${noun[kind]}`}
					autoComplete="off"
					autoFocus={autoFocus}
					className="ps-9"
					role="combobox"
					aria-expanded={items.length > 0}
					aria-controls={listId}
					aria-autocomplete="list"
					aria-activedescendant={
						active >= 0 ? `${listId}-${active}` : undefined
					}
					onKeyDown={(event) => {
						if (event.key === "ArrowDown") {
							event.preventDefault();
							step(1);
						} else if (event.key === "ArrowUp") {
							event.preventDefault();
							step(-1);
						} else if (event.key === "Enter" && active >= 0) {
							// Picking must not also submit a form around the picker.
							event.preventDefault();
							pick(active);
						} else if (event.key === "Escape" && search) {
							event.stopPropagation();
							setSearch("");
						}
					}}
				/>
			</div>

			{query.length === 0 ? null : results.isPending ? (
				<Skeleton className="h-16 w-full" aria-hidden />
			) : items.length === 0 ? (
				<p className="text-muted-foreground text-sm">Nothing found.</p>
			) : (
				<div
					id={listId}
					role="listbox"
					aria-label={`Matching ${noun[kind]}`}
					className="max-h-60 divide-y divide-border overflow-y-auto border border-border"
				>
					{items.map((item, index) => {
						const used = taken?.has(item.key) ?? false;
						const reason = used ? "Already on the poll" : item.disabledReason;
						const cover = bookCoverUrl(item.coverId, "S");
						const isActive = index === active;
						return (
							<div
								key={item.key}
								id={`${listId}-${index}`}
								ref={(node) => {
									if (node) rowRefs.current.set(index, node);
									else rowRefs.current.delete(index);
								}}
								role="option"
								tabIndex={-1}
								aria-selected={isActive}
								aria-disabled={reason != null}
								onMouseMove={() => {
									if (reason == null && !isActive) setActiveKey(item.key);
								}}
								// The input keeps the focus; the arrow keys and Enter do the same.
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => pick(index)}
								// Keyboard use goes through the input (arrows and Enter); this covers a stray key.
								onKeyDown={(event) => {
									if (event.key === "Enter") pick(index);
								}}
								className={cn(
									"flex w-full cursor-pointer items-center gap-3 p-2.5 text-start transition-colors",
									isActive && "bg-muted/60",
									reason != null && "cursor-not-allowed opacity-55",
								)}
							>
								{kind === "book" ? (
									<span className="relative block aspect-2/3 w-7 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
										{cover ? (
											<Image
												src={cover}
												alt=""
												fill
												className="object-cover"
												sizes="28px"
											/>
										) : null}
									</span>
								) : kind === "user" ? (
									<UserAvatar
										user={{ name: item.label, image: item.image }}
										className="size-7"
									/>
								) : kind === "country" ? (
									<span className="grid size-7 place-items-center text-lg">
										{countryFlag(item.key)}
									</span>
								) : null}
								<span className="flex min-w-0 flex-1 flex-col">
									<span className="truncate font-medium text-sm">
										{item.label}
									</span>
									{item.sublabel ? (
										<span className="truncate text-muted-foreground text-xs">
											{item.sublabel}
										</span>
									) : null}
								</span>
								{reason ? (
									<span className="shrink-0 text-muted-foreground text-xs">
										{reason}
									</span>
								) : null}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
