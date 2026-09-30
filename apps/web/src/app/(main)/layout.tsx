import Header from "@/components/blocks/header";

export default function MainLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div>
			<Header />
			<main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
		</div>
	);
}
