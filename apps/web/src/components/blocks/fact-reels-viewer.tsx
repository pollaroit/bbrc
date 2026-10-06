"use client";

import type { FactReelItem } from "@bbrc/api/modules/fact/fact.schema";
import { Button } from "@bbrc/ui/components/button";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { client, orpc } from "@/utils/orpc";

const DECK_PULL_SIZE = 5;

type FactReelsMode = "discover" | "history";

function FactReelSlide({ item }: { item: FactReelItem }) {
	return (
		<section className="flex h-dvh w-full shrink-0 snap-start snap-always flex-col justify-center px-6 pt-[max(4rem,calc(env(safe-area-inset-top)+3rem))] pb-32">
			<p className="mb-3 font-medium text-muted-foreground text-xs uppercase tracking-widest">
				{item.category}
			</p>
			<p className="max-w-xl font-serif text-2xl leading-snug md:text-3xl">
				{item.body}
			</p>
			{item.image ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={item.image}
					alt=""
					className="mt-6 max-h-48 w-full max-w-md object-cover object-center"
				/>
			) : null}
			<a
				href={item.source}
				target="_blank"
				rel="noopener noreferrer"
				className="mt-6 max-w-xl truncate text-muted-foreground text-sm underline underline-offset-4"
			>
				Source
			</a>
		</section>
	);
}

function FactReelEndSlide({
	mode,
	username,
}: {
	mode: FactReelsMode;
	username?: string;
}) {
	return (
		<section className="flex h-dvh w-full shrink-0 snap-start snap-always flex-col items-center justify-center gap-3 px-6 text-center">
			<p className="font-medium text-lg">
				{mode === "history" ? "End of your replay" : "You&apos;re caught up"}
			</p>
			<p className="max-w-sm text-muted-foreground text-sm leading-relaxed">
				{mode === "history" ? (
					<>
						That&apos;s every fact you&apos;ve seen so far. New picks will show
						up here after you watch them in the main reels feed.
					</>
				) : (
					<>
						You&apos;ve seen all published facts for now. Check back when admins
						add more — your upvotes and downvotes help tailor what you see next.
					</>
				)}
			</p>
			<div className="mt-2 flex flex-wrap justify-center gap-2">
				{mode === "discover" && username ? (
					<Button
						nativeButton={false}
						render={<Link href={`/users/${username}/reels` as Route} />}
						variant="outline"
					>
						Replay seen facts
					</Button>
				) : null}
				<Button
					nativeButton={false}
					render={
						<Link
							href={
								(mode === "history" && username
									? `/users/${username}/reels`
									: "/") as Route
							}
						/>
					}
					variant="outline"
				>
					{mode === "history" ? "Back to replays" : "Back to feed"}
				</Button>
			</div>
		</section>
	);
}

function FactReelActions({
	item,
	mode,
	onVoteChange,
}: {
	item: FactReelItem;
	mode: FactReelsMode;
	onVoteChange: (factId: string, vote: "up" | "down" | null) => void;
}) {
	const [viewerVote, setViewerVote] = useState(item.viewerVote);

	useEffect(() => {
		setViewerVote(item.viewerVote);
	}, [item.viewerVote]);

	const voteMutation = useMutation(
		orpc.fact.setVote.mutationOptions({
			onMutate: ({ direction }) => {
				const snapshot = viewerVote;
				setViewerVote((current) => (current === direction ? null : direction));
				return snapshot;
			},
			onSuccess: (result) => {
				setViewerVote(result.viewerVote);
				onVoteChange(item.id, result.viewerVote);
			},
			onError: (error, _variables, snapshot) => {
				if (snapshot !== undefined) {
					setViewerVote(snapshot);
				}
				toast.error(error.message);
			},
		}),
	);

	async function handleShare() {
		const url = `${window.location.origin}/reels?fact=${item.id}`;
		try {
			if (navigator.share) {
				await navigator.share({ title: "BBRC fact", url });
				return;
			}
			await navigator.clipboard.writeText(url);
			toast.success("Link copied.");
		} catch {
			toast.error("Could not share.");
		}
	}

	return (
		<div
			className={cn(
				"pointer-events-none fixed z-50",
				mode === "history"
					? "right-[max(1.25rem,calc(env(safe-area-inset-right)+0.5rem))] bottom-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.75rem))]"
					: "inset-x-0 bottom-0 flex justify-end px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
			)}
		>
			<div className="pointer-events-auto flex flex-col gap-3">
				<Button
					type="button"
					size="icon-lg"
					variant="secondary"
					className="size-12 shadow-md"
					aria-label={viewerVote === "up" ? "Remove upvote" : "Upvote fact"}
					disabled={voteMutation.isPending}
					onClick={() =>
						voteMutation.mutate({ factId: item.id, direction: "up" })
					}
				>
					<ThumbsUp
						className={cn(
							"size-5",
							viewerVote === "up" && "fill-current text-foreground",
						)}
						aria-hidden
					/>
				</Button>
				<Button
					type="button"
					size="icon-lg"
					variant="secondary"
					className="size-12 shadow-md"
					aria-label={
						viewerVote === "down" ? "Remove downvote" : "Downvote fact"
					}
					disabled={voteMutation.isPending}
					onClick={() =>
						voteMutation.mutate({ factId: item.id, direction: "down" })
					}
				>
					<ThumbsDown
						className={cn(
							"size-5",
							viewerVote === "down" && "fill-current text-foreground",
						)}
						aria-hidden
					/>
				</Button>
				<Button
					type="button"
					size="icon-lg"
					variant="secondary"
					className="size-12 shadow-md"
					aria-label="Share fact"
					onClick={() => void handleShare()}
				>
					<Share2 className="size-5" aria-hidden />
				</Button>
			</div>
		</div>
	);
}

type FactReelsViewerProps = {
	mode?: FactReelsMode;
	username?: string;
	viewerUsername?: string;
	initialFactId?: string;
};

export function FactReelsViewer({
	mode = "discover",
	username,
	viewerUsername,
	initialFactId,
}: FactReelsViewerProps) {
	const router = useRouter();
	const scrollerRef = useRef<HTMLDivElement>(null);
	const deckRef = useRef<FactReelItem[]>([]);
	const seenIdsRef = useRef<Set<string>>(new Set());
	const loadingMoreRef = useRef(false);
	const exhaustedRef = useRef(false);
	const seenDeckAnchorRef = useRef(initialFactId);

	const [deck, setDeck] = useState<FactReelItem[]>([]);
	const [activeIndex, setActiveIndex] = useState(0);
	const [exhausted, setExhausted] = useState(false);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [votesByFactId, setVotesByFactId] = useState<
		Record<string, "up" | "down" | null>
	>({});

	deckRef.current = deck;
	exhaustedRef.current = exhausted;

	const markSeen = useCallback(
		async (factId: string) => {
			if (mode === "history") {
				return;
			}
			if (seenIdsRef.current.has(factId)) {
				return;
			}
			seenIdsRef.current.add(factId);

			try {
				await client.fact.markSeen({ factId });
			} catch {
				seenIdsRef.current.delete(factId);
			}
		},
		[mode],
	);

	const pullMore = useCallback(async () => {
		if (loadingMoreRef.current || exhaustedRef.current) {
			return;
		}

		if (mode === "history" && !username) {
			setLoadError("Missing member.");
			setLoading(false);
			return;
		}

		loadingMoreRef.current = true;

		try {
			const currentDeck = deckRef.current;
			const excludeFactIds = [
				...new Set([
					...seenIdsRef.current,
					...currentDeck.map((fact) => fact.id),
				]),
			];

			const isFirstHistoryPull = mode === "history" && currentDeck.length === 0;
			const anchorFactId = isFirstHistoryPull
				? seenDeckAnchorRef.current
				: undefined;
			if (isFirstHistoryPull) {
				seenDeckAnchorRef.current = undefined;
			}

			const result =
				mode === "history"
					? await client.fact.pullSeenDeck({
							username: username ?? "",
							limit: DECK_PULL_SIZE,
							excludeFactIds: anchorFactId ? [] : excludeFactIds,
							anchorFactId,
						})
					: await client.fact.pullDeck({
							limit: DECK_PULL_SIZE,
							excludeFactIds,
						});

			setDeck((previous) => {
				const existing = new Set(previous.map((item) => item.id));
				const fresh = result.items.filter((item) => !existing.has(item.id));
				return [...previous, ...fresh];
			});

			if (result.exhausted && result.items.length === 0) {
				exhaustedRef.current = true;
				setExhausted(true);
			} else if (result.exhausted) {
				exhaustedRef.current = true;
				setExhausted(true);
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Could not load facts";
			setLoadError(message);
		} finally {
			loadingMoreRef.current = false;
			setLoading(false);
		}
	}, [mode, username]);

	useEffect(() => {
		seenIdsRef.current = new Set();
		exhaustedRef.current = false;
		seenDeckAnchorRef.current = initialFactId;
		setDeck([]);
		setActiveIndex(0);
		setExhausted(false);
		setLoading(true);
		setLoadError(null);
		void pullMore();
	}, [initialFactId, pullMore]);

	useEffect(() => {
		if (!initialFactId || deck.length === 0) {
			return;
		}
		const foundIndex = deck.findIndex((item) => item.id === initialFactId);
		if (foundIndex < 0) {
			return;
		}
		setActiveIndex(foundIndex);
		const scroller = scrollerRef.current;
		if (scroller) {
			scroller.scrollTop = foundIndex * scroller.clientHeight;
		}
	}, [initialFactId, deck]);

	const slideCount = deck.length + (exhausted && deck.length > 0 ? 1 : 0);

	const activeItem =
		exhausted && activeIndex >= deck.length ? null : deck[activeIndex];
	const mergedActiveItem = activeItem
		? {
				...activeItem,
				viewerVote:
					votesByFactId[activeItem.id] ?? activeItem.viewerVote ?? null,
			}
		: null;

	useEffect(() => {
		if (!activeItem) {
			return;
		}
		void markSeen(activeItem.id);
		if (activeIndex >= deck.length - 2) {
			void pullMore();
		}
	}, [activeItem, activeIndex, deck.length, markSeen, pullMore]);

	useEffect(() => {
		const previousHtmlOverflow = document.documentElement.style.overflow;
		const previousBodyOverflow = document.body.style.overflow;
		document.documentElement.style.overflow = "hidden";
		document.body.style.overflow = "hidden";

		return () => {
			document.documentElement.style.overflow = previousHtmlOverflow;
			document.body.style.overflow = previousBodyOverflow;
		};
	}, []);

	useEffect(() => {
		const scrollerEl = scrollerRef.current;
		if (!scrollerEl) {
			return;
		}

		function onScroll() {
			const el = scrollerRef.current;
			if (!el) {
				return;
			}
			const height = el.clientHeight;
			if (height <= 0) {
				return;
			}
			const index = Math.round(el.scrollTop / height);
			setActiveIndex((current) => (current === index ? current : index));
		}

		scrollerEl.addEventListener("scroll", onScroll, { passive: true });
		return () => scrollerEl.removeEventListener("scroll", onScroll);
	}, [slideCount]);

	return (
		<div className="relative h-dvh overflow-hidden bg-background">
			<div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
				<Button
					type="button"
					variant="secondary"
					size="icon"
					className="pointer-events-auto size-10 shadow-md"
					aria-label="Back"
					onClick={() => {
						if (window.history.length > 1) {
							router.back();
						} else if (mode === "history" && username) {
							router.push(`/users/${username}/reels` as Route);
						} else {
							router.push("/" as Route);
						}
					}}
				>
					<ArrowLeft className="size-5" aria-hidden />
				</Button>
			</div>

			{loading && deck.length === 0 ? (
				<div className="flex h-dvh items-center justify-center text-muted-foreground text-sm">
					Loading facts…
				</div>
			) : loadError && deck.length === 0 ? (
				<div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
					<p className="text-sm">{loadError}</p>
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							setLoadError(null);
							setLoading(true);
							void pullMore();
						}}
					>
						Try again
					</Button>
				</div>
			) : deck.length === 0 ? (
				<div className="flex h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
					<p className="font-medium">
						{mode === "history"
							? "No facts to replay yet"
							: "You&apos;ve seen every fact"}
					</p>
					<p className="text-muted-foreground text-sm">
						{mode === "history"
							? "Watch facts in the main reels feed first."
							: "Come back when admins publish more."}
					</p>
					<Button
						nativeButton={false}
						render={
							<Link href={(mode === "history" ? "/reels" : "/") as Route} />
						}
						variant="outline"
					>
						{mode === "history" ? "Open reels" : "Back to feed"}
					</Button>
				</div>
			) : (
				<>
					<div
						ref={scrollerRef}
						className="scrollbar-none h-dvh snap-y snap-mandatory overflow-y-auto overscroll-y-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
					>
						{deck.map((item) => (
							<FactReelSlide key={item.id} item={item} />
						))}
						{exhausted ? (
							<FactReelEndSlide
								mode={mode}
								username={mode === "history" ? username : viewerUsername}
							/>
						) : null}
					</div>

					{mergedActiveItem ? (
						<FactReelActions
							mode={mode}
							item={mergedActiveItem}
							onVoteChange={(factId, vote) => {
								setVotesByFactId((current) => ({
									...current,
									[factId]: vote,
								}));
							}}
						/>
					) : null}
				</>
			)}
		</div>
	);
}
