"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BodyPortal } from "@/components/blocks/body-portal";
import { MobileBottomBar } from "@/components/blocks/mobile-bottom-bar";
import { mobileMainBottomPaddingClass } from "@/components/blocks/mobile-shell-chrome";
import { MobileTopBar } from "@/components/blocks/mobile-top-bar";
import { PwaInstallHint } from "@/components/blocks/pwa-install-hint";
import { cn } from "@/lib/utils";

export function MobileAppShell({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const hideChrome =
		pathname.startsWith("/admin") ||
		pathname === "/reels" ||
		/^\/users\/[^/]+\/reels\/[^/]+$/.test(pathname);

	if (hideChrome) {
		return <>{children}</>;
	}

	return (
		<>
			<BodyPortal>
				<MobileTopBar />
				<PwaInstallHint />
				<MobileBottomBar />
			</BodyPortal>
			<div
				className={cn(
					"md:contents",
					"pt-[calc(3.5rem+max(0.25rem,env(safe-area-inset-top)))]",
					mobileMainBottomPaddingClass,
				)}
			>
				{children}
			</div>
		</>
	);
}
