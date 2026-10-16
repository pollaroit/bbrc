"use client";

import type { GetUserByUsernameOutput } from "@bbrc/api/modules/user/user.schema";
import { Flame } from "lucide-react";
import { useState } from "react";
import { ReadingStreakDialog } from "@/components/blocks/reading-streak-dialog";
import { cn } from "@/lib/utils";

type ReadingStreakBadgeProps = {
	streak: GetUserByUsernameOutput["readingStreak"];
	className?: string;
};

export function ReadingStreakBadge({
	streak,
	className,
}: ReadingStreakBadgeProps) {
	const [open, setOpen] = useState(false);

	const label =
		streak.current > 0
			? `${streak.current} sitting streak`
			: streak.best > 0
				? `Best streak ${streak.best}`
				: "No reading streak yet";

	return (
		<>
			<button
				type="button"
				className={cn(
					"inline-flex w-fit cursor-pointer items-center gap-1.5 border border-border bg-muted/30 px-2 py-1 text-left text-muted-foreground text-xs transition-colors hover:bg-muted/50 hover:text-foreground",
					className,
				)}
				aria-label={`Reading streak: ${label}. Open details.`}
				onClick={() => setOpen(true)}
			>
				<Flame
					className={cn(
						"size-3.5 shrink-0",
						streak.current > 0 && "text-orange-600 dark:text-orange-400",
					)}
					aria-hidden
				/>
				<span>{label}</span>
			</button>
			<ReadingStreakDialog streak={streak} open={open} onOpenChange={setOpen} />
		</>
	);
}
