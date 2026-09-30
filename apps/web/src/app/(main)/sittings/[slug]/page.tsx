import type { Metadata } from "next";
import { cache } from "react";
import { SittingDetail } from "@/components/blocks/sitting-detail";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	DETAIL_PAGE_REVALIDATE_SECONDS,
	sittingSlugStaticParams,
} from "@/lib/seo";
import { db } from "@/services";
import { orpc } from "@/utils/orpc";

export const revalidate = DETAIL_PAGE_REVALIDATE_SECONDS;
export const dynamicParams = true;

export async function generateStaticParams() {
	return sittingSlugStaticParams(db);
}

const loadSittingBySlug = cache((slug: string) =>
	orpc.sitting.getSittingBySlug.call(slug),
);

export async function generateMetadata({
	params,
}: PageProps<"/sittings/[slug]">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const sitting = await loadSittingBySlug(slug);

		return buildPageMetadata({
			title: `Sitting ${sitting.slug}`,
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
	const sitting = await loadSittingBySlug(slug);

	return <SittingDetail sitting={sitting} />;
}
