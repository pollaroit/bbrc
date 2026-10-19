"use client";

import type { Route } from "next";
import Link from "next/link";
import { browseNavItems, browseNavPlaceholderItems } from "@/lib/browse-nav";
import { cn } from "@/lib/utils";

type BrowseMenuItemsProps = {
	onNavigate?: () => void;
	variant?: "drawer" | "dropdown";
};

const drawerRowClass =
	"flex w-full items-center gap-3 border-border border-b px-4 py-3.5 text-left text-sm transition-colors last:border-b-0 hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

export function BrowseMenuItems({
	onNavigate,
	variant = "drawer",
}: BrowseMenuItemsProps) {
	if (variant !== "drawer") {
		return null;
	}

	return (
		<nav className="flex flex-col pb-2">
			{browseNavItems.map((item) => {
				const Icon = item.icon;
				return (
					<Link
						key={item.href}
						href={item.href as Route}
						className={drawerRowClass}
						onClick={onNavigate}
					>
						<Icon className="size-4 shrink-0 text-muted-foreground" />
						<span className="flex min-w-0 flex-1 flex-col gap-0.5">
							<span className="font-medium">{item.label}</span>
							{item.description ? (
								<span className="text-muted-foreground text-xs">
									{item.description}
								</span>
							) : null}
						</span>
					</Link>
				);
			})}
			{browseNavPlaceholderItems.map((item) => (
				<div
					key={item.label}
					className={cn(drawerRowClass, "cursor-default opacity-60")}
					aria-disabled="true"
				>
					<span className="size-4 shrink-0" aria-hidden />
					<span className="flex min-w-0 flex-1 flex-col gap-0.5">
						<span className="font-medium">{item.label}</span>
						<span className="text-muted-foreground text-xs">
							{item.description}
						</span>
					</span>
				</div>
			))}
		</nav>
	);
}
