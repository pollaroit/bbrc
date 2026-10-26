"use client";

import type { CompareOutput } from "@bbrc/api/modules/user-compare/user-compare.schema";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bbrc/ui/components/popover";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { CircleHelp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { CompareMemberPicker } from "@/components/blocks/user-compare/compare-member-picker";
import { cn } from "@/lib/utils";

type Member = CompareOutput["a"];
type Stats = NonNullable<Member["stats"]>;

const CONFIDENCE_COPY = {
	low: "Few shared books, so treat this loosely.",
	medium: "A fair number of shared books.",
	high: "Plenty of shared books, so this is a solid read.",
} as const;

/** Where a member-route comparison goes when the other side is swapped. */
export function memberCompareHref(a: string, b: string) {
	return `/users/compare/${a}/${b}` as Route;
}

export function CompareHeader({
	data,
	asAdmin,
	onChangeMember,
}: {
	data: CompareOutput;
	asAdmin: boolean;
	onChangeMember?: (side: "a" | "b", username: string) => void;
}) {
	const router = useRouter();
	const { a, b, score } = data;

	function change(side: "a" | "b", username: string) {
		if (onChangeMember) return onChangeMember(side, username);
		router.push(
			memberCompareHref(
				side === "a" ? username : a.username,
				side === "b" ? username : b.username,
			),
		);
	}

	// A member always sees themselves on the left; only admins can swap either side.
	const canSwapA = asAdmin;

	return (
		<header className="flex flex-col gap-6">
			<div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
				<MemberSide
					member={a}
					side="a"
					action={
						canSwapA ? (
							<CompareMemberPicker
								value={a.username}
								excludeUsername={b.username}
								asAdmin={asAdmin}
								onSelect={(username) => change("a", username)}
							/>
						) : null
					}
				/>
				<ScoreRing data={data} />
				<MemberSide
					member={b}
					side="b"
					action={
						<CompareMemberPicker
							value={b.username}
							excludeUsername={a.username}
							asAdmin={asAdmin}
							onSelect={(username) => change("b", username)}
						/>
					}
				/>
			</div>
			{data.summary && score ? (
				<p className="text-center text-muted-foreground text-sm">
					{data.viewerSide == null
						? data.summary.replace(/^You (have not|both|agree)/, "They $1")
						: data.summary}
				</p>
			) : null}
			{a.stats && b.stats ? (
				<StatsTable a={a} b={b} aStats={a.stats} bStats={b.stats} />
			) : null}
		</header>
	);
}

function MemberSide({
	member,
	side,
	action,
}: {
	member: Member;
	side: "a" | "b";
	action: React.ReactNode;
}) {
	return (
		<div
			className={cn(
				"flex min-w-0 items-center gap-4 md:flex-col md:text-center",
				side === "a"
					? "md:items-end md:text-right"
					: "md:items-start md:text-left",
			)}
		>
			<Link
				href={`/users/${member.username}` as Route}
				className="shrink-0 outline-offset-4"
				aria-label={`${member.name}'s profile`}
			>
				<span
					className={cn(
						"block rounded-full p-1 ring-2",
						side === "a" ? "ring-chart-1" : "ring-chart-2",
					)}
				>
					<UserAvatar
						user={member}
						className="size-16 text-xl md:size-24 md:text-3xl"
					/>
				</span>
			</Link>
			<div
				className={cn(
					"flex min-w-0 flex-1 flex-col gap-1 md:flex-none",
					side === "a" ? "md:items-end" : "md:items-start",
				)}
			>
				<Link
					href={`/users/${member.username}` as Route}
					className="max-w-full truncate font-semibold text-lg tracking-tight hover:underline"
				>
					{member.name}
				</Link>
				<p className="text-muted-foreground text-sm">@{member.username}</p>
				{member.stats ? (
					<p className="text-muted-foreground text-xs">
						Member since{" "}
						{new Date(member.stats.joinedAt).toLocaleDateString(undefined, {
							month: "short",
							year: "numeric",
						})}
					</p>
				) : null}
				{action ? <div className="mt-1">{action}</div> : null}
			</div>
		</div>
	);
}

const RING_SIZE = 168;
const RING_STROKE = 12;

function ScoreRing({ data }: { data: CompareOutput }) {
	const { score } = data;
	if (!score) {
		return (
			<div
				className="mx-auto flex size-40 items-center justify-center border border-border border-dashed text-center text-muted-foreground text-sm"
				role="img"
				aria-label="Score hidden"
			>
				Score hidden
			</div>
		);
	}

	const radius = (RING_SIZE - RING_STROKE) / 2;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference * (1 - score.overall / 100);

	return (
		<div className="mx-auto flex flex-col items-center gap-2">
			<div
				className="relative"
				style={{ width: RING_SIZE, height: RING_SIZE }}
				role="img"
				aria-label={`Overall match ${score.overall} out of 100: ${score.band.label}`}
			>
				<svg
					width={RING_SIZE}
					height={RING_SIZE}
					viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
					className="-rotate-90"
					aria-hidden
				>
					<circle
						cx={RING_SIZE / 2}
						cy={RING_SIZE / 2}
						r={radius}
						fill="none"
						strokeWidth={RING_STROKE}
						className="stroke-muted"
					/>
					<circle
						cx={RING_SIZE / 2}
						cy={RING_SIZE / 2}
						r={radius}
						fill="none"
						strokeWidth={RING_STROKE}
						strokeLinecap="butt"
						strokeDasharray={circumference}
						strokeDashoffset={offset}
						className="stroke-primary transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
					/>
				</svg>
				<div className="absolute inset-0 flex flex-col items-center justify-center">
					<span className="font-semibold text-4xl tabular-nums tracking-tight">
						{score.overall}
						<span className="font-normal text-base text-muted-foreground">
							%
						</span>
					</span>
					<span className="text-muted-foreground text-xs">match</span>
				</div>
			</div>
			<p className="font-medium text-sm">{score.band.label}</p>
			<p className="flex items-center gap-1 text-muted-foreground text-xs">
				Based on {score.sharedCount} shared{" "}
				{score.sharedCount === 1 ? "book" : "books"}
				<ScoreBreakdown score={score} />
			</p>
		</div>
	);
}

function ScoreBreakdown({
	score,
}: {
	score: NonNullable<CompareOutput["score"]>;
}) {
	const overlapPct = Math.round(score.weights.overlap * 100);
	const ratingPct = Math.round(score.weights.rating * 100);
	return (
		<Popover>
			<PopoverTrigger
				render={
					<button
						type="button"
						aria-label="How this score is worked out"
						className="inline-flex size-5 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
					/>
				}
			>
				<CircleHelp className="size-3.5" aria-hidden />
			</PopoverTrigger>
			<PopoverContent className="w-72 gap-3 text-sm">
				<p className="font-medium">How the score works</p>
				<dl className="flex flex-col gap-2.5">
					<BreakdownRow
						label={`Books in common (${overlapPct}%)`}
						value={score.overlap}
						hint={`${score.sharedCount} read by both, ${score.onlyACount} only left, ${score.onlyBCount} only right.`}
					/>
					<BreakdownRow
						label={`Rating agreement (${ratingPct}%)`}
						value={score.ratingAgreement}
						hint={
							score.coRatedCount === 0
								? "No book rated by both, so only the books count."
								: score.coRatedCount < score.weights.ratingFullWeightAt
									? `Only ${score.coRatedCount} co-rated, so it counts for less.`
									: `Across ${score.coRatedCount} books you both rated.`
						}
					/>
				</dl>
				<p className="text-muted-foreground text-xs">
					{CONFIDENCE_COPY[score.confidence]}
				</p>
			</PopoverContent>
		</Popover>
	);
}

function BreakdownRow({
	label,
	value,
	hint,
}: {
	label: string;
	value: number | null;
	hint: string;
}) {
	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-baseline justify-between gap-2">
				<dt>{label}</dt>
				<dd className="font-medium tabular-nums">
					{value == null ? "–" : `${value}%`}
				</dd>
			</div>
			<div className="h-1.5 bg-muted" aria-hidden>
				<div
					className="h-full bg-primary"
					style={{ width: `${value ?? 0}%` }}
				/>
			</div>
			<p className="text-muted-foreground text-xs">{hint}</p>
		</div>
	);
}

type Row = {
	label: string;
	a: string;
	b: string;
	/** Which side is ahead (higher is better here); null for a tie or when it does not apply. */
	lead: "a" | "b" | null;
};

function lead(a: number | null, b: number | null): "a" | "b" | null {
	if (a == null || b == null || a === b) return null;
	return a > b ? "a" : "b";
}

function buildRows(a: Stats, b: Stats): Row[] {
	const rating = (value: number | null) =>
		value == null ? "–" : value.toFixed(2).replace(/\.?0+$/, "");
	return [
		{
			label: "Books read",
			a: String(a.booksRead),
			b: String(b.booksRead),
			lead: lead(a.booksRead, b.booksRead),
		},
		{
			label: "Average rating given",
			a: rating(a.averageRating),
			b: rating(b.averageRating),
			lead: lead(a.averageRating, b.averageRating),
		},
		{
			label: "Pages read",
			a: a.pagesRead.toLocaleString(),
			b: b.pagesRead.toLocaleString(),
			lead: lead(a.pagesRead, b.pagesRead),
		},
		{
			label: "Reads this year",
			a: String(a.readsThisYear),
			b: String(b.readsThisYear),
			lead: lead(a.readsThisYear, b.readsThisYear),
		},
		{
			label: "Achievements",
			a: String(a.achievementsCount),
			b: String(b.achievementsCount),
			lead: lead(a.achievementsCount, b.achievementsCount),
		},
	];
}

function StatsTable({
	a,
	b,
	aStats,
	bStats,
}: {
	a: Member;
	b: Member;
	aStats: Stats;
	bStats: Stats;
}) {
	const rows = buildRows(aStats, bStats);
	return (
		<div className="border border-border">
			<table className="w-full table-fixed text-sm">
				<caption className="sr-only">
					Side-by-side figures for {a.name} and {b.name}
				</caption>
				<thead className="sr-only">
					<tr>
						<th scope="col">Figure</th>
						<th scope="col">{a.name}</th>
						<th scope="col">{b.name}</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{rows.map((row) => (
						<tr key={row.label}>
							<td
								className={cn(
									"w-[34%] px-3 py-2 text-left tabular-nums",
									row.lead === "a" ? "font-semibold" : "text-muted-foreground",
								)}
							>
								{row.a}
							</td>
							<th
								scope="row"
								className="px-2 py-2 text-center font-normal text-muted-foreground text-xs"
							>
								{row.label}
							</th>
							<td
								className={cn(
									"w-[34%] px-3 py-2 text-right tabular-nums",
									row.lead === "b" ? "font-semibold" : "text-muted-foreground",
								)}
							>
								{row.b}
							</td>
						</tr>
					))}
					<tr>
						<td className="px-3 py-2 text-left align-top">
							<FavoriteAuthors stats={aStats} />
						</td>
						<th
							scope="row"
							className="px-2 py-2 text-center align-top font-normal text-muted-foreground text-xs"
						>
							Most read authors
						</th>
						<td className="px-3 py-2 text-right align-top">
							<FavoriteAuthors stats={bStats} align="right" />
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	);
}

function FavoriteAuthors({
	stats,
	align = "left",
}: {
	stats: Stats;
	align?: "left" | "right";
}) {
	if (stats.favoriteAuthors.length === 0) {
		return <span className="text-muted-foreground">–</span>;
	}
	return (
		<ul
			className={cn(
				"flex flex-col gap-0.5 text-xs",
				align === "right" && "items-end",
			)}
		>
			{stats.favoriteAuthors.map((author) => (
				<li key={author.slug} className="max-w-full truncate">
					<Link
						href={`/authors/${author.slug}` as Route}
						className="hover:underline"
					>
						{author.name}
					</Link>{" "}
					<span className="text-muted-foreground">×{author.count}</span>
				</li>
			))}
		</ul>
	);
}

export function CompareHeaderSkeleton() {
	return (
		<div className="flex flex-col gap-6" aria-hidden>
			<div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
				<Skeleton className="h-32 w-full" />
				<Skeleton className="mx-auto size-40" />
				<Skeleton className="h-32 w-full" />
			</div>
			<Skeleton className="h-52 w-full" />
		</div>
	);
}
