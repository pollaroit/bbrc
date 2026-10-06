import { ComposePostFab } from "@/components/blocks/compose-post-form";
import { OngoingSittingBanner } from "@/components/blocks/ongoing-sitting-banner";
import { PostFeed } from "@/components/blocks/post-feed";
import { ReelsEntryFab } from "@/components/blocks/reels-entry-fab";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadOngoingSittingForIsr } from "@/lib/isr-data";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 60;

const homeMetadata = buildPageMetadata({
	title: "Feed",
	description: "Club activity and the current reading sitting at a glance.",
	path: "/",
});

export const metadata = {
	...homeMetadata,
	alternates: {
		...homeMetadata.alternates,
		types: {
			"application/rss+xml": "/feed/posts",
		},
	},
};

export default async function HomePage() {
	const ongoing = await loadOngoingSittingForIsr();

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-8 pb-24">
			<div>
				<h1 className="font-bold text-2xl tracking-tight">Feed</h1>
				<p className="text-muted-foreground text-sm">
					Club activity and the current sitting at a glance.
				</p>
			</div>

			{ongoing ? <OngoingSittingBanner sitting={ongoing} /> : null}

			<ListingSearchParamsBoundary>
				<PostFeed showFeedControls />
			</ListingSearchParamsBoundary>

			<ReelsEntryFab />
			<ComposePostFab />
		</div>
	);
}
