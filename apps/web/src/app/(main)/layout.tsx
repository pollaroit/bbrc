import { AdminMainFrame } from "@/components/blocks/admin-main-frame";
import Header from "@/components/blocks/header";
import { MainShell } from "@/components/blocks/main-shell";

export default function MainLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<MainShell>
			<Header />
			<AdminMainFrame>{children}</AdminMainFrame>
		</MainShell>
	);
}
