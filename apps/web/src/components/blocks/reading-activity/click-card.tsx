"use client";

import { Button } from "@bbrc/ui/components/button";
import { Card } from "@bbrc/ui/components/card";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A card that opens something when pressed. The content stays plain markup
 * (so it wraps, sizes and reads like any other card) and a transparent button
 * covers the whole card for the click, the keyboard and screen readers.
 */
export function ClickCard({
	label,
	onClick,
	selected = false,
	className,
	children,
}: {
	/** What pressing it does, for screen readers. */
	label: string;
	onClick: () => void;
	selected?: boolean;
	className?: string;
	children: ReactNode;
}) {
	return (
		<Card
			size="sm"
			className={cn(
				"relative transition-shadow",
				selected && "ring-2 ring-foreground",
				className,
			)}
		>
			{children}
			<Button
				type="button"
				variant="ghost"
				aria-label={label}
				aria-pressed={selected}
				onClick={onClick}
				className="absolute inset-0 size-full rounded-[inherit] hover:bg-foreground/[0.03] dark:hover:bg-foreground/[0.04]"
			/>
		</Card>
	);
}
