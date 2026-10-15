import { Button } from "@bbrc/ui/components/button";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminSeriesWorkspaceShellProps = {
	backHref?: Route;
	backLabel?: string;
	title: string;
	description?: string;
	publicHref?: Route;
	children: ReactNode;
	aside?: ReactNode;
};

export function AdminSeriesWorkspaceShell({
	backHref = "/admin/series/list" as Route,
	backLabel = "Back to list",
	title,
	description,
	publicHref,
	children,
	aside,
}: AdminSeriesWorkspaceShellProps) {
	return (
		<div className="flex flex-col gap-8">
			<header className="flex flex-col gap-4 border-border border-b pb-6 lg:flex-row lg:items-start lg:justify-between">
				<div className="flex max-w-2xl flex-col gap-2">
					<Link
						href={backHref}
						className="w-fit text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
					>
						{backLabel}
					</Link>
					<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
						{title}
					</h1>
					{description ? (
						<p className="text-muted-foreground text-sm leading-relaxed">
							{description}
						</p>
					) : null}
				</div>
				{publicHref ? (
					<Button
						render={<Link href={publicHref} />}
						nativeButton={false}
						variant="outline"
						size="sm"
						className="shrink-0"
					>
						View public page
					</Button>
				) : null}
			</header>

			<div
				className={cn(
					"grid gap-10",
					aside && "xl:grid-cols-[minmax(0,1fr)_min(20rem,28%)]",
				)}
			>
				<div className="flex min-w-0 flex-col gap-10">{children}</div>
				{aside ? (
					<aside className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-6 xl:self-start">
						{aside}
					</aside>
				) : null}
			</div>
		</div>
	);
}

export function AdminSeriesWorkspacePanel({
	title,
	description,
	children,
	className,
}: {
	title: string;
	description?: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section className={cn("flex flex-col gap-4", className)}>
			<div className="flex flex-col gap-1">
				<h2 className="font-semibold text-lg tracking-tight">{title}</h2>
				{description ? (
					<p className="max-w-prose text-muted-foreground text-sm">
						{description}
					</p>
				) : null}
			</div>
			<div className="border border-border bg-card p-4 sm:p-5">{children}</div>
		</section>
	);
}

export function AdminSeriesPreviewAside({
	title,
	description,
	bookCount,
	children,
}: {
	title: string;
	description?: string | null;
	bookCount?: number;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-4 border border-border bg-muted/15 p-4">
			<div className="flex flex-col gap-2 border-border border-b pb-3">
				<p className="font-medium text-sm">Reader preview</p>
				<p className="font-semibold text-base leading-snug">
					{title || "Untitled series"}
				</p>
				{bookCount != null ? (
					<p className="text-muted-foreground text-xs tabular-nums">
						{bookCount} {bookCount === 1 ? "book" : "books"} in order
					</p>
				) : null}
				{description?.trim() ? (
					<p className="line-clamp-4 text-muted-foreground text-xs leading-relaxed">
						{description}
					</p>
				) : null}
			</div>
			{children}
		</div>
	);
}
