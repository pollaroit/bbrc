"use client";

import { usePathname } from "@/i18n/navigation";
import { isAdminAuthorScreen } from "@/lib/admin-author-screens";

export function AdminMainFrame({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const isAdmin =
		pathname.startsWith("/admin") || isAdminAuthorScreen(pathname);
	const isReels = pathname.startsWith("/reels");

	if (isReels) {
		return <>{children}</>;
	}

	if (isAdmin) {
		return <div className="w-full">{children}</div>;
	}

	return <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>;
}
