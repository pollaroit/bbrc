import { ComposePostFab } from "@/components/blocks/compose-post-form";
import { OngoingSittingBanner } from "@/components/blocks/ongoing-sitting-banner";
import { PostFeed } from "@/components/blocks/post-feed";
import { orpc } from "@/utils/orpc";

export default async function HomePage() {
	const ongoing = await orpc.sitting.getOngoingSitting.call();

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-8 pb-24">
			<div>
				<h1 className="font-bold text-2xl tracking-tight">Feed</h1>
				<p className="text-muted-foreground text-sm">
					Club activity and the current sitting at a glance.
				</p>
			</div>

			{ongoing ? <OngoingSittingBanner sitting={ongoing} /> : null}

			<PostFeed />

			<ComposePostFab />
		</div>
	);
}
