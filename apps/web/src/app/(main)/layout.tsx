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
			<main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
		</MainShell>
	);
}
