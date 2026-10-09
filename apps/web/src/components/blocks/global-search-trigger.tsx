"use client";

import { Button } from "@bbrc/ui/components/button";
import { Search } from "lucide-react";
import { useGlobalSearch } from "@/components/blocks/global-search-provider";
import { cn } from "@/lib/utils";

type GlobalSearchTriggerProps = {
	variant: "desktop" | "mobile";
	className?: string;
};

export function GlobalSearchTrigger({
	variant,
	className,
}: GlobalSearchTriggerProps) {
	const { openSearch } = useGlobalSearch();

	if (variant === "mobile") {
		return (
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				className={className}
				onClick={openSearch}
				aria-label="Search"
			>
				<Search className="size-4" aria-hidden />
			</Button>
		);
	}

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			className={cn(
				"h-8 min-w-[10.5rem] justify-start gap-2 border-border bg-muted/20 px-2.5 font-normal text-muted-foreground shadow-none hover:bg-muted/35 hover:text-foreground lg:min-w-[12rem]",
				className,
			)}
			onClick={openSearch}
			aria-label="Search the club"
		>
			<Search className="size-3.5 shrink-0 opacity-80" aria-hidden />
			<span className="flex-1 truncate text-left text-sm">Search club…</span>
			<kbd className="pointer-events-none hidden h-5 shrink-0 select-none items-center border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground lg:inline-flex">
				⌘K
			</kbd>
		</Button>
	);
}

export function GlobalSearchMobileTrigger({
	className,
}: {
	className?: string;
}) {
	return (
		<GlobalSearchTrigger
			variant="mobile"
			className={cn("md:hidden", className)}
		/>
	);
}
