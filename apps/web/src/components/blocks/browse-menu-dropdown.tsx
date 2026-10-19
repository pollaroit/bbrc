"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { Compass } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	browseMenuItems,
	browseNavPlaceholderItems,
	isBrowseNavActive,
} from "@/lib/browse-nav";
import { cn } from "@/lib/utils";

export function BrowseMenuDropdown() {
	const pathname = usePathname();
	const browseActive = isBrowseNavActive(pathname);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className={cn(
							"font-medium text-sm",
							browseActive
								? "text-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					/>
				}
			>
				<Compass data-icon="inline-start" className="size-4" aria-hidden />
				Browse
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="min-w-52">
				<DropdownMenuLabel className="text-muted-foreground text-xs">
					Catalog & club
				</DropdownMenuLabel>
				{browseMenuItems.map((item) => {
					const Icon = item.icon;
					return (
						<DropdownMenuItem
							key={item.href}
							render={<Link href={item.href as Route} />}
							nativeButton={false}
						>
							<Icon className="size-4" aria-hidden />
							{item.label}
						</DropdownMenuItem>
					);
				})}
				<DropdownMenuSeparator />
				{browseNavPlaceholderItems.map((item) => (
					<DropdownMenuItem key={item.label} disabled>
						<span className="text-muted-foreground">{item.label}</span>
						<span className="ms-auto text-muted-foreground text-xs">
							{item.description}
						</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
