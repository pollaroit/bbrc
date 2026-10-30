"use client";

import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { FriendButton } from "@/components/blocks/friend-button";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { orpc } from "@/utils/orpc";

/**
 * A member's friends. The owner, their friends and admins see the list; everyone
 * else sees only how many there are.
 */
export function MemberFriendsList({
	username,
	name,
}: {
	username: string;
	name: string;
}) {
	const query = useQuery(
		orpc.friend.list.queryOptions({ input: { username, limit: 100 } }),
	);

	if (query.isPending) {
		return (
			<div className="flex flex-col gap-2" aria-hidden>
				{[0, 1, 2].map((key) => (
					<Skeleton key={key} className="h-[4.5rem] w-full" />
				))}
			</div>
		);
	}
	if (query.isError || !query.data) {
		return (
			<p className="text-destructive text-sm">
				Could not load the friend list.
			</p>
		);
	}

	const { visible, count, items } = query.data;

	if (!visible) {
		return (
			<div className="flex flex-col items-center gap-2 border border-border border-dashed px-6 py-12 text-center">
				<Lock className="size-5 text-muted-foreground" aria-hidden />
				<p className="font-medium text-sm tabular-nums">
					{count} {count === 1 ? "friend" : "friends"}
				</p>
				<p className="max-w-sm text-muted-foreground text-sm">
					Only {name}'s friends can see who they are.
				</p>
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<div className="border border-border border-dashed p-8 text-center text-muted-foreground text-sm">
				No friends yet.
			</div>
		);
	}

	return (
		<ul className="grid gap-2 sm:grid-cols-2">
			{items.map((member) => (
				<li
					key={member.username}
					className="flex items-center gap-3 border border-border p-3"
				>
					<Link
						href={`/users/${member.username}` as Route}
						className="flex min-w-0 flex-1 items-center gap-3"
					>
						<UserAvatar user={member} className="size-11" />
						<span className="min-w-0">
							<span className="flex items-center gap-1.5 font-medium text-sm">
								<span className="truncate">{member.name}</span>
								{member.isPrivate ? (
									<>
										<Lock
											className="size-3.5 shrink-0 text-muted-foreground"
											aria-hidden
										/>
										<span className="sr-only">Private profile</span>
									</>
								) : null}
							</span>
							<span className="block truncate text-muted-foreground text-xs">
								@{member.username}
							</span>
						</span>
					</Link>
					<FriendButton username={member.username} />
				</li>
			))}
		</ul>
	);
}
