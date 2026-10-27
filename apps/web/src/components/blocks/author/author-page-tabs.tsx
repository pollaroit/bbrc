"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
	AUTHOR_TABS,
	authorTabFromPathname,
	authorTabHref,
} from "@/lib/author-tabs";
import { cn } from "@/lib/utils";

/** Scrolls sideways on a phone so thirteen tabs never wrap into a wall. */
export function AuthorPageTabs({ slug }: { slug: string }) {
	const t = useTranslations("authors");
	const active = authorTabFromPathname(slug, usePathname() ?? "");

	return (
		<nav
			className="-mx-4 overflow-x-auto border-border border-b px-4 sm:mx-0 sm:px-0"
			aria-label={t("tabs.label")}
		>
			<ul className="flex w-max min-w-full gap-1">
				{AUTHOR_TABS.map((tab) => {
					const isActive = tab.id === active;
					return (
						<li key={tab.id}>
							<Link
								href={authorTabHref(slug, tab)}
								aria-current={isActive ? "page" : undefined}
								className={cn(
									"-mb-px block whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
									isActive
										? "border-foreground font-medium text-foreground"
										: "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground",
								)}
							>
								{t(`tabs.${tab.id}`)}
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
