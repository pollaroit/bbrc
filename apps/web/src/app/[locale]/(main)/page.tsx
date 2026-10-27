import { toLocale } from "@bbrc/i18n";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OngoingSittingBanner } from "@/components/blocks/ongoing-sitting-banner";
import { PostFeed } from "@/components/blocks/post-feed";
import { HomeReadingCards } from "@/components/blocks/reading/home-reading-cards";
import { TrendingStrip } from "@/components/blocks/trending-strip";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadOngoingSittingForIsr } from "@/lib/isr-data";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata({
	params,
}: PageProps<"/[locale]">): Promise<Metadata> {
	const locale = toLocale((await params).locale);
	const t = await getTranslations({ locale, namespace: "shell.home" });
	const homeMetadata = buildPageMetadata({
		title: t("meta.title"),
		description: t("meta.description"),
		path: "/",
		locale,
	});

	return {
		...homeMetadata,
		alternates: {
			...homeMetadata.alternates,
			types: {
				"application/rss+xml": "/feed/posts",
			},
		},
	};
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
	const locale = toLocale((await params).locale);
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "shell.home" });
	const ongoing = await loadOngoingSittingForIsr();

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-8 pb-24">
			<div>
				<h1 className="font-bold text-2xl tracking-tight">{t("title")}</h1>
				<p className="text-muted-foreground text-sm">{t("subtitle")}</p>
			</div>

			<HomeReadingCards />

			{ongoing ? <OngoingSittingBanner sitting={ongoing} /> : null}

			<TrendingStrip resource="post" className="-mt-2" />

			<ListingSearchParamsBoundary>
				<PostFeed showFeedControls />
			</ListingSearchParamsBoundary>
		</div>
	);
}
