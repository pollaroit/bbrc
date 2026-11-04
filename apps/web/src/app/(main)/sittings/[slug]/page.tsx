import type { Metadata } from "next";
import { SittingOverview } from "@/components/blocks/sitting-overview";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	sittingSlugStaticParams,
} from "@/lib/seo";
import { loadSittingBySlugForRequest } from "@/lib/sitting-page-data";
import { db } from "@/services";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateStaticParams() {
	return sittingSlugStaticParams(db);
}

export async function generateMetadata({
	params,
}: PageProps<"/sittings/[slug]">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const sitting = await loadSittingBySlugForRequest(slug);

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
	const sitting = await loadSittingBySlugForRequest(slug);

	return <SittingOverview sitting={sitting} />;
}
