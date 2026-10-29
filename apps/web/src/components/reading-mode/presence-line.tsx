"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { authClient } from "@/lib/auth-client";
import { useLivePresence } from "@/lib/realtime/use-realtime";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

/**
 * Who else is in Reading Mode on this book right now, live. Names and faces only
 * for members who show what they read; everyone else is just in the count.
 *
 * When realtime is connected, it listens to the book's channel and asks the
 * server who those (opaque) ids are. When it is not (signed out, switched off, or
 * the connection dropped), it quietly goes back to asking now and then.
 */
export function PresenceLine({
	bookSlug,
	refresh = false,
	highlightNew = false,
	className,
}: {
	bookSlug: string;
	/** Keep asking every minute while realtime is not live (Reading Mode). */
	refresh?: boolean;
	/** A reader who has just arrived gets a brief ring (the book page; Reading Mode stays calm). */
	highlightNew?: boolean;
	className?: string;
}) {
	const { data: session } = authClient.useSession();
	const live = useLivePresence(bookSlug, Boolean(session?.user));

	// A flurry of joins and leaves becomes one question.
	const key = useDebouncedValue(live.ids ? live.ids.join(",") : null, 400);
	const liveIds = key == null ? null : key === "" ? [] : key.split(",");
	const nobodyLive = liveIds != null && liveIds.length === 0;

	const { data } = useQuery({
		...orpc.readingSession.presence.queryOptions({
			input: {
				bookSlug,
				...(liveIds && liveIds.length > 0 ? { liveClientIds: liveIds } : {}),
			},
		}),
		enabled: !nobodyLive,
		staleTime: 30_000,
		refetchInterval: liveIds == null && refresh ? 60_000 : false,
		placeholderData: keepPreviousData,
		retry: false,
	});

	// Someone new arrives: their face gets a ring for a few seconds, nothing else moves.
	const known = useRef<Set<string> | null>(null);
	const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
	useEffect(() => {
		if (!highlightNew || !data) return;
		const names = data.readers.map((reader) => reader.username);
		const before = known.current;
		known.current = new Set(names);
		if (!before) return;
		const added = names.filter((name) => !before.has(name));
		if (added.length === 0) return;
		setFresh(new Set(added));
		const timer = window.setTimeout(() => setFresh(new Set()), 3500);
		return () => window.clearTimeout(timer);
	}, [data, highlightNew]);

	if (nobodyLive || !data) return null;

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
							className={cn(
								"size-5 ring-2 transition-shadow",
								fresh.has(reader.username)
									? "animate-pulse ring-primary motion-reduce:animate-none"
									: "ring-background",
							)}
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
