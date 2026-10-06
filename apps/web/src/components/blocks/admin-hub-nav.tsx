"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
	{ href: "/admin", label: "Hub" },
	{ href: "/admin/users", label: "Members" },
	{ href: "/admin/books", label: "Books" },
] as const;

export function AdminHubNav() {
	const pathname = usePathname();

	return (
		<nav
			className="flex flex-wrap gap-2 border-border border-b pb-4"
			aria-label="Admin sections"
		>
			{links.map((link) => {
				const active =
					link.href === "/admin"
						? pathname === "/admin"
						: pathname.startsWith(link.href);

				return (
					<Link
						key={link.href}
						href={link.href as Route}
						className={cn(
							"border px-3 py-1.5 text-sm transition-colors",
							active
								? "border-foreground bg-foreground text-background"
								: "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground",
						)}
					>
						{link.label}
					</Link>
				);
			})}
		</nav>
	);
}
