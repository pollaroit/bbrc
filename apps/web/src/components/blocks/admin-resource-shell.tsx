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

export const adminSittingTabs = [
	{ href: "/admin/sittings" as Route, label: "Overview" },
	{ href: "/admin/sittings/list" as Route, label: "List" },
	{ href: "/admin/sittings/stats" as Route, label: "Stats" },
] as const;

export const adminFeedbackTabs = [
	{ href: "/admin/feedbacks" as Route, label: "Overview" },
	{ href: "/admin/feedbacks/list" as Route, label: "List" },
	{ href: "/admin/feedbacks/stats" as Route, label: "Stats" },
] as const;

export const adminShelfTabs = [
	{ href: "/admin/shelves" as Route, label: "Overview" },
	{ href: "/admin/shelves/list" as Route, label: "List" },
	{ href: "/admin/shelves/stats" as Route, label: "Stats" },
] as const;

export const adminQuizTabs = [
	{ href: "/admin/quizzes" as Route, label: "Overview" },
	{ href: "/admin/quizzes/list" as Route, label: "List" },
	{ href: "/admin/quizzes/stats" as Route, label: "Stats" },
] as const;

export const adminSeriesTabs = [
	{ href: "/admin/series" as Route, label: "Overview" },
	{ href: "/admin/series/list" as Route, label: "List" },
	{ href: "/admin/series/stats" as Route, label: "Stats" },
] as const;

export const adminAuthorTabs = [
	{ href: "/admin/authors" as Route, label: "Overview" },
	{ href: "/admin/authors/list" as Route, label: "List" },
	{ href: "/admin/authors/stats" as Route, label: "Stats" },
	{ href: "/admin/authors/review" as Route, label: "Needs review" },
	{ href: "/admin/authors/backfill" as Route, label: "Backfill" },
] as const;

export const adminPostTabs = [
	{ href: "/admin/posts" as Route, label: "Overview" },
	{ href: "/admin/posts/list" as Route, label: "List" },
	{ href: "/admin/posts/stats" as Route, label: "Stats" },
] as const;

export const adminCommentTabs = [
	{ href: "/admin/comments" as Route, label: "Overview" },
	{ href: "/admin/comments/list" as Route, label: "List" },
	{ href: "/admin/comments/stats" as Route, label: "Stats" },
] as const;

export const adminDocumentTabs = [
	{ href: "/admin/documents" as Route, label: "Overview" },
	{ href: "/admin/documents/list" as Route, label: "List" },
	{ href: "/admin/documents/stats" as Route, label: "Stats" },
] as const;

export const adminViewTabs = [
	{ href: "/admin/views" as Route, label: "Overview" },
	{ href: "/admin/views/list" as Route, label: "List" },
	{ href: "/admin/views/stats" as Route, label: "Stats" },
] as const;

export const adminFactTabs = [
	{ href: "/admin/facts/create" as Route, label: "Create" },
	{ href: "/admin/facts/inventory" as Route, label: "Inventory" },
] as const;
