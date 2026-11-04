import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SittingReviewsSection } from "@/components/blocks/sitting-reviews-section";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";
import { loadSittingBySlugForRequest } from "@/lib/sitting-page-data";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({
	params,
}: PageProps<"/sittings/[slug]/reviews">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const sitting = await loadSittingBySlugForRequest(slug);

		return buildPageMetadata({
			title: `Reviews · ${sitting.displayName}`,
			description: `${sitting.stats.reviewCount} reviews from readers of this BBRC sitting.`,
			path: `/sittings/${sitting.slug}/reviews`,
		});
	} catch {
		return buildNotFoundMetadata("Sitting");
	}
}

export default async function SittingReviewsPage({
	params,
}: PageProps<"/sittings/[slug]/reviews">) {
	const { slug } = await params;

	let sitting: Awaited<ReturnType<typeof loadSittingBySlugForRequest>>;
	try {
		sitting = await loadSittingBySlugForRequest(slug);
	} catch {
		notFound();
	}

	if (!sitting.selectedBook) {
		redirect(`/sittings/${sitting.slug}`);
	}

	return (
		<ListingSearchParamsBoundary>
			<SittingReviewsSection sitting={sitting} />
		</ListingSearchParamsBoundary>
	);
}
