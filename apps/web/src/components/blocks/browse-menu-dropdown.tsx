"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { Compass } from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
	browseMenuItems,
	browseNavPlaceholderItems,
	browseNavSections,
	isBrowseNavActive,
	isBrowseNavItemActive,
} from "@/lib/browse-nav";
import { cn } from "@/lib/utils";

export function BrowseMenuDropdown() {
	const t = useTranslations("shell.browse");
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
				<Compass data-icon="inline-start" aria-hidden />
				{t("title")}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="min-w-56">
				{browseNavSections.map((section) => {
					const items = browseMenuItems.filter(
						(item) => item.section === section.id,
					);
					if (items.length === 0) {
						return null;
					}

					return (
						<DropdownMenuGroup key={section.id}>
							<DropdownMenuLabel className="text-muted-foreground text-xs">
								{t(`sections.${section.id}`)}
							</DropdownMenuLabel>
							{items.map((item) => {
								const Icon = item.icon;
								const active = isBrowseNavItemActive(pathname, item.href);
								return (
									<DropdownMenuItem
										key={item.href}
										render={<Link href={item.href as Route} prefetch={false} />}
										nativeButton={false}
										className={cn(active && "bg-muted/60")}
									>
										<Icon aria-hidden />
										<span className="flex flex-col gap-0.5">
											<span>{t(`items.${item.id}.label`)}</span>
											<span className="font-normal text-muted-foreground text-xs">
												{t(`items.${item.id}.description`)}
											</span>
										</span>
									</DropdownMenuItem>
								);
							})}
						</DropdownMenuGroup>
					);
				})}
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuLabel className="text-muted-foreground text-xs">
						{t("later")}
					</DropdownMenuLabel>
					{browseNavPlaceholderItems.map((item) => {
						const Icon = item.icon;
						return (
							<DropdownMenuItem key={item.id} disabled>
								{Icon ? <Icon className="opacity-50" aria-hidden /> : null}
								<span className="text-muted-foreground">
									{t(`placeholders.${item.id}.label`)}
								</span>
								<span className="ms-auto text-muted-foreground text-xs">
									{t(`placeholders.${item.id}.description`)}
								</span>
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
