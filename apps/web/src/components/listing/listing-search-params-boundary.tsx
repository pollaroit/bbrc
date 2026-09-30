import { Skeleton } from "@bbrc/ui/components/skeleton";
import { type ReactNode, Suspense } from "react";

function ListingSearchParamsFallback() {
	return (
		<div className="flex flex-col gap-3" aria-busy aria-hidden>
			<Skeleton className="h-10 w-full max-w-md" />
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 3 }, (_, index) => (
					<Skeleton key={index} className="h-36 w-full" />
				))}
			</div>
		</div>
	);
}

/** Wraps nuqs / `useSearchParams` listing UI for Next.js static generation. */
export function ListingSearchParamsBoundary({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<Suspense fallback={<ListingSearchParamsFallback />}>{children}</Suspense>
	);
}
