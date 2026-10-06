"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MobileBottomBar } from "@/components/blocks/mobile-bottom-bar";
import { MobileTopBar } from "@/components/blocks/mobile-top-bar";
import { cn } from "@/lib/utils";

export function MobileAppShell({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const isAdmin = pathname.startsWith("/admin");

	if (isAdmin) {
		return <>{children}</>;
	}

	return (
		<>
			<MobileTopBar />
			<div
				className={cn(
					"md:contents",
					"pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(4.5rem+env(safe-area-inset-bottom))]",
				)}
			>
				{children}
			</div>
			<MobileBottomBar />
		</>
	);
}
