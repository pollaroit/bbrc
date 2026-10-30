"use client";

import {
	type PostFeedTab,
	postFeedTabValues,
	usePostFeedSearchParams,
} from "@/lib/listing/post-feed-listing";
import { cn } from "@/lib/utils";

const labels: Record<PostFeedTab, string> = {
	"for-you": "For You",
	friends: "From Friends",
};

/** Big two-segment switch above the home feed. The choice lives in the address (`?feed=friends`). */
export function FeedTabs() {
	const [params, setParams] = usePostFeedSearchParams();

	return (
		<div
			role="tablist"
			aria-label="Feed"
			className="grid w-full grid-cols-2 border border-border"
		>
			{postFeedTabValues.map((id) => {
				const active = params.feed === id;
				return (
					<button
						key={id}
						type="button"
						role="tab"
						aria-selected={active}
						onClick={() => void setParams({ feed: id })}
						className={cn(
							"flex h-12 items-center justify-center border-border border-r px-4 font-medium text-base transition-colors last:border-r-0 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring",
							active
								? "bg-foreground text-background"
								: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
						)}
					>
						{labels[id]}
					</button>
				);
			})}
		</div>
	);
}
