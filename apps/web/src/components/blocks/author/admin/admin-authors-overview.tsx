"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ListChecks, UserPlus, Wand2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { toast } from "sonner";
import { invalidateAuthorQueries } from "@/components/blocks/author/admin/author-actions-panel";
import { client, orpc } from "@/utils/orpc";

function StatCard({
	label,
	value,
	hint,
	href,
}: {
	label: string;
	value: string | number;
	hint?: string;
	href?: Route;
}) {
	const body = (
		<Card
			size="sm"
			className={href ? "h-full transition-colors hover:bg-muted/30" : "h-full"}
		>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm">{label}</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="font-medium text-2xl tabular-nums">{value}</p>
				{hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
			</CardContent>
		</Card>
	);
	return href ? (
		<Link href={href} className="block">
			{body}
		</Link>
	) : (
		body
	);
}

export function AdminAuthorsOverview() {
	const status = useQuery(
		orpc.authorBackfill.status.queryOptions({ input: {} }),
	);

	const retry = useMutation({
		mutationFn: () => client.authorBackfill.retryFailed({}),
		onSuccess: (result) => {
			invalidateAuthorQueries();
			toast.success(
				result.stillFailed > 0
					? `Retried ${result.retried}; ${result.stillFailed} still failing.`
					: `Retried ${result.retried} lookups.`,
			);
		},
		onError: (error) =>
			toast.error(error.message || "Could not retry the lookups."),
	});

	if (status.isPending) {
		return (
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden>
				{Array.from({ length: 8 }, (_, index) => (
					<Skeleton key={index} className="h-24 w-full" />
				))}
			</div>
		);
	}
	if (status.isError || !status.data) {
		return (
			<p className="text-muted-foreground text-sm">
				Could not load the author overview.
			</p>
		);
	}

	const data = status.data;
	const verified = Math.max(
		0,
		data.authorsTotal - data.authorsAutoFilled - data.authorsNeedingReview,
	);

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-wrap gap-2">
				<Button
					render={<Link href={"/authors/new" as Route} />}
					nativeButton={false}
					size="sm"
				>
					<UserPlus data-icon="inline-start" />
					Add author
				</Button>
				<Button
					render={<Link href={"/admin/authors/review" as Route} />}
					nativeButton={false}
					variant="outline"
					size="sm"
				>
					<ListChecks data-icon="inline-start" />
					Needs review
				</Button>
				<Button
					render={<Link href={"/admin/authors/backfill" as Route} />}
					nativeButton={false}
					variant="outline"
					size="sm"
				>
					<Wand2 data-icon="inline-start" />
					Backfill
				</Button>
			</div>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatCard
					label="Authors"
					value={data.authorsTotal.toLocaleString()}
					href={"/admin/authors/list" as Route}
				/>
				<StatCard
					label="Verified"
					value={verified.toLocaleString()}
					hint="An admin confirmed the details"
				/>
				<StatCard
					label="Filled in automatically"
					value={data.authorsAutoFilled.toLocaleString()}
					hint="Live, waiting for a check"
					href={"/admin/authors/review" as Route}
				/>
				<StatCard
					label="Needs review"
					value={data.authorsNeedingReview.toLocaleString()}
					hint="The lookup was unsure"
					href={"/admin/authors/review" as Route}
				/>
				<StatCard
					label="Books with authors"
					value={`${data.booksLinked.toLocaleString()} / ${data.booksTotal.toLocaleString()}`}
				/>
				<StatCard
					label="Books still to link"
					value={data.booksUnlinked.toLocaleString()}
					hint={data.booksUnlinked > 0 ? "Run the backfill" : "All linked"}
					href={"/admin/authors/backfill" as Route}
				/>
				<StatCard
					label="Lookups waiting"
					value={data.authorsPending.toLocaleString()}
					hint="Running in the background"
				/>
				<StatCard
					label="Lookups failed"
					value={data.authorsFailed.toLocaleString()}
					hint="Tried several times"
				/>
			</div>

			{data.authorsFailed > 0 ? (
				<div className="flex flex-wrap items-center gap-3 border border-border bg-muted/20 p-3 text-sm">
					<p className="min-w-0 flex-1">
						{data.authorsFailed} author{" "}
						{data.authorsFailed === 1 ? "lookup has" : "lookups have"} failed.
						The daily sweep tries again, or you can retry now.
					</p>
					<LoadingButton
						type="button"
						variant="outline"
						size="sm"
						loading={retry.isPending}
						onClick={() => retry.mutate()}
					>
						Retry failed lookups
					</LoadingButton>
				</div>
			) : null}
		</div>
	);
}
