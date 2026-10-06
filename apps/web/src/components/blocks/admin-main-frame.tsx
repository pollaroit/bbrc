"use client";

import { usePathname } from "next/navigation";

export function AdminMainFrame({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const isAdmin = pathname.startsWith("/admin");

	if (isAdmin) {
		return <div className="w-full">{children}</div>;
	}

	return <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>;
}
