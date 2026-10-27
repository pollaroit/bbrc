import type { Metadata } from "next";
import { SeriesList } from "@/components/blocks/series-list";
import { SeriesListingToolbar } from "@/components/blocks/series-listing-toolbar";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { buildPageMetadata, truncateDescription } from "@/lib/seo";
import { db } from "@/services";

export async function generateMetadata(): Promise<Metadata> {
	const [seriesCount, volumeCount] = await Promise.all([
		db.series.count(),
		db.seriesBook.count(),
	]);

	const description =
		seriesCount > 0
			? `${seriesCount} curated ${seriesCount === 1 ? "list" : "lists"} · ${volumeCount} catalog ${volumeCount === 1 ? "volume" : "volumes"} in numbered reading order.`
			: "Reading order for multi-book series in the BBRC catalog — follow the club’s numbered lists.";

	return buildPageMetadata({
		title: "Series",
		description: truncateDescription(description),
		path: "/series",
	});
}

export default function SeriesIndexPage() {
	return (
		<div className="flex flex-col gap-8">
			<header className="flex flex-col gap-4 border-border border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
				<div className="flex max-w-2xl flex-col gap-3">
					<h1 className="font-bold text-3xl tracking-tight">Series</h1>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Club-curated reading order for multi-volume works. Each list is
						numbered start to finish so you can pick up the next title without
						guessing.
					</p>
				</div>
				<p className="text-muted-foreground text-sm tabular-nums sm:text-right">
					Sorted by title unless you change it below
				</p>
			</header>
			<ListingSearchParamsBoundary>
				<SeriesListingToolbar />
				<SeriesList />
			</ListingSearchParamsBoundary>
		</div>
	);
}
