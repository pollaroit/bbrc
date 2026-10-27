"use client";

import { cn } from "cn";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useRef,
} from "react";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Button } from "./button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "./empty";
import { Skeleton } from "./skeleton";

export type InfiniteScrollLabels = {
	emptyTitle: string;
	errorTitle: string;
	errorFallback: string;
	retry: string;
};

const DEFAULT_LABELS: InfiniteScrollLabels = {
	emptyTitle: "Nothing here yet",
	errorTitle: "Something went wrong",
	errorFallback: "Failed to load content.",
	retry: "Try again",
};

const InfiniteScrollLabelsContext =
	createContext<InfiniteScrollLabels>(DEFAULT_LABELS);

/** Sets the built-in texts of every infinite list below it (the app passes them translated). */
export function InfiniteScrollLabelsProvider({
	labels,
	children,
}: {
	labels: InfiniteScrollLabels;
	children: ReactNode;
}) {
	return (
		<InfiniteScrollLabelsContext.Provider value={labels}>
			{children}
		</InfiniteScrollLabelsContext.Provider>
	);
}

export type InfiniteScrollProps = {
	children: ReactNode;
	className?: string;
	hasNextPage?: boolean;
	isFetchingNextPage?: boolean;
	fetchNextPage: () => void;
	isPending?: boolean;
	isError?: boolean;
	error?: Error | null;
	onRetry?: () => void;
	isEmpty?: boolean;
	emptyTitle?: ReactNode;
	emptyDescription?: ReactNode;
	emptyContent?: ReactNode;
	loadingContent?: ReactNode;
	loadingMoreContent?: ReactNode;
	endMessage?: ReactNode;
	root?: Element | Document | null;
	rootMargin?: string;
	threshold?: number | number[];
};

function DefaultLoadingMore() {
	return (
		<div className="flex flex-col gap-2 py-2">
			<Skeleton className="h-16 w-full" />
			<Skeleton className="h-16 w-full" />
		</div>
	);
}

export function InfiniteScroll({
	children,
	className,
	hasNextPage = false,
	isFetchingNextPage = false,
	fetchNextPage,
	isPending = false,
	isError = false,
	error,
	onRetry,
	isEmpty = false,
	emptyTitle,
	emptyDescription,
	emptyContent,
	loadingContent,
	loadingMoreContent,
	endMessage,
	root = null,
	rootMargin = "200px",
	threshold = 0,
}: InfiniteScrollProps) {
	const labels = useContext(InfiniteScrollLabelsContext);
	const sentinelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!hasNextPage || isFetchingNextPage || isPending || isError) {
			return;
		}

		const target = sentinelRef.current;
		if (!target) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (entry?.isIntersecting) {
					fetchNextPage();
				}
			},
			{ root, rootMargin, threshold },
		);

		observer.observe(target);
		return () => observer.disconnect();
	}, [
		fetchNextPage,
		hasNextPage,
		isError,
		isFetchingNextPage,
		isPending,
		root,
		rootMargin,
		threshold,
	]);

	if (isPending) {
		return (
			<div className={className}>
				{loadingContent ?? <DefaultLoadingMore />}
			</div>
		);
	}

	if (isError) {
		return (
			<div className={className}>
				<Alert variant="destructive">
					<AlertTitle>{labels.errorTitle}</AlertTitle>
					<AlertDescription>
						{error?.message ?? labels.errorFallback}
					</AlertDescription>
				</Alert>
				{onRetry ? (
					<Button
						type="button"
						variant="outline"
						className="mt-4"
						onClick={onRetry}
					>
						{labels.retry}
					</Button>
				) : null}
			</div>
		);
	}

	if (isEmpty) {
		return (
			<div className={className}>
				{emptyContent ?? (
					<Empty className="border">
						<EmptyHeader>
							<EmptyTitle>{emptyTitle ?? labels.emptyTitle}</EmptyTitle>
							{emptyDescription ? (
								<EmptyDescription>{emptyDescription}</EmptyDescription>
							) : null}
						</EmptyHeader>
					</Empty>
				)}
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col", className)}>
			{children}
			<div ref={sentinelRef} className="h-px w-full shrink-0" aria-hidden />
			{isFetchingNextPage
				? (loadingMoreContent ?? <DefaultLoadingMore />)
				: null}
			{!hasNextPage && endMessage ? (
				<p className="py-4 text-center text-muted-foreground text-xs">
					{endMessage}
				</p>
			) : null}
		</div>
	);
}
