"use client";

import { cn } from "cn";
import { type ReactNode, useEffect, useRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Button } from "./button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "./empty";
import { Skeleton } from "./skeleton";

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
	emptyTitle = "Nothing here yet",
	emptyDescription,
	emptyContent,
	loadingContent,
	loadingMoreContent,
	endMessage,
	root = null,
	rootMargin = "200px",
	threshold = 0,
}: InfiniteScrollProps) {
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
					<AlertTitle>Something went wrong</AlertTitle>
					<AlertDescription>
						{error?.message ?? "Failed to load content."}
					</AlertDescription>
				</Alert>
				{onRetry ? (
					<Button
						type="button"
						variant="outline"
						className="mt-4"
						onClick={onRetry}
					>
						Try again
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
							<EmptyTitle>{emptyTitle}</EmptyTitle>
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
