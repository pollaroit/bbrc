"use client";

import type { GetUserByUsernameOutput } from "@bbrc/api/modules/user/user.schema";
import { ChevronRight, Flame } from "lucide-react";
import type { Route } from "next";
import { useState } from "react";
import { MemberLevelsInfoDialog } from "@/components/blocks/member-levels-info-dialog";
import { ReadingStreakDialog } from "@/components/blocks/reading-streak-dialog";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type MemberProfileNumbersProps = {
	user: GetUserByUsernameOutput;
	className?: string;
};

const cellClassName =
	"flex min-w-0 flex-col gap-0.5 text-left transition-colors hover:text-foreground";
const valueClassName =
	"font-medium text-2xl tabular-nums tracking-tight leading-tight";
const subClassName = "break-words text-muted-foreground text-xs leading-snug";

function CellLabel({
	children,
	info,
}: {
	children: React.ReactNode;
	info?: React.ReactNode;
}) {
	return (
		<div className="flex h-5 items-center justify-between gap-1 text-muted-foreground text-xs">
			<span>{children}</span>
			{info}
		</div>
	);
}

export function MemberProfileNumbers({
	user,
	className,
}: MemberProfileNumbersProps) {
	const [streakOpen, setStreakOpen] = useState(false);
	const streak = user.readingStreak;

	const streakSub = streak.best > 0 ? `Best ${streak.best}` : "Not started yet";

	return (
		<>
			<div className={cn("border border-border", className)}>
				<div className="grid grid-cols-3 divide-x divide-border md:grid-cols-1 md:divide-x-0 md:divide-y">
					<div className="flex min-w-0 flex-col gap-0.5 px-3 py-3 md:px-4">
						<CellLabel
							info={
								<MemberLevelsInfoDialog
									kind="xp"
									currentPoints={user.xp}
									triggerClassName="-mr-1 size-5"
								/>
							}
						>
							XP
						</CellLabel>
						<Link
							href={`/users/${user.username}/xp` as Route}
							className={cellClassName}
						>
							<span className={valueClassName}>{user.xp.toLocaleString()}</span>
							<span className={subClassName}>{user.xpLevel.label}</span>
						</Link>
					</div>

					<div className="flex min-w-0 flex-col gap-0.5 px-3 py-3 md:px-4">
						<CellLabel
							info={
								<MemberLevelsInfoDialog
									kind="rp"
									currentPoints={user.rp}
									triggerClassName="-mr-1 size-5"
								/>
							}
						>
							RP
						</CellLabel>
						<Link
							href={`/users/${user.username}/rp` as Route}
							className={cellClassName}
						>
							<span className={valueClassName}>{user.rp.toLocaleString()}</span>
							<span className={subClassName}>{user.rpLevel.label}</span>
						</Link>
					</div>

					<div className="flex min-w-0 flex-col gap-0.5 px-3 py-3 md:px-4">
						<CellLabel>Streak</CellLabel>
						<button
							type="button"
							className={cellClassName}
							aria-label={`Reading streak: ${streak.current}. ${streakSub}. Open details.`}
							onClick={() => setStreakOpen(true)}
						>
							<span className={cn(valueClassName, "flex items-center gap-1")}>
								<Flame
									className={cn(
										"size-5 shrink-0",
										streak.current > 0
											? "text-warning"
											: "text-muted-foreground",
									)}
									aria-hidden
								/>
								{streak.current}
							</span>
							<span className={subClassName}>{streakSub}</span>
						</button>
					</div>
				</div>

				<Link
					href={`/users/${user.username}/stats` as Route}
					className="flex items-center justify-between gap-2 border-border border-t px-3 py-2.5 text-sm transition-colors hover:bg-muted/40 md:px-4"
				>
					Reading stats
					<ChevronRight className="size-4 text-muted-foreground" aria-hidden />
				</Link>
			</div>
			<ReadingStreakDialog
				streak={streak}
				open={streakOpen}
				onOpenChange={setStreakOpen}
			/>
		</>
	);
}
