import { AdminMainFrame } from "@/components/blocks/admin-main-frame";
import Header from "@/components/blocks/header";
import { MainShell } from "@/components/blocks/main-shell";
import { MobileAppShell } from "@/components/blocks/mobile-app-shell";
import { ViewsProvider } from "@/components/blocks/views-provider";

export default function MainLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<MainShell>
			<ViewsProvider>
				<Header />
				<MobileAppShell>
					<AdminMainFrame>{children}</AdminMainFrame>
				</MobileAppShell>
			</ViewsProvider>
		</MainShell>
	);
}
