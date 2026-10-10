"use client";

import { Button } from "@bbrc/ui/components/button";
import { Trophy } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LeaderboardNavTriggerProps = {
	className?: string;
};

/** Mobile top bar: icon link to standings (after search). */
export function LeaderboardMobileNavTrigger({
	className,
}: LeaderboardNavTriggerProps) {
	return (
		<Button
			render={
				<Link
					href={"/leaderboard/overview" as Route}
					aria-label="Leaderboard"
				/>
			}
			nativeButton={false}
			variant="ghost"
			size="icon-sm"
			className={cn("md:hidden", className)}
		>
			<Trophy className="size-4" aria-hidden />
		</Button>
	);
}
