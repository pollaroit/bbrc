import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

type AdminTab = {
	href: Route | string;
	label: string;
};

type AdminResourceShellProps = {
	title: string;
	description: string;
	tabs: readonly AdminTab[];
	activeHref: string;
	children: React.ReactNode;
};

export function AdminResourceShell({
	title,
	description,
	tabs,
	activeHref,
	children,
}: AdminResourceShellProps) {
	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-1">
				<h1 className="font-bold text-2xl tracking-tight">{title}</h1>
				<p className="max-w-3xl text-muted-foreground text-sm">{description}</p>
			</div>

			<nav
				className="flex flex-wrap gap-2 border-border border-b pb-3"
				aria-label={`${title} views`}
			>
				{tabs.map((tab) => (
					<Link
						key={tab.href}
						href={tab.href as Route}
						className={cn(
							"px-3 py-1.5 text-sm transition-colors",
							tab.href === activeHref
								? "bg-muted font-medium text-foreground"
								: "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
						)}
					>
						{tab.label}
					</Link>
				))}
			</nav>

			{children}
		</div>
	);
}

export const adminBookTabs = [
	{ href: "/admin/books" as Route, label: "Overview" },
	{ href: "/admin/books/list" as Route, label: "List" },
	{ href: "/admin/books/stats" as Route, label: "Stats" },
] as const;

export const adminMemberTabs = [
	{ href: "/admin/users" as Route, label: "Overview" },
	{ href: "/admin/users/list" as Route, label: "List" },
	{ href: "/admin/users/stats" as Route, label: "Stats" },
] as const;
