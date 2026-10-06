"use client";

import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MobileNavTabProps = {
	href: Route;
	label: string;
	active: boolean;
	icon?: LucideIcon;
	iconSlot?: ReactNode;
	className?: string;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">;

export function MobileNavTab({
	href,
	label,
	active,
	icon: Icon,
	iconSlot,
	className,
	...linkProps
}: MobileNavTabProps) {
	return (
		<Link
			href={href}
			className={cn(
				"relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-xs transition-colors",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
				active
					? "font-medium text-foreground"
					: "font-normal text-muted-foreground hover:text-foreground",
				className,
			)}
			aria-current={active ? "page" : undefined}
			{...linkProps}
		>
			<span
				className={cn(
					"absolute inset-x-2 top-0 h-0.5 transition-opacity",
					active ? "bg-primary opacity-100" : "opacity-0",
				)}
				aria-hidden="true"
			/>
			{iconSlot ??
				(Icon ? <Icon className="size-5 shrink-0" aria-hidden /> : null)}
			<span className="max-w-full truncate leading-none">{label}</span>
		</Link>
	);
}
