"use client";

import type { UserAward } from "@bbrc/api/modules/achievement/achievement.schema";
import {
	ACHIEVEMENT_BY_KEY,
	ACHIEVEMENT_CATEGORIES,
	ACHIEVEMENTS,
	type AchievementCategory,
	type AchievementDefinition,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import type { Route } from "next";
import { useState } from "react";
import { toast } from "sonner";
import { AchievementBadge } from "@/components/blocks/achievement-badge";
import { TierLadder } from "@/components/blocks/tier-ladder";
import { Link } from "@/i18n/navigation";
import { formatAchievementDate } from "@/lib/achievements/format";
import { authClient } from "@/lib/auth-client";
import { useAchievementText } from "@/lib/i18n/use-content-text";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

const SHOWCASE_SLOTS = 4;

type Earned = {
	definition: AchievementDefinition;
	/** The member's best award for each period (one per year for yearly achievements). */
	best: UserAward[];
	highestTier: number;
	latest: UserAward;
};

function groupAwards(awards: UserAward[]): Earned[] {
	const byKey = new Map<string, UserAward[]>();
	for (const award of awards) {
		byKey.set(award.key, [...(byKey.get(award.key) ?? []), award]);
	}

	const earned: Earned[] = [];
	for (const [key, list] of byKey) {
		const definition = ACHIEVEMENT_BY_KEY.get(key);
		if (!definition) continue;
		const bestByPeriod = new Map<string, UserAward>();
		for (const award of list) {
			const current = bestByPeriod.get(award.periodKey);
			if (!current || award.tier > current.tier) {
				bestByPeriod.set(award.periodKey, award);
			}
		}
		earned.push({
			definition,
			best: [...bestByPeriod.values()].sort((a, b) =>
				b.periodKey.localeCompare(a.periodKey),
			),
			highestTier: Math.max(...list.map((award) => award.tier)),
			latest: [...list].sort((a, b) =>
				b.earnedAt.localeCompare(a.earnedAt),
			)[0] as UserAward,
		});
	}
	return earned.sort((a, b) =>
		b.latest.earnedAt.localeCompare(a.latest.earnedAt),
	);
}

function awardLabel(
	a: ReturnType<typeof useAchievementText>,
	definition: AchievementDefinition,
	award: UserAward,
): string {
	return [a.tier(definition, award.tier), award.periodKey]
		.filter(Boolean)
		.join(" ");
}

export function usePinnedAwards(username: string) {
	return useQuery(
		orpc.achievement.listByUsername.queryOptions({ input: { username } }),
	);
}

function Ledger({
	earned,
	total,
	byCategory,
}: {
	earned: number;
	total: number;
	byCategory: { category: AchievementCategory; count: number; total: number }[];
}) {
	const a = useAchievementText();
	return (
		<section
			aria-label="Summary"
			className="grid gap-6 border border-border bg-card p-5 md:grid-cols-[auto_1fr] md:items-center md:gap-10"
		>
			<p className="font-heading font-semibold text-6xl tabular-nums leading-none">
				{earned}
				<span className="ps-2 font-normal text-2xl text-muted-foreground">
					of {total}
				</span>
			</p>
			<ul className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
				{byCategory.map((row) => (
					<li key={row.category} className="flex flex-col gap-1">
						<span className="flex items-baseline justify-between text-sm">
							{a.category(row.category)}
							<span className="text-muted-foreground text-xs tabular-nums">
								{row.count}/{row.total}
							</span>
						</span>
						<span className="h-1 bg-border" aria-hidden>
							<span
								className="block h-full bg-foreground"
								style={{
									width: `${row.total ? (row.count / row.total) * 100 : 0}%`,
								}}
							/>
						</span>
					</li>
				))}
			</ul>
		</section>
	);
}

export function UserAchievementsPanel({ username }: { username: string }) {
	const a = useAchievementText();
	const f = useFormatters();
	const { data: session } = authClient.useSession();
	const isAdmin = session?.user.isAdmin === true;
	const query = usePinnedAwards(username);
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState<string[]>([]);
	const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

	const key = orpc.achievement.listByUsername.queryKey({ input: { username } });
	const showcase = useMutation(
		orpc.achievement.setShowcase.mutationOptions({
			onSuccess: () => {
				toast.success("Showcase updated");
				setEditing(false);
				void queryClient.invalidateQueries({ queryKey: key });
			},
			onError: (error) =>
				toast.error(error.message ?? "Could not save the showcase."),
		}),
	);
	const revoke = useMutation(
		orpc.achievement.revoke.mutationOptions({
			onSuccess: () => {
				toast.success("Award revoked");
				setConfirmRevoke(null);
				void queryClient.invalidateQueries({ queryKey: key });
			},
			onError: (error) =>
				toast.error(error.message ?? "Could not revoke the award."),
		}),
	);

	if (query.isPending) {
		return <Skeleton className="h-96 w-full" aria-hidden />;
	}
	if (query.isError || !query.data) {
		return (
			<p className="text-muted-foreground text-sm">
				Could not load achievements right now.
			</p>
		);
	}

	const data = query.data;
	const earned = groupAwards(data.awards);
	const pinned = data.awards
		.filter((award) => award.pinOrder != null)
		.sort((a, b) => (a.pinOrder ?? 0) - (b.pinOrder ?? 0));
	const slots = editing
		? draft
				.map((id) => data.awards.find((award) => award.id === id))
				.filter((award): award is UserAward => award != null)
		: pinned;

	const earnedKeys = new Set(earned.map((item) => item.definition.key));
	const byCategory = ACHIEVEMENT_CATEGORIES.map((category) => ({
		category,
		count: earned.filter((item) => item.definition.category === category)
			.length,
		// Hidden achievements only count toward the total once they are found.
		total: ACHIEVEMENTS.filter(
			(definition) =>
				definition.category === category &&
				(!definition.isHidden || earnedKeys.has(definition.key)),
		).length,
	}));

	const startEditing = () => {
		setDraft(pinned.map((award) => award.id));
		setEditing(true);
	};
	const toggleDraft = (id: string) =>
		setDraft((current) =>
			current.includes(id)
				? current.filter((item) => item !== id)
				: current.length >= SHOWCASE_SLOTS
					? current
					: [...current, id],
		);

	return (
		<div className="flex flex-col gap-10">
			<Ledger
				earned={data.earnedCount}
				total={data.totalAchievements}
				byCategory={byCategory}
			/>

			<section
				className="flex flex-col gap-3"
				aria-labelledby="showcase-heading"
			>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2
							id="showcase-heading"
							className="font-heading font-semibold text-lg tracking-tight"
						>
							Showcase
						</h2>
						<p className="text-muted-foreground text-sm">
							{editing
								? `Tap earned badges below to pin them. ${draft.length} of ${SHOWCASE_SLOTS} chosen.`
								: data.isOwner
									? "Up to four badges, shown on your profile."
									: "Badges pinned to the profile."}
						</p>
					</div>
					{data.isOwner && earned.length > 0 ? (
						editing ? (
							<div className="flex gap-2">
								<Button
									size="sm"
									disabled={showcase.isPending}
									onClick={() => showcase.mutate({ awardIds: draft })}
								>
									Save showcase
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => setEditing(false)}
								>
									Cancel
								</Button>
							</div>
						) : (
							<Button size="sm" variant="outline" onClick={startEditing}>
								Edit showcase
							</Button>
						)
					) : null}
				</div>
				<ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{Array.from({ length: SHOWCASE_SLOTS }, (_, index) => {
						const award = slots[index];
						const definition = award
							? ACHIEVEMENT_BY_KEY.get(award.key)
							: undefined;
						if (!award || !definition) {
							return (
								<li key={`empty-${index}`}>
									{data.isOwner && earned.length > 0 ? (
										<button
											type="button"
											onClick={editing ? undefined : startEditing}
											className="flex h-full min-h-32 w-full flex-col items-center justify-center gap-1.5 border border-border border-dashed text-muted-foreground text-sm transition-colors hover:bg-muted/30"
										>
											<Plus className="size-4" aria-hidden />
											Pin a badge
										</button>
									) : (
										<span className="flex min-h-32 items-center justify-center border border-border border-dashed text-muted-foreground/60 text-xs">
											Empty slot
										</span>
									)}
								</li>
							);
						}
						return (
							<li key={award.id}>
								<Link
									href={`/achievements/${definition.slug}` as Route}
									className="flex h-full min-h-32 flex-col items-center justify-center gap-2 border border-border bg-card p-3 text-center transition-colors hover:bg-muted/30"
								>
									<AchievementBadge
										icon={definition.icon}
										tier={award.tier}
										tierCount={definition.thresholds.length}
									/>
									<span className="font-heading font-semibold text-sm leading-tight">
										{a.name(definition.key)}
									</span>
									<span className="text-muted-foreground text-xs">
										{awardLabel(a, definition, award) || "Earned"}
									</span>
								</Link>
							</li>
						);
					})}
				</ul>
			</section>

			<section className="flex flex-col gap-6" aria-label="Earned achievements">
				<div>
					<h2 className="font-heading font-semibold text-lg tracking-tight">
						Earned
					</h2>
					{earned.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							{data.isOwner
								? "Nothing yet. Mark a book as read to get started."
								: "No achievements yet."}
						</p>
					) : null}
				</div>
				{ACHIEVEMENT_CATEGORIES.map((category) => {
					const items = earned.filter(
						(item) => item.definition.category === category,
					);
					if (items.length === 0) return null;
					return (
						<div key={category} className="flex flex-col gap-3">
							<h3 className="border-border border-b pb-2 font-medium text-sm">
								{a.category(category)}
								<span className="ps-2 font-normal text-muted-foreground text-xs">
									{items.length}
								</span>
							</h3>
							<ul className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3">
								{items.map((item) => {
									const { definition } = item;
									const award = item.best[0] as UserAward;
									const selected = item.best.some((entry) =>
										draft.includes(entry.id),
									);
									const body = (
										<>
											<AchievementBadge
												icon={definition.icon}
												tier={item.highestTier}
												tierCount={definition.thresholds.length}
											/>
											<span className="font-heading font-semibold text-sm leading-tight">
												{a.name(definition.key)}
											</span>
											<span className="text-muted-foreground text-xs">
												{item.best.length > 1
													? item.best
															.map((entry) => entry.periodKey)
															.filter(Boolean)
															.join(", ")
													: awardLabel(a, definition, award) || "Earned"}
											</span>
											<span className="text-2xs text-muted-foreground/80">
												{formatAchievementDate(award.earnedAt)}
											</span>
										</>
									);
									const tileClass = cn(
										"flex h-full w-full flex-col items-start gap-1.5 border bg-card p-3 text-left transition-colors",
										editing
											? selected
												? "border-foreground outline outline-1 outline-foreground"
												: "border-border hover:bg-muted/30"
											: "border-border hover:bg-muted/30",
									);
									return (
										<li key={definition.key} className="relative min-h-0">
											{editing ? (
												<button
													type="button"
													aria-pressed={selected}
													aria-label={`${selected ? "Unpin" : "Pin"} ${a.name(definition.key)}`}
													onClick={() => toggleDraft(award.id)}
													className={tileClass}
												>
													{body}
												</button>
											) : (
												<Link
													href={`/achievements/${definition.slug}` as Route}
													title={a.describe(definition, item.highestTier)}
													className={tileClass}
												>
													{body}
												</Link>
											)}
											{isAdmin && !editing ? (
												<div className="absolute end-1.5 top-1.5">
													{confirmRevoke === award.id ? (
														<Button
															size="xs"
															variant="destructive"
															disabled={revoke.isPending}
															onClick={() =>
																revoke.mutate({ awardId: award.id })
															}
														>
															Confirm
														</Button>
													) : (
														<Button
															size="xs"
															variant="ghost"
															onClick={() => setConfirmRevoke(award.id)}
														>
															Revoke
														</Button>
													)}
												</div>
											) : null}
										</li>
									);
								})}
							</ul>
						</div>
					);
				})}
			</section>

			{data.isOwner && data.progress.length > 0 ? (
				<section className="flex flex-col gap-3" aria-labelledby="next-heading">
					<h2
						id="next-heading"
						className="font-heading font-semibold text-lg tracking-tight"
					>
						Next up
					</h2>
					<ul className="border-border border-t">
						{[...data.progress]
							.sort((a, b) => b.value / (b.next ?? 1) - a.value / (a.next ?? 1))
							.slice(0, 6)
							.map((item) => {
								const definition = ACHIEVEMENT_BY_KEY.get(item.key);
								if (!definition || item.next == null) return null;
								const progress = Math.min(1, item.value / item.next);
								return (
									<li key={`${item.key}-${item.periodKey}`}>
										<Link
											href={`/achievements/${definition.slug}` as Route}
											className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 border-border border-b py-3 transition-colors hover:bg-muted/30 sm:grid-cols-[auto_1fr_11rem]"
										>
											<AchievementBadge
												icon={definition.icon}
												tier={item.tier}
												tierCount={definition.thresholds.length}
											/>
											<span className="flex min-w-0 flex-col">
												<span className="font-heading font-semibold text-sm">
													{a.name(definition.key)}
												</span>
												<span className="text-muted-foreground text-xs">
													{a.describe(definition, item.tier + 1)}
												</span>
											</span>
											<span className="col-span-2 flex items-center justify-between gap-4 ps-16 sm:col-span-1 sm:flex-col sm:items-end sm:gap-1.5 sm:ps-0">
												<TierLadder
													thresholds={definition.thresholds}
													tier={item.tier}
													progress={progress}
												/>
												<span className="flex items-center gap-2 text-2xs text-muted-foreground tabular-nums">
													<span
														className="h-1 w-16 bg-border"
														role="progressbar"
														aria-valuenow={Math.round(progress * 100)}
														aria-valuemin={0}
														aria-valuemax={100}
														aria-label={`Progress on ${a.name(definition.key)}`}
													>
														<span
															className="block h-full bg-primary"
															style={{
																width: `${Math.round(progress * 100)}%`,
															}}
														/>
													</span>
													{f.number(item.value)} / {f.number(item.next)}
												</span>
											</span>
										</Link>
									</li>
								);
							})}
					</ul>
				</section>
			) : null}

			{data.hiddenRemaining > 0 ? (
				<p className="border border-border border-dashed px-4 py-3 text-muted-foreground text-sm">
					{data.hiddenRemaining} hidden{" "}
					{data.hiddenRemaining === 1 ? "achievement is" : "achievements are"}{" "}
					still waiting to be discovered. You will know when you find one.
				</p>
			) : null}
		</div>
	);
}
