"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ListingFilterPanelProps = {
	title: string;
	description?: string;
	children: ReactNode;
	className?: string;
};

export function ListingFilterPanel({
	title,
	description,
	children,
	className,
}: ListingFilterPanelProps) {
	return (
		<div
			className={cn(
				"flex flex-col gap-3 border border-border bg-background px-3 py-3",
				className,
			)}
		>
			<div className="flex flex-col gap-0.5">
				<p className="font-medium text-foreground text-sm">{title}</p>
				{description ? (
					<p className="text-muted-foreground text-xs leading-relaxed">
						{description}
					</p>
				) : null}
			</div>
			{children}
		</div>
	);
}
