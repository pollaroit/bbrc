"use client";

import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const compact = new Intl.NumberFormat("en", {
	notation: "compact",
	maximumFractionDigits: 1,
});

/** How many times the book page was opened, as one of the header's fact chips. */
export function BookViewsChip({ slug }: { slug: string }) {
	const { data: session } = authClient.useSession();
	// Same key as the shared view-count hook, so it reuses that cache.
	const { data } = useQuery(
		orpc.view.counts.queryOptions({
			input: { resource: "book", refs: [slug] },
			staleTime: 60_000,
		}),
	);

	if (!data) {
		return (
			<span
				className="h-7 w-20 border border-border bg-muted motion-safe:animate-pulse"
				aria-hidden
			/>
		);
	}

	const views = data.counts[slug] ?? 0;

	const className =
		"inline-flex h-7 items-center gap-1.5 border border-border px-2 text-sm";
	const content = (
		<>
			<Eye className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
			<span className="tabular-nums">{compact.format(views)}</span>
			{views === 1 ? "view" : "views"}
		</>
	);
	const title = `${views.toLocaleString("en")} page views`;

	// Insights are for signed-in members; everyone else just sees the number.
	return session?.user ? (
		<Link
			href={`/books/${slug}/insights` as Route}
			title={`${title}. Open insights`}
			className={cn(
				className,
				"transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 motion-reduce:transition-none",
			)}
		>
			{content}
		</Link>
	) : (
		<span className={className} title={title}>
			{content}
		</span>
	);
}
