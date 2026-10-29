"use client";

import { useQuery } from "@tanstack/react-query";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

/**
 * Who else is in Reading Mode on this book right now. Names and faces only for
 * members who show what they read; everyone else is just in the count.
 */
export function PresenceLine({
	bookSlug,
	refresh = false,
	className,
}: {
	bookSlug: string;
	/** Reading Mode keeps it fresh; a page just reads it once. */
	refresh?: boolean;
	className?: string;
}) {
	const { data } = useQuery({
		...orpc.readingSession.presence.queryOptions({ input: { bookSlug } }),
		staleTime: 30_000,
		refetchInterval: refresh ? 60_000 : false,
		retry: false,
	});
	if (!data) return null;

	const others = Math.max(0, data.count - (data.viewerPresent ? 1 : 0));
	if (others === 0) return null;

	return (
		<p
			className={cn(
				"flex items-center justify-center gap-2 text-muted-foreground text-sm",
				className,
			)}
		>
			{data.readers.length > 0 ? (
				<span className="flex -space-x-1.5">
					{data.readers.slice(0, 4).map((reader) => (
						<UserAvatar
							key={reader.username}
							user={{ name: reader.name, image: reader.image }}
							className="size-5 ring-2 ring-background"
						/>
					))}
				</span>
			) : null}
			<span>
				{others === 1 ? "1 other is" : `${others} others are`} reading this
				right now
			</span>
		</p>
	);
}
