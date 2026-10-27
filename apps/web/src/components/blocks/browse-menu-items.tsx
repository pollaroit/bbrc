"use client";

import type { Route } from "next";
import {
	MobileChromeSheetSection,
	MobileSheetRowBody,
	MobileSheetRowIcon,
	mobileSheetRowClass,
} from "@/components/blocks/mobile-chrome-sheet";
import { Link, usePathname } from "@/i18n/navigation";
import {
	browseNavItems,
	browseNavPlaceholderItems,
	browseNavSections,
	isBrowseNavItemActive,
} from "@/lib/browse-nav";
import { cn } from "@/lib/utils";

type BrowseMenuItemsProps = {
	onNavigate?: () => void;
};

export function BrowseMenuItems({ onNavigate }: BrowseMenuItemsProps) {
	const pathname = usePathname();

	return (
		<nav className="flex flex-col pb-3">
			{browseNavSections.map((section) => {
				const items = browseNavItems.filter(
					(item) => item.section === section.id,
				);
				if (items.length === 0) {
					return null;
				}

				return (
					<MobileChromeSheetSection key={section.id} title={section.label}>
						<ul className="flex flex-col">
							{items.map((item) => {
								const active = isBrowseNavItemActive(pathname, item.href);
								const Icon = item.icon;
								return (
									<li key={item.href}>
										<Link
											href={item.href as Route}
											className={cn(
												mobileSheetRowClass,
												active &&
													"border-primary border-l-2 bg-muted/50 ps-[calc(1rem-2px)]",
											)}
											onClick={onNavigate}
											aria-current={active ? "page" : undefined}
										>
											<MobileSheetRowIcon icon={Icon} />
											<MobileSheetRowBody
												label={item.label}
												description={item.description}
											/>
										</Link>
									</li>
								);
							})}
						</ul>
					</MobileChromeSheetSection>
				);
			})}
			<MobileChromeSheetSection title="Later">
				<ul className="flex flex-col">
					{browseNavPlaceholderItems.map((item) => {
						const PlaceholderIcon = item.icon;
						return (
							<li key={item.label}>
								<div
									className={cn(
										mobileSheetRowClass,
										"cursor-default opacity-55",
									)}
									aria-disabled="true"
								>
									{PlaceholderIcon ? (
										<MobileSheetRowIcon icon={PlaceholderIcon} />
									) : (
										<span className="size-9 shrink-0" aria-hidden />
									)}
									<MobileSheetRowBody
										label={item.label}
										description={item.description}
									/>
								</div>
							</li>
						);
					})}
				</ul>
			</MobileChromeSheetSection>
		</nav>
	);
}
