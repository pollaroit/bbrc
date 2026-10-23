"use client";

import type {
	AchievementSummary,
	ListAchievementsOutput,
} from "@bbrc/api/modules/achievement/achievement.schema";
import {
	ACHIEVEMENT_CATEGORIES,
	ACHIEVEMENT_CATEGORY_LABELS,
	type AchievementCategory,
} from "@bbrc/shared";
import { Input } from "@bbrc/ui/components/input";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import {
	AchievementRow,
	type AchievementState,
	achievementFocus,
	achievementState,
} from "@/components/blocks/achievement-row";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const STATUS_FILTERS = ["all", "earned", "started", "locked"] as const;
const STATUS_LABELS = {
	all: "All",
	earned: "Earned",
	started: "In progress",
	locked: "Locked",
} as const;

const TICK_CLASS: Record<AchievementState, string> = {
	earned: "bg-foreground",
	started: "bg-foreground/35",
	locked: "bg-border",
};

/** One tick per achievement: filled when earned, half when started. */
function Ticks({
	items,
	className,
}: {
	items: AchievementSummary[];
	className?: string;
}) {
	return (
		<span className={cn("flex flex-wrap gap-px", className)} aria-hidden>
			{items.map((item) => (
				<span
					key={item.key}
					className={cn("h-3 w-1", TICK_CLASS[achievementState(item)])}
				/>
			))}
		</span>
	);
}

/** Which section is under the top of the screen, so the rail can follow the reader. */
function useActiveSection(ids: string[]) {
	const [active, setActive] = useState<string | null>(null);
	const key = ids.join("|");

	useEffect(() => {
		const elements = key
			.split("|")
			.map((id) => document.getElementById(id))
			.filter((element): element is HTMLElement => element != null);
		if (elements.length === 0) {
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((entry) => entry.isIntersecting)
					.sort(
						(a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
					)[0];
				if (visible) {
					setActive(visible.target.id);
				}
			},
			{ rootMargin: "-96px 0px -60% 0px" },
		);
		for (const element of elements) {
			observer.observe(element);
		}
		return () => observer.disconnect();
	}, [key]);

	return active;
}

function Hero({
	data,
	grouped,
	signedIn,
}: {
	data: ListAchievementsOutput;
	grouped: { category: AchievementCategory; items: AchievementSummary[] }[];
	signedIn: boolean;
}) {
	const all = grouped.flatMap((group) => group.items);
	const earned = all.filter(
		(item) => achievementState(item) === "earned",
	).length;
	const closest = all
		.map((item) => ({ item, focus: achievementFocus(item) }))
		.filter(
			({ focus }) => !focus.maxed && focus.value > 0 && focus.next != null,
		)
		.sort((a, b) => b.focus.progress - a.focus.progress)
		.slice(0, 3);

	return (
		<section className="flex flex-col gap-6 border border-border bg-card p-5 sm:p-6">
			<div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
				<div className="flex flex-col gap-3">
					<h1 className="font-heading font-semibold text-2xl tracking-tight sm:text-3xl">
						Achievements
					</h1>
					<p className="font-heading font-semibold text-6xl tabular-nums leading-none">
						{signedIn ? earned : all.length}
						<span className="ps-2 font-normal text-2xl text-muted-foreground">
							{signedIn ? `of ${all.length} earned` : "to earn"}
						</span>
					</p>
				</div>
				<div className="flex max-w-md flex-col gap-2 md:items-end">
					<Ticks items={all} className="md:justify-end" />
					<p className="text-muted-foreground text-sm leading-relaxed md:text-end">
						{signedIn
							? "Each tick is one achievement. Pin your favorites to your profile."
							: "Sign in to see which ones you have earned and what is next."}
						{data.hiddenRemaining > 0
							? ` ${data.hiddenRemaining} more ${data.hiddenRemaining === 1 ? "is" : "are"} hidden until you find ${data.hiddenRemaining === 1 ? "it" : "them"}.`
							: ""}
					</p>
				</div>
			</div>

			{signedIn && closest.length > 0 ? (
				<div className="flex flex-col gap-2 border-border border-t pt-4">
					<p className="font-medium text-sm">Closest to unlocking</p>
					<ul className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
						{closest.map(({ item, focus }) => (
							<li key={item.key}>
								<Link
									href={`/achievements/${item.slug}` as Route}
									className="flex flex-col gap-1.5 hover:underline"
								>
									<span className="flex items-baseline justify-between gap-2 text-sm">
										<span className="truncate">{item.name}</span>
										<span className="text-muted-foreground text-xs tabular-nums">
											{focus.value.toLocaleString("en")} /{" "}
											{focus.next?.toLocaleString("en")}
										</span>
									</span>
									<span className="h-1 bg-border" aria-hidden>
										<span
											className="block h-full bg-primary"
											style={{ width: `${Math.round(focus.progress * 100)}%` }}
										/>
									</span>
								</Link>
							</li>
						))}
					</ul>
				</div>
			) : null}
		</section>
	);
}

export function AchievementsCatalog() {
	const { data: session } = authClient.useSession();
	const query = useQuery(orpc.achievement.list.queryOptions());
	const [status, setStatus] = useQueryState(
		"status",
		parseAsStringLiteral(STATUS_FILTERS).withDefault("all"),
	);
	const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
	const signedIn = Boolean(session?.user);

	const grouped = useMemo(() => {
		const items = query.data?.items ?? [];
		return ACHIEVEMENT_CATEGORIES.map((category) => ({
			category,
			items: items.filter((item) => item.category === category),
		})).filter((group) => group.items.length > 0);
	}, [query.data]);

	const needle = search.trim().toLowerCase();
	const visibleGroups = grouped
		.map((group) => ({
			...group,
			shown: group.items.filter(
				(item) =>
					(status === "all" || achievementState(item) === status) &&
					(needle === "" ||
						item.name.toLowerCase().includes(needle) ||
						item.tiers.some((tier) =>
							tier.description.toLowerCase().includes(needle),
						)),
			),
		}))
		.filter((group) => group.shown.length > 0);

	const active = useActiveSection(visibleGroups.map((group) => group.category));

	if (query.isPending) {
		return (
			<div className="flex flex-col gap-4" aria-hidden>
				<Skeleton className="h-44 w-full" />
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}
	if (query.isError || !query.data) {
		return (
			<p className="text-muted-foreground text-sm">
				Could not load achievements. Try again in a moment.
			</p>
		);
	}

	const data: ListAchievementsOutput = query.data;
	const counts = {
		all: data.items.length,
		earned: data.items.filter((item) => achievementState(item) === "earned")
			.length,
		started: data.items.filter((item) => achievementState(item) === "started")
			.length,
		locked: data.items.filter((item) => achievementState(item) === "locked")
			.length,
	};

	return (
		<div className="flex flex-col gap-6">
			<Hero data={data} grouped={grouped} signedIn={signedIn} />

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				{signedIn ? (
					<SegmentedControl
						label="Show"
						value={status}
						onChange={(value) => void setStatus(value === "all" ? null : value)}
						options={STATUS_FILTERS.map((id) => ({
							id,
							label: STATUS_LABELS[id],
							count: counts[id],
						}))}
					/>
				) : (
					<span />
				)}
				<div className="relative sm:w-72">
					<Search
						className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden
					/>
					<Input
						value={search}
						onChange={(event) => void setSearch(event.target.value || null)}
						placeholder="Search achievements…"
						aria-label="Search achievements"
						className="ps-9"
					/>
				</div>
			</div>

			<div className="grid gap-x-10 gap-y-4 lg:grid-cols-[13rem_1fr]">
				<nav
					aria-label="Categories"
					className="lg:sticky lg:top-24 lg:self-start"
				>
					<ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-border lg:border-s lg:px-0 lg:pb-0">
						{grouped.map((group) => {
							const earned = group.items.filter(
								(item) => achievementState(item) === "earned",
							).length;
							const isActive = active === group.category;
							return (
								<li key={group.category} className="shrink-0">
									<a
										href={`#${group.category}`}
										className={cn(
											"flex items-baseline justify-between gap-6 px-3 py-2 text-sm transition-colors hover:text-foreground lg:-ms-px lg:border-s-2",
											isActive
												? "border-foreground border-b-2 font-medium text-foreground lg:border-b-0"
												: "border-transparent text-muted-foreground lg:border-s-transparent",
											isActive && "lg:border-s-foreground",
										)}
									>
										{ACHIEVEMENT_CATEGORY_LABELS[group.category]}
										<span className="text-2xs tabular-nums">
											{signedIn
												? `${earned}/${group.items.length}`
												: group.items.length}
										</span>
									</a>
								</li>
							);
						})}
					</ul>
				</nav>

				<div className="flex min-w-0 flex-col gap-10">
					{visibleGroups.length === 0 ? (
						<p className="py-10 text-center text-muted-foreground text-sm">
							Nothing matches. Try another filter or search.
						</p>
					) : (
						visibleGroups.map((group) => (
							<section
								key={group.category}
								id={group.category}
								aria-labelledby={`${group.category}-heading`}
								className="scroll-mt-24"
							>
								<div className="flex items-end justify-between gap-4 pb-3">
									<h2
										id={`${group.category}-heading`}
										className="font-heading font-semibold text-lg tracking-tight"
									>
										{ACHIEVEMENT_CATEGORY_LABELS[group.category]}
									</h2>
									<Ticks items={group.items} />
								</div>
								<ul className="border-border border-t">
									{group.shown.map((item) => (
										<li key={item.key}>
											<AchievementRow
												item={item}
												memberCount={data.memberCount}
											/>
										</li>
									))}
								</ul>
							</section>
						))
					)}
				</div>
			</div>
		</div>
	);
}
