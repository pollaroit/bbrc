"use client";

import { Badge } from "@bbrc/ui/components/badge";
import { Card, CardContent } from "@bbrc/ui/components/card";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** How this compares with before: up and down are plain facts, not good or bad. */
export type Trend = { direction: "up" | "down" | "flat"; text: string };

/**
 * One headline number: what it is, the number itself, a line of context, and
 * optionally a trend and a small picture of how it got there.
 */
export function StatCard({
	icon: Icon,
	label,
	value,
	hint,
	trend,
	featured = false,
	className,
	children,
}: {
	icon: LucideIcon;
	label: string;
	value: string;
	hint?: ReactNode;
	trend?: Trend | null;
	featured?: boolean;
	className?: string;
	children?: ReactNode;
}) {
	const TrendIcon =
		trend?.direction === "up"
			? ArrowUpRight
			: trend?.direction === "down"
				? ArrowDownRight
				: Minus;
	return (
		<Card size="sm" className={cn("min-w-0", className)}>
			<CardContent className="flex h-full flex-col gap-3">
				<div className="flex items-center justify-between gap-2">
					<span className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs">
						<Icon className="size-3.5" aria-hidden />
						{label}
					</span>
					{trend ? (
						<Badge
							variant="outline"
							className={cn(
								"gap-0.5 tabular-nums",
								trend.direction === "up" &&
									"border-success/30 bg-success/10 text-success-ink",
							)}
						>
							<TrendIcon className="size-3" aria-hidden />
							{trend.text}
						</Badge>
					) : null}
				</div>
				<p
					className={cn(
						"font-heading font-semibold tabular-nums leading-none tracking-tight",
						featured ? "text-4xl sm:text-5xl" : "text-3xl",
					)}
				>
					{value}
				</p>
				{hint ? (
					<p className="text-muted-foreground text-xs leading-snug">{hint}</p>
				) : null}
				{children ? <div className="mt-auto pt-1">{children}</div> : null}
			</CardContent>
		</Card>
	);
}
