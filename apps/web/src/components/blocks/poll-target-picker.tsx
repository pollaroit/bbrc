"use client";

import type { PostPollOptionKind } from "@bbrc/shared";
import { Input } from "@bbrc/ui/components/input";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
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
				/>
			</div>

			{query.length === 0 ? null : results.isPending ? (
				<Skeleton className="h-16 w-full" aria-hidden />
			) : (results.data?.items.length ?? 0) === 0 ? (
				<p className="text-muted-foreground text-sm">Nothing found.</p>
			) : (
				<ul className="max-h-60 divide-y divide-border overflow-y-auto border border-border">
					{results.data?.items.map((item) => {
						const used = taken?.has(item.key) ?? false;
						const reason = used ? "Already on the poll" : item.disabledReason;
						const cover = bookCoverUrl(item.coverId, "S");
						return (
							<li key={item.key}>
								<button
									type="button"
									disabled={reason != null}
									onClick={() => {
										onPick({ ...item, kind });
										setSearch("");
									}}
									className="flex w-full items-center gap-3 p-2.5 text-start transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent"
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
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
