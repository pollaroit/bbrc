import { notFound } from "next/navigation";
import { SittingShell } from "@/components/blocks/sitting-shell";
import { loadSittingBySlugForRequest } from "@/lib/sitting-page-data";

export const dynamic = "force-dynamic";

export default async function SittingSlugLayout({
	children,
	params,
}: LayoutProps<"/sittings/[slug]">) {
	const { slug } = await params;

	try {
		const sitting = await loadSittingBySlugForRequest(slug);

		return <SittingShell sitting={sitting}>{children}</SittingShell>;
	} catch {
		notFound();
	}
}
