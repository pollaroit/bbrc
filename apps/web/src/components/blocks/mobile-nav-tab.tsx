"use client";

import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tabClassName = (active: boolean, className?: string) =>
	cn(
		"relative flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 py-2 text-xs transition-colors",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
		active
			? "font-medium text-foreground"
			: "font-normal text-muted-foreground hover:text-foreground",
		className,
	);

function TabIndicator({ active }: { active: boolean }) {
	return (
		<span
			className={cn(
				"absolute inset-x-2 top-0 h-0.5 transition-opacity",
				active ? "bg-primary opacity-100" : "opacity-0",
			)}
			aria-hidden="true"
		/>
	);
}

function TabContent({
	label,
	icon: Icon,
	iconSlot,
}: {
	label: string;
	icon?: LucideIcon;
	iconSlot?: ReactNode;
}) {
	return (
		<>
			{iconSlot ??
				(Icon ? <Icon className="size-5 shrink-0" aria-hidden /> : null)}
			<span className="max-w-full truncate leading-none">{label}</span>
		</>
	);
}

type MobileNavTabLinkProps = {
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
	icon,
	iconSlot,
	className,
	...linkProps
}: MobileNavTabLinkProps) {
	return (
		<Link
			href={href}
			className={tabClassName(active, className)}
			aria-current={active ? "page" : undefined}
			{...linkProps}
		>
			<TabIndicator active={active} />
			<TabContent label={label} icon={icon} iconSlot={iconSlot} />
		</Link>
	);
}

type MobileNavTabButtonProps = {
	label: string;
	active: boolean;
	icon?: LucideIcon;
	iconSlot?: ReactNode;
	className?: string;
	onClick: () => void;
	"aria-label"?: string;
};

export function MobileNavTabButton({
	label,
	active,
	icon,
	iconSlot,
	className,
	onClick,
	"aria-label": ariaLabel,
}: MobileNavTabButtonProps) {
	return (
		<button
			type="button"
			className={tabClassName(active, className)}
			onClick={onClick}
			aria-label={ariaLabel ?? label}
		>
			<TabIndicator active={active} />
			<TabContent label={label} icon={icon} iconSlot={iconSlot} />
		</button>
	);
}
