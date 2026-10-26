"use client";

import { getBookCountryName } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@bbrc/ui/components/chart";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ListChecks, UserPlus, Users, Wand2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { type ReactNode, useMemo } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";
import { AdminAuthorRankingLists } from "@/components/blocks/author/admin/admin-author-ranking-lists";
import { AdminAuthorsToolbar } from "@/components/blocks/author/admin/admin-authors-toolbar";
import { invalidateAuthorQueries } from "@/components/blocks/author/admin/author-actions-panel";
import {
	adminAuthorFieldLabels,
	adminAuthorGenderLabels,
	toAdminAuthorsScopeCallInput,
	useAdminAuthorsListingSearchParams,
} from "@/lib/listing/admin-authors-listing";
import { client, orpc } from "@/utils/orpc";

const additionsChartConfig = {
	count: { label: "Added", color: "var(--chart-1)" },
};
const coverageChartConfig = {
	percent: { label: "Filled", color: "var(--chart-2)" },
};
const countChartConfig = {
	count: { label: "Authors", color: "var(--chart-3)" },
};

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
	const card = (
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
			{card}
		</Link>
	) : (
		card
	);
}

function BackfillNotice() {
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

	const data = status.data;
	if (!data) {
		return null;
	}

	return (
		<div className="flex flex-col gap-3">
			{data.booksUnlinked > 0 ? (
				<div className="flex flex-wrap items-center gap-3 border border-border bg-muted/20 p-3 text-sm">
					<p className="min-w-0 flex-1">
						{data.booksUnlinked.toLocaleString()} of{" "}
						{data.booksTotal.toLocaleString()} books are not linked to author
						records yet.
					</p>
					<Button
						render={<Link href={"/admin/authors/backfill" as Route} />}
						nativeButton={false}
						variant="outline"
						size="sm"
					>
						<Wand2 data-icon="inline-start" />
						Open backfill
					</Button>
				</div>
			) : null}
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

export function AdminAuthorsOverview() {
	const [params] = useAdminAuthorsListingSearchParams();
	const input = toAdminAuthorsScopeCallInput(params);

	const { data, isPending, isError } = useQuery(
		orpc.authorAdmin.overview.queryOptions({ input }),
	);

	const growth = useMemo(
		() =>
			(data?.additionsByDay ?? []).map((point) => ({
				...point,
				label: new Intl.DateTimeFormat(undefined, {
					month: "short",
					day: "numeric",
				}).format(new Date(`${point.date}T12:00:00.000Z`)),
			})),
		[data],
	);
	const coverage = useMemo(
		() =>
			(data?.coverage ?? []).map((row) => ({
				...row,
				label:
					adminAuthorFieldLabels[
						row.field as keyof typeof adminAuthorFieldLabels
					] ?? row.field,
			})),
		[data],
	);
	const nationalities = useMemo(
		() =>
			(data?.distributions.nationalities ?? []).slice(0, 10).map((row) => ({
				...row,
				label: getBookCountryName(row.alpha2) ?? row.name,
			})),
		[data],
	);
	const genders = useMemo(
		() =>
			(data?.distributions.genders ?? []).map((row) => ({
				...row,
				label: adminAuthorGenderLabels[row.gender],
			})),
		[data],
	);
	const decades = useMemo(
		() =>
			(data?.distributions.birthDecades ?? []).map((row) => ({
				...row,
				label: `${row.decade}s`,
			})),
		[data],
	);

	let body: ReactNode;

	if (isPending) {
		body = (
			<div className="flex flex-col gap-6">
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					{Array.from({ length: 8 }, (_, i) => (
						<Skeleton key={i} className="h-24 w-full" />
					))}
				</div>
				<Skeleton className="h-56 w-full" />
				<Skeleton className="h-96 w-full" />
			</div>
		);
	} else if (isError || !data) {
		body = (
			<p className="text-muted-foreground text-sm">
				Could not load the author overview.
			</p>
		);
	} else {
		const { kpis } = data;
		body = (
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
						Needs review ({kpis.needsReview + kpis.mergeSuggestions})
					</Button>
					<Button
						render={<Link href={"/authors" as Route} />}
						nativeButton={false}
						variant="outline"
						size="sm"
					>
						<Users data-icon="inline-start" />
						Public author list
					</Button>
				</div>

				<BackfillNotice />

				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					<StatCard
						label="Total authors"
						value={kpis.totalAuthors}
						hint={`${kpis.publicAuthors} with books, ${kpis.withoutBooks} without`}
						href={"/admin/authors/list" as Route}
					/>
					<StatCard
						label="Confirmed"
						value={kpis.verified}
						hint="An admin checked the details"
					/>
					<StatCard
						label="Filled in automatically"
						value={kpis.auto}
						hint="Live, waiting for a check"
						href={"/admin/authors/review" as Route}
					/>
					<StatCard
						label="Needs review"
						value={kpis.needsReview}
						hint={`${kpis.mergeSuggestions} look-alike pairs`}
						href={"/admin/authors/review" as Route}
					/>
					<StatCard
						label="With photo / bio"
						value={`${kpis.withPhoto} / ${kpis.withBio}`}
					/>
					<StatCard
						label="Lookups waiting / failed"
						value={`${kpis.enrichment.pending + kpis.enrichment.running} / ${kpis.enrichment.failed}`}
					/>
					<StatCard
						label="AI-assisted / locked"
						value={`${kpis.aiFilledAuthors} / ${kpis.lockedAuthors}`}
						hint="Authors with at least one such field"
					/>
					<StatCard
						label="Added (7d / 30d)"
						value={`${kpis.addedLast7Days} / ${kpis.addedLast30Days}`}
						hint={`${kpis.followersTotal} follows in total`}
					/>
				</div>

				<Card size="sm">
					<CardHeader>
						<CardTitle>Author growth</CardTitle>
						<CardDescription>Authors added — last 30 days</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={additionsChartConfig}
							className="h-52 w-full"
						>
							<AreaChart data={growth} margin={{ left: 0, right: 8, top: 8 }}>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="label"
									tickLine={false}
									axisLine={false}
									interval="preserveStartEnd"
									minTickGap={24}
								/>
								<YAxis allowDecimals={false} width={28} tickLine={false} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<Area
									type="monotone"
									dataKey="count"
									stroke="var(--color-count)"
									fill="var(--color-count)"
									fillOpacity={0.2}
								/>
							</AreaChart>
						</ChartContainer>
					</CardContent>
				</Card>

				<div className="grid gap-4 lg:grid-cols-2">
					<Card size="sm">
						<CardHeader>
							<CardTitle>How complete the records are</CardTitle>
							<CardDescription>
								Share of authors with each field
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer
								config={coverageChartConfig}
								className="h-72 w-full"
							>
								<BarChart
									layout="vertical"
									data={coverage}
									margin={{ left: 8, right: 16, top: 8 }}
								>
									<CartesianGrid horizontal={false} />
									<XAxis
										type="number"
										domain={[0, 100]}
										tickLine={false}
										unit="%"
									/>
									<YAxis
										type="category"
										dataKey="label"
										width={110}
										tickLine={false}
										axisLine={false}
									/>
									<ChartTooltip content={<ChartTooltipContent />} />
									<Bar dataKey="percent" fill="var(--color-percent)" />
								</BarChart>
							</ChartContainer>
						</CardContent>
					</Card>

					<Card size="sm">
						<CardHeader>
							<CardTitle>Nationalities</CardTitle>
							<CardDescription>Top ten among these authors</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer config={countChartConfig} className="h-72 w-full">
								<BarChart
									layout="vertical"
									data={nationalities}
									margin={{ left: 8, right: 16, top: 8 }}
								>
									<CartesianGrid horizontal={false} />
									<XAxis type="number" allowDecimals={false} tickLine={false} />
									<YAxis
										type="category"
										dataKey="label"
										width={110}
										tickLine={false}
										axisLine={false}
									/>
									<ChartTooltip content={<ChartTooltipContent />} />
									<Bar dataKey="count" fill="var(--color-count)" />
								</BarChart>
							</ChartContainer>
						</CardContent>
					</Card>
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					<Card size="sm">
						<CardHeader>
							<CardTitle>Gender</CardTitle>
						</CardHeader>
						<CardContent>
							<ChartContainer config={countChartConfig} className="h-52 w-full">
								<BarChart data={genders} margin={{ left: 0, right: 8, top: 8 }}>
									<CartesianGrid vertical={false} />
									<XAxis dataKey="label" tickLine={false} axisLine={false} />
									<YAxis allowDecimals={false} width={28} tickLine={false} />
									<ChartTooltip content={<ChartTooltipContent />} />
									<Bar dataKey="count" fill="var(--color-count)" />
								</BarChart>
							</ChartContainer>
						</CardContent>
					</Card>
					<Card size="sm">
						<CardHeader>
							<CardTitle>Born in</CardTitle>
							<CardDescription>Authors by decade of birth</CardDescription>
						</CardHeader>
						<CardContent>
							<ChartContainer config={countChartConfig} className="h-52 w-full">
								<BarChart data={decades} margin={{ left: 0, right: 8, top: 8 }}>
									<CartesianGrid vertical={false} />
									<XAxis
										dataKey="label"
										tickLine={false}
										axisLine={false}
										interval="preserveStartEnd"
									/>
									<YAxis allowDecimals={false} width={28} tickLine={false} />
									<ChartTooltip content={<ChartTooltipContent />} />
									<Bar dataKey="count" fill="var(--color-count)" />
								</BarChart>
							</ChartContainer>
						</CardContent>
					</Card>
				</div>

				{data.enrichmentFailures.length > 0 ? (
					<Card size="sm">
						<CardHeader className="pb-2">
							<CardTitle className="text-sm">Lookups that failed</CardTitle>
						</CardHeader>
						<CardContent>
							<ul>
								{data.enrichmentFailures.map((failure) => (
									<li
										key={failure.slug}
										className="flex flex-wrap items-center justify-between gap-2 border-border border-b py-2 last:border-0"
									>
										<Link
											href={`/authors/${failure.slug}/edit` as Route}
											className="font-medium text-sm hover:underline"
										>
											{failure.name}
										</Link>
										<span className="text-muted-foreground text-xs">
											{failure.attempts}{" "}
											{failure.attempts === 1 ? "try" : "tries"}
											{failure.error ? ` · ${failure.error}` : ""}
										</span>
									</li>
								))}
							</ul>
						</CardContent>
					</Card>
				) : null}

				<section className="flex flex-col gap-4">
					<h2 className="font-semibold text-lg tracking-tight">Rankings</h2>
					<AdminAuthorRankingLists rankings={data.rankings} />
				</section>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-8">
			<AdminAuthorsToolbar variant="overview" />
			{body}
		</div>
	);
}
