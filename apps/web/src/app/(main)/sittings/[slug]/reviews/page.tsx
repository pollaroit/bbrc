import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SittingReviewsSection } from "@/components/blocks/sitting-reviews-section";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadSittingBySlugForIsr } from "@/lib/isr-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";

/** ISR: keep in sync with `DETAIL_PAGE_REVALIDATE_SECONDS` in `@/lib/seo`. */
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateMetadata({
	params,
}: PageProps<"/sittings/[slug]/reviews">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const sitting = await loadSittingBySlugForIsr(slug);

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

	let sitting: Awaited<ReturnType<typeof loadSittingBySlugForIsr>>;
	try {
		sitting = await loadSittingBySlugForIsr(slug);
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
