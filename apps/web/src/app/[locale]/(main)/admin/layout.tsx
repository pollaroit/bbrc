import type { Metadata } from "next";
import { AdminAppShell } from "@/components/blocks/admin-app-shell";
import { NO_INDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
	robots: NO_INDEX_ROBOTS,
};

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <AdminAppShell>{children}</AdminAppShell>;
}
