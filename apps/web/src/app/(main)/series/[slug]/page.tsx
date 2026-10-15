import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SeriesDetailBooks } from "@/components/blocks/series-detail-books";
import { ShelfCover } from "@/components/blocks/shelf-cover";
import { loadSeriesBySlugForIsr } from "@/lib/isr-data";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	truncateDescription,
} from "@/lib/seo";

export async function generateMetadata({
	params,
}: PageProps<"/series/[slug]">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const series = await loadSeriesBySlugForIsr(slug);
		const description =
			series.description?.trim() ||
			`${series.bookCount} books in ${series.title}, in reading order.`;

		return buildPageMetadata({
			title: series.title,
			description: truncateDescription(description),
			path: `/series/${series.slug}`,
		});
	} catch {
		return buildNotFoundMetadata("Series");
	}
}

export default async function SeriesDetailPage({
	params,
}: PageProps<"/series/[slug]">) {
	const { slug } = await params;

	let series: Awaited<ReturnType<typeof loadSeriesBySlugForIsr>>;
	try {
		series = await loadSeriesBySlugForIsr(slug);
	} catch {
		notFound();
	}

	return (
		<div className="flex flex-col gap-10">
			<Link
				href={"/series" as Route}
				className="w-fit text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
			>
				All series
			</Link>

			<header className="flex flex-col gap-8 border-border border-b pb-10 lg:flex-row lg:items-start">
				<ShelfCover
					coverIds={series.coverPreviewCoverIds}
					size="lg"
					className="mx-auto shrink-0 lg:mx-0"
				/>
				<div className="flex min-w-0 flex-1 flex-col gap-4">
					<div className="flex flex-col gap-2">
						<h1 className="max-w-2xl font-bold text-3xl tracking-tight sm:text-4xl">
							{series.title}
						</h1>
						<p className="text-muted-foreground text-sm tabular-nums">
							Read in this order — {series.bookCount}{" "}
							{series.bookCount === 1 ? "book" : "books"}
						</p>
					</div>
					{series.description ? (
						<p className="max-w-prose whitespace-pre-wrap text-sm leading-relaxed">
							{series.description}
						</p>
					) : null}
				</div>
			</header>

			<div className="max-w-3xl">
				<SeriesDetailBooks books={series.books} />
			</div>
		</div>
	);
}
