"use client";

import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ReadingCard } from "@/components/blocks/reading/reading-card";
import { authClient } from "@/lib/auth-client";
import { useMyReadings } from "@/lib/reading/use-reading";
import { orpc } from "@/utils/orpc";

/**
 * "Currently reading" on a member's profile overview. On your own profile the
 * cards are the live ones (with the bar and buttons). On someone else's they
 * are read-only and follow that member's privacy: nothing at all when they
 * keep it private, and no bar or numbers when they hide progress.
 */
export function ProfileCurrentReading({ username }: { username: string }) {
	const { data: session } = authClient.useSession();
	const isSelf = session?.user?.username === username;

	const mine = useMyReadings(isSelf);
	const theirs = useQuery({
		...orpc.reading.forUser.queryOptions({ input: { username } }),
		enabled: !isSelf && session !== undefined,
		staleTime: 60_000,
	});

	if (isSelf) {
		const items = mine.data?.items ?? [];
		if (items.length === 0) return null;
		return (
			<section aria-label="Currently reading" className="flex flex-col gap-3">
				<h2 className="font-semibold text-base tracking-tight">
					Currently reading
				</h2>
				{items.map((reading) => (
					<ReadingCard key={reading.id} reading={reading} />
				))}
			</section>
		);
	}

	if (theirs.isPending) return <Skeleton className="h-32 w-full" aria-hidden />;
	const data = theirs.data;
	if (!data?.visible || data.items.length === 0) return null;

	return (
		<section aria-label="Currently reading" className="flex flex-col gap-3">
			<h2 className="font-semibold text-base tracking-tight">
				Currently reading
			</h2>
			{data.items.map((reading) => (
				<ReadingCard
					key={reading.id}
					reading={reading}
					readOnly
					progressVisible={reading.progressVisible}
				/>
			))}
		</section>
	);
}
