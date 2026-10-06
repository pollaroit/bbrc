"use client";

import type { FactReelItem } from "@bbrc/api/modules/fact/fact.schema";
import { Button } from "@bbrc/ui/components/button";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Heart, Share2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { client, orpc } from "@/utils/orpc";

const DECK_PULL_SIZE = 5;

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

function FactReelActions({
	item,
	onLikeStateChange,
}: {
	item: FactReelItem;
	onLikeStateChange: (factId: string, liked: boolean) => void;
}) {
	const [liked, setLiked] = useState(item.likedByViewer);

	useEffect(() => {
		setLiked(item.likedByViewer);
	}, [item.id, item.likedByViewer]);

	const toggleMutation = useMutation(
		orpc.fact.toggleLike.mutationOptions({
			onMutate: () => {
				const snapshot = liked;
				setLiked(!liked);
				return snapshot;
			},
			onSuccess: (result) => {
				setLiked(result.liked);
				onLikeStateChange(item.id, result.liked);
			},
			onError: (error, _variables, wasLiked) => {
				if (typeof wasLiked === "boolean") {
					setLiked(wasLiked);
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
		<div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-end px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
			<div className="pointer-events-auto flex flex-col gap-3">
				<Button
					type="button"
					size="icon-lg"
					variant="secondary"
					className="size-12 shadow-md"
					aria-label={liked ? "Unlike fact" : "Like fact"}
					disabled={toggleMutation.isPending}
					onClick={() => toggleMutation.mutate({ factId: item.id })}
				>
					<Heart
						className={cn("size-5", liked && "fill-current text-red-600")}
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
	initialFactId?: string;
};

export function FactReelsViewer({ initialFactId }: FactReelsViewerProps) {
	const router = useRouter();
	const scrollerRef = useRef<HTMLDivElement>(null);
	const deckRef = useRef<FactReelItem[]>([]);
	const seenIdsRef = useRef<Set<string>>(new Set());
	const loadingMoreRef = useRef(false);
	const exhaustedRef = useRef(false);

	const [deck, setDeck] = useState<FactReelItem[]>([]);
	const [activeIndex, setActiveIndex] = useState(0);
	const [exhausted, setExhausted] = useState(false);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [likedByFactId, setLikedByFactId] = useState<Record<string, boolean>>(
		{},
	);

	deckRef.current = deck;
	exhaustedRef.current = exhausted;

	const markSeen = useCallback(async (factId: string) => {
		if (seenIdsRef.current.has(factId)) {
			return;
		}
		seenIdsRef.current.add(factId);

		try {
			await client.fact.markSeen({ factId });
		} catch {
			seenIdsRef.current.delete(factId);
		}
	}, []);

	const pullMore = useCallback(async () => {
		if (loadingMoreRef.current || exhaustedRef.current) {
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

			const result = await client.fact.pullDeck({
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
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Could not load facts";
			setLoadError(message);
		} finally {
			loadingMoreRef.current = false;
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		seenIdsRef.current = new Set();
		exhaustedRef.current = false;
		setDeck([]);
		setActiveIndex(0);
		setExhausted(false);
		setLoading(true);
		setLoadError(null);
		void pullMore();
	}, [pullMore]);

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

	const activeItem = deck[activeIndex];
	const mergedActiveItem = activeItem
		? {
				...activeItem,
				likedByViewer: likedByFactId[activeItem.id] ?? activeItem.likedByViewer,
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
	}, [deck.length]);

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
					<p className="font-medium">You&apos;ve seen every fact</p>
					<p className="text-muted-foreground text-sm">
						Come back when admins publish more.
					</p>
					<Button
						nativeButton={false}
						render={<Link href={"/" as Route} />}
						variant="outline"
					>
						Back to feed
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
					</div>

					{mergedActiveItem ? (
						<FactReelActions
							item={mergedActiveItem}
							onLikeStateChange={(factId, liked) => {
								setLikedByFactId((current) => ({
									...current,
									[factId]: liked,
								}));
							}}
						/>
					) : null}
				</>
			)}
		</div>
	);
}
