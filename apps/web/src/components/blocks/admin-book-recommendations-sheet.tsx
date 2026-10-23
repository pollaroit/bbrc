"use client";

import type { BookRecommendationItem } from "@bbrc/api/modules/book/book-recommendation.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@bbrc/ui/components/sheet";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDown, Sparkles } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { OpenLibraryWorkTitleLink } from "@/components/blocks/open-library-work-title-link";
import { authClient } from "@/lib/auth-client";
import { consumeBookRecommendationsStream } from "@/lib/book-recommendations-stream";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const RECOMMENDATION_SLOT_COUNT = 5;

function coverUrl(coverId: number | null) {
	if (coverId == null) {
		return null;
	}

	return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
}

function formatAuthors(authors: string[]) {
	if (authors.length === 0) {
		return "Unknown author";
	}

	return authors.join(", ");
}

type RecommendationRowProps = {
	item: BookRecommendationItem;
	inCatalog: boolean;
	onReject: () => void;
	onBlock: () => void;
	isReplacing: boolean;
	onNavigateAdd: () => void;
};

function RecommendationRow({
	item,
	inCatalog,
	onReject,
	onBlock,
	isReplacing,
	onNavigateAdd,
}: RecommendationRowProps) {
	const cover = coverUrl(item.coverId);

	return (
		<li
			className={cn(
				"flex gap-3 border border-border p-3",
				isReplacing && "opacity-60",
			)}
		>
			<div className="relative size-16 shrink-0 overflow-hidden bg-muted">
				{cover ? (
					<Image
						src={cover}
						alt=""
						fill
						className="object-cover"
						sizes="64px"
					/>
				) : (
					<div className="flex size-full items-center justify-center text-muted-foreground text-xs">
						No cover
					</div>
				)}
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<div className="space-y-1">
					<div className="flex flex-wrap items-center gap-2">
						<OpenLibraryWorkTitleLink olid={item.olid} title={item.title} />
						<Badge variant="secondary" className="font-normal text-xs">
							{item.confidenceScore}% match
						</Badge>
					</div>
					<p className="text-muted-foreground text-xs">
						{formatAuthors(item.authors)}
						{item.publishedIn != null ? ` · ${item.publishedIn}` : null}
					</p>
					{item.reasons.length > 0 ? (
						<p className="text-muted-foreground text-xs leading-relaxed">
							{item.reasons.join(" · ")}
						</p>
					) : null}
				</div>
				<div className="flex flex-wrap gap-2">
					{inCatalog ? (
						<Button type="button" size="sm" variant="secondary" disabled>
							Added
						</Button>
					) : (
						<Button
							render={
								<Link
									href={
										`/books/new?olid=${encodeURIComponent(item.olid)}` as Route
									}
								/>
							}
							nativeButton={false}
							size="sm"
							className="w-fit"
							onClick={onNavigateAdd}
						>
							Add to library
						</Button>
					)}
					{inCatalog ? null : (
						<div className="flex w-fit">
							<LoadingButton
								type="button"
								size="sm"
								variant="outline"
								className="border-r-0"
								loading={isReplacing}
								loadingText="Finding…"
								onClick={onReject}
							>
								Reject
							</LoadingButton>
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="px-2"
											disabled={isReplacing}
											aria-label="More dismiss actions"
										/>
									}
								>
									<ChevronDown className="size-4" />
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="min-w-52">
									<DropdownMenuItem variant="destructive" onClick={onBlock}>
										Block from recommendations
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					)}
				</div>
			</div>
		</li>
	);
}

export function AdminBookRecommendationsSheet() {
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const [open, setOpen] = useState(false);
	const [items, setItems] = useState<BookRecommendationItem[]>([]);
	const [streamError, setStreamError] = useState<string | null>(null);
	const [isStreaming, setIsStreaming] = useState(false);
	const [streamCached, setStreamCached] = useState(false);
	const [replacingOlid, setReplacingOlid] = useState<string | null>(null);
	const [streamCatalogOlids, setStreamCatalogOlids] = useState<string[]>([]);
	const streamGenerationRef = useRef(0);
	const sessionExcludedOlidsRef = useRef<Set<string>>(new Set());

	const isAdmin = session?.user.isAdmin === true;

	const { data: catalogData, refetch: refetchCatalogOlids } = useQuery({
		...orpc.book.listCatalogOlids.queryOptions(),
		enabled: isAdmin && open,
		staleTime: 15_000,
		refetchOnWindowFocus: true,
	});

	const inCatalogSet = useMemo(() => {
		const set = new Set(catalogData?.olids ?? []);
		for (const olid of streamCatalogOlids) {
			set.add(olid);
		}
		return set;
	}, [catalogData?.olids, streamCatalogOlids]);

	const startStream = useCallback(() => {
		const generation = streamGenerationRef.current + 1;
		streamGenerationRef.current = generation;
		setItems([]);
		setStreamCatalogOlids([]);
		sessionExcludedOlidsRef.current = new Set();
		setStreamError(null);
		setIsStreaming(true);
		setStreamCached(false);

		const abort = new AbortController();

		void consumeBookRecommendationsStream(abort.signal, (event) => {
			if (streamGenerationRef.current !== generation) {
				return;
			}

			if (event.type === "meta") {
				setStreamCatalogOlids(event.catalogOlids);
				setStreamCached(event.cached);
				void refetchCatalogOlids();
			}

			if (event.type === "item") {
				sessionExcludedOlidsRef.current.add(event.item.olid);
				setItems((current) => {
					if (current.some((row) => row.olid === event.item.olid)) {
						return current;
					}

					return [...current, event.item];
				});
			}
		})
			.catch((error: unknown) => {
				if (streamGenerationRef.current !== generation) {
					return;
				}

				const message =
					error instanceof Error
						? error.message
						: "Could not load recommendations";
				setStreamError(message);
			})
			.finally(() => {
				if (streamGenerationRef.current === generation) {
					setIsStreaming(false);
				}
			});

		return () => abort.abort();
	}, [refetchCatalogOlids]);

	useEffect(() => {
		if (!open || !isAdmin) {
			return;
		}

		return startStream();
	}, [open, isAdmin, startStream]);

	const replaceMutation = useMutation(
		orpc.book.recommendOpenLibraryReplace.mutationOptions({
			onError: (error) => {
				toast.error(error.message ?? "Could not find a replacement.");
			},
		}),
	);

	const blockMutation = useMutation(
		orpc.book.blockOpenLibraryWork.mutationOptions({
			onError: (error) => {
				toast.error(error.message ?? "Could not block this work.");
			},
		}),
	);

	if (isSessionPending || !isAdmin) {
		return null;
	}

	const pendingSlotCount = Math.max(
		0,
		RECOMMENDATION_SLOT_COUNT - items.length,
	);

	const swapRecommendation = async (rejectOlid: string) => {
		const visibleOlids = items.map((item) => item.olid);
		if (!visibleOlids.includes(rejectOlid)) {
			return false;
		}

		const result = await replaceMutation.mutateAsync({
			rejectOlid,
			visibleOlids,
			sessionExcludedOlids: [...sessionExcludedOlidsRef.current],
		});

		if (!result.item) {
			toast.error("No other matching works found right now.");
			return false;
		}

		sessionExcludedOlidsRef.current.add(result.item.olid);

		setItems((current) =>
			current.map((item) => (item.olid === rejectOlid ? result.item! : item)),
		);

		return true;
	};

	const handleReject = async (rejectOlid: string) => {
		setReplacingOlid(rejectOlid);

		try {
			await swapRecommendation(rejectOlid);
		} finally {
			setReplacingOlid(null);
		}
	};

	const handleBlock = async (item: BookRecommendationItem) => {
		setReplacingOlid(item.olid);

		try {
			await blockMutation.mutateAsync({
				olid: item.olid,
				title: item.title,
			});
			sessionExcludedOlidsRef.current.add(item.olid);

			const swapped = await swapRecommendation(item.olid);
			if (swapped) {
				toast.success("Work blocked and replaced.");
			} else {
				setItems((current) => current.filter((row) => row.olid !== item.olid));
				toast.success("Work blocked.");
			}
		} finally {
			setReplacingOlid(null);
		}
	};

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => setOpen(true)}
			>
				<Sparkles data-icon="inline-start" />
				Recommend
			</Button>

			<Sheet
				open={open}
				onOpenChange={(next) => {
					setOpen(next);
					if (!next) {
						streamGenerationRef.current += 1;
					}
				}}
			>
				<SheetContent side="right" className="flex flex-col gap-0 sm:max-w-md">
					<SheetHeader>
						<SheetTitle>Recommended for the club</SheetTitle>
						<SheetDescription>
							Picks stream in one at a time from Open Library based on your
							catalog. Reject swaps another match; Block hides a work from all
							future picks (
							<Link
								href={"/books/blocked" as Route}
								className="text-foreground underline-offset-2 hover:underline"
							>
								manage blocked works
							</Link>
							).
						</SheetDescription>
					</SheetHeader>
					<div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
						{streamError ? (
							<div className="flex flex-col gap-3">
								<p className="text-muted-foreground text-sm">{streamError}</p>
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="w-fit"
									onClick={() => startStream()}
								>
									Try again
								</Button>
							</div>
						) : items.length === 0 && !isStreaming ? (
							<p className="text-muted-foreground text-sm">
								No recommendations right now. Add more books to the catalog or
								try again later.
							</p>
						) : (
							<ul className="flex flex-col gap-3">
								{items.map((item) => (
									<RecommendationRow
										key={item.olid}
										item={item}
										inCatalog={inCatalogSet.has(item.olid)}
										isReplacing={replacingOlid === item.olid}
										onReject={() => void handleReject(item.olid)}
										onBlock={() => void handleBlock(item)}
										onNavigateAdd={() => setOpen(false)}
									/>
								))}
								{isStreaming
									? Array.from({ length: pendingSlotCount }, (_, index) => (
											<li
												key={`pending-${index}`}
												className="border border-border border-dashed p-3"
											>
												<Skeleton className="h-24 w-full" />
												<p className="mt-2 text-muted-foreground text-xs">
													Scoring next match…
												</p>
											</li>
										))
									: null}
							</ul>
						)}
						{streamCached && items.length > 0 ? (
							<p className="mt-4 text-muted-foreground text-xs">
								Catalog profile cached — fresh Open Library scoring per title.
							</p>
						) : null}
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
