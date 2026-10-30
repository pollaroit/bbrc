"use client";

import { FriendsList } from "@/components/blocks/friends-list";

/** A member's friends on their profile: the same list as everywhere else. */
export function MemberFriendsList({
	username,
	name,
	isOwn = false,
}: {
	username: string;
	name: string;
	isOwn?: boolean;
}) {
	return <FriendsList username={username} name={name} isOwn={isOwn} />;
}
