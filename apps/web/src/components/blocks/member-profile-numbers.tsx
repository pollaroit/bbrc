"use client";

import type { GetUserByUsernameOutput } from "@bbrc/api/modules/user/user.schema";
import { Flame } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { MemberLevelsInfoDialog } from "@/components/blocks/member-levels-info-dialog";
import { ReadingStreakDialog } from "@/components/blocks/reading-streak-dialog";
import { cn } from "@/lib/utils";

type MemberProfileNumbersProps = {
	user: GetUserByUsernameOutput;
	className?: string;
};

const cellClassName =
	"flex min-w-0 flex-col gap-0.5 px-3 py-3 text-left transition-colors hover:bg-muted/40 md:px-4";

export function MemberProfileNumbers({
	user,
	className,
}: MemberProfileNumbersProps) {
	const [streakOpen, setStreakOpen] = useState(false);
	const streak = user.readingStreak;

	const streakValue = streak.current > 0 ? streak.current : streak.best;
	const streakLabel =
		streak.current > 0
			? "Sitting streak"
			: streak.best > 0
				? "Best streak"
				: "No streak yet";

	return (
		<>
			<div
				className={cn(
					"grid grid-cols-3 divide-x divide-border border border-border md:grid-cols-1 md:divide-x-0 md:divide-y",
					className,
				)}
			>
				<div className="relative">
					<Link
						href={`/users/${user.username}/xp` as Route}
						className={cellClassName}
					>
						<span className="font-medium text-2xl tabular-nums tracking-tight">
							{user.xp.toLocaleString()}
						</span>
						<span className="truncate text-muted-foreground text-xs">
							XP · {user.xpLevel.label}
						</span>
					</Link>
					<MemberLevelsInfoDialog
						kind="xp"
						currentPoints={user.xp}
						triggerClassName="absolute top-1 right-1 size-6"
					/>
				</div>
				<div className="relative">
					<Link
						href={`/users/${user.username}/rp` as Route}
						className={cellClassName}
					>
						<span className="font-medium text-2xl tabular-nums tracking-tight">
							{user.rp.toLocaleString()}
						</span>
						<span className="truncate text-muted-foreground text-xs">
							RP · {user.rpLevel.label}
						</span>
					</Link>
					<MemberLevelsInfoDialog
						kind="rp"
						currentPoints={user.rp}
						triggerClassName="absolute top-1 right-1 size-6"
					/>
				</div>
				<button
					type="button"
					className={cellClassName}
					aria-label={`Reading streak: ${streakValue} ${streakLabel}. Open details.`}
					onClick={() => setStreakOpen(true)}
				>
					<span className="flex items-center gap-1.5 font-medium text-2xl tabular-nums tracking-tight">
						<Flame
							className={cn(
								"size-5",
								streak.current > 0
									? "text-orange-600 dark:text-orange-400"
									: "text-muted-foreground",
							)}
							aria-hidden
						/>
						{streakValue}
					</span>
					<span className="truncate text-muted-foreground text-xs">
						{streakLabel}
					</span>
				</button>
			</div>
			<ReadingStreakDialog
				streak={streak}
				open={streakOpen}
				onOpenChange={setStreakOpen}
			/>
		</>
	);
}
