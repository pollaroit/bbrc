import type { Metadata } from "next";
import { SittingOverview } from "@/components/blocks/sitting-overview";
import { loadSittingBySlugForIsr } from "@/lib/isr-data";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	sittingSlugStaticParams,
} from "@/lib/seo";
import { db } from "@/services";

/** ISR: keep in sync with `DETAIL_PAGE_REVALIDATE_SECONDS` in `@/lib/seo`. */
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
	return sittingSlugStaticParams(db);
}

export async function generateMetadata({
	params,
}: PageProps<"/sittings/[slug]">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const sitting = await loadSittingBySlugForIsr(slug);

		return buildPageMetadata({
			title: sitting.displayName,
			description: `BBRC reading sitting · ${sitting.participants.length} participants · status ${sitting.status}.`,
			path: `/sittings/${sitting.slug}`,
		});
	} catch {
		return buildNotFoundMetadata("Sitting");
	}
}

export default async function SittingPage({
	params,
}: PageProps<"/sittings/[slug]">) {
	const { slug } = await params;
	const sitting = await loadSittingBySlugForIsr(slug);

	return <SittingOverview sitting={sitting} />;
}
