"use client";

import { Loader2, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type MouseEvent, type ReactNode, useState } from "react";
import { pageIsAtTop, refreshPage, scrollPageToTop } from "@/lib/refresh-page";
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

/** The spinner stays at least this long, so a quick refresh still reads as one. */
const MIN_REFRESH_MS = 700;

/**
 * A bottom-bar tab. Tapping the tab of the page you are already on does what
 * installed apps do: the first tap scrolls to the top, and a tap while you are
 * at the top refreshes the page. From anywhere else it is an ordinary link.
 */
export function MobileNavTab({
	href,
	label,
	active,
	icon,
	iconSlot,
	className,
	onClick,
	...linkProps
}: MobileNavTabLinkProps) {
	const router = useRouter();
	const pathname = usePathname();
	const [refreshing, setRefreshing] = useState(false);

	function handleClick(event: MouseEvent<HTMLAnchorElement>) {
		onClick?.(event);
		if (event.defaultPrevented) return;
		// Only the tab's own page; a book inside Library still navigates to Library.
		if (pathname !== href) return;
		event.preventDefault();
		if (!pageIsAtTop()) {
			scrollPageToTop();
			return;
		}
		if (refreshing) return;
		setRefreshing(true);
		void Promise.all([
			refreshPage(router).catch(() => undefined),
			new Promise((resolve) => window.setTimeout(resolve, MIN_REFRESH_MS)),
		]).finally(() => setRefreshing(false));
	}

	return (
		<Link
			href={href}
			className={tabClassName(active, className)}
			aria-current={active ? "page" : undefined}
			aria-busy={refreshing || undefined}
			onClick={handleClick}
			{...linkProps}
		>
			<TabIndicator active={active} />
			<TabContent
				label={refreshing ? "Refreshing" : label}
				icon={refreshing ? undefined : icon}
				iconSlot={
					refreshing ? (
						<Loader2
							className="size-5 shrink-0 animate-spin motion-reduce:animate-none"
							aria-hidden
						/>
					) : (
						iconSlot
					)
				}
			/>
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
