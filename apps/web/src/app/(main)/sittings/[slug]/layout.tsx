import { notFound } from "next/navigation";
import { SittingShell } from "@/components/blocks/sitting-shell";
import { loadSittingBySlugForIsr } from "@/lib/isr-data";

export default async function SittingSlugLayout({
	children,
	params,
}: LayoutProps<"/sittings/[slug]">) {
	const { slug } = await params;

	try {
		const sitting = await loadSittingBySlugForIsr(slug);

		return <SittingShell sitting={sitting}>{children}</SittingShell>;
	} catch {
		notFound();
	}
}
