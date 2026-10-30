"use client";

import type { FriendMember } from "@bbrc/api/modules/friend/friend.schema";
import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { useFriendActions } from "@/lib/friends/use-friends";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const TABS = ["friends", "requests", "blocked"] as const;
type Tab = (typeof TABS)[number];

function MemberRow({
	member,
	children,
}: {
	member: FriendMember;
	children?: React.ReactNode;
}) {
	return (
		<li className="flex items-center gap-3 border border-border p-3">
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
			<div className="flex shrink-0 items-center gap-1.5">{children}</div>
		</li>
	);
}

function Empty({ title, hint }: { title: string; hint: string }) {
	return (
		<div className="border border-border border-dashed p-8 text-center">
			<p className="font-medium text-sm">{title}</p>
			<p className="mt-1 text-muted-foreground text-sm">{hint}</p>
		</div>
	);
}

function ListSkeleton() {
	return (
		<div className="flex flex-col gap-2" aria-hidden>
			{[0, 1, 2].map((key) => (
				<Skeleton key={key} className="h-[4.5rem] w-full" />
			))}
		</div>
	);
}

function FriendRow({ member }: { member: FriendMember }) {
	const actions = useFriendActions(member.username);
	return (
		<MemberRow member={member}>
			<Button
				size="sm"
				variant="outline"
				disabled={actions.pending}
				onClick={actions.remove}
			>
				Remove
			</Button>
		</MemberRow>
	);
}

function IncomingRow({ member }: { member: FriendMember }) {
	const actions = useFriendActions(member.username);
	return (
		<MemberRow member={member}>
			<Button size="sm" disabled={actions.pending} onClick={actions.accept}>
				Accept
			</Button>
			<Button
				size="sm"
				variant="outline"
				disabled={actions.pending}
				onClick={actions.decline}
			>
				Decline
			</Button>
		</MemberRow>
	);
}

function OutgoingRow({ member }: { member: FriendMember }) {
	const actions = useFriendActions(member.username);
	return (
		<MemberRow member={member}>
			<Button
				size="sm"
				variant="outline"
				disabled={actions.pending}
				onClick={actions.cancel}
			>
				Cancel request
			</Button>
		</MemberRow>
	);
}

function BlockedRow({ member }: { member: FriendMember }) {
	const actions = useFriendActions(member.username);
	return (
		<MemberRow member={member}>
			<Button
				size="sm"
				variant="outline"
				disabled={actions.pending}
				onClick={actions.unblock}
			>
				Unblock
			</Button>
		</MemberRow>
	);
}

function FriendsTab() {
	const query = useQuery(
		orpc.friend.list.queryOptions({ input: { limit: 100 } }),
	);
	if (query.isPending) return <ListSkeleton />;
	const items = query.data?.items ?? [];
	if (items.length === 0) {
		return (
			<Empty
				title="No friends yet"
				hint="Open a member's profile and choose Add friend. They have to accept."
			/>
		);
	}
	return (
		<ul className="flex flex-col gap-2">
			{items.map((item) => (
				<FriendRow key={item.username} member={item} />
			))}
		</ul>
	);
}

function RequestsTab() {
	const query = useQuery(orpc.friend.requests.queryOptions());
	if (query.isPending) return <ListSkeleton />;
	const incoming = query.data?.incoming ?? [];
	const outgoing = query.data?.outgoing ?? [];
	if (incoming.length === 0 && outgoing.length === 0) {
		return (
			<Empty
				title="No requests"
				hint="Requests you send and receive wait here until they are answered."
			/>
		);
	}
	return (
		<div className="flex flex-col gap-6">
			{incoming.length > 0 ? (
				<section className="flex flex-col gap-2">
					<h2 className="font-medium text-sm">Waiting for your answer</h2>
					<ul className="flex flex-col gap-2">
						{incoming.map((item) => (
							<IncomingRow key={item.username} member={item} />
						))}
					</ul>
				</section>
			) : null}
			{outgoing.length > 0 ? (
				<section className="flex flex-col gap-2">
					<h2 className="font-medium text-sm">Requests you sent</h2>
					<ul className="flex flex-col gap-2">
						{outgoing.map((item) => (
							<OutgoingRow key={item.username} member={item} />
						))}
					</ul>
				</section>
			) : null}
		</div>
	);
}

function BlockedTab() {
	const query = useQuery(orpc.friend.blocked.queryOptions());
	if (query.isPending) return <ListSkeleton />;
	const items = query.data?.items ?? [];
	if (items.length === 0) {
		return (
			<Empty
				title="Nobody blocked"
				hint="Members you block never see you in the app and you never see them."
			/>
		);
	}
	return (
		<ul className="flex flex-col gap-2">
			{items.map((item) => (
				<BlockedRow key={item.username} member={item} />
			))}
		</ul>
	);
}

/** Friends, requests and blocks. The tab is in the address (`?tab=requests`) so a notification can open it. */
export function FriendsPage() {
	const [tab, setTab] = useQueryState(
		"tab",
		parseAsStringLiteral(TABS).withDefault("friends"),
	);
	const friends = useQuery(
		orpc.friend.list.queryOptions({ input: { limit: 100 } }),
	);
	const requests = useQuery(orpc.friend.requests.queryOptions());

	const labels: Record<Tab, string> = {
		friends: "Friends",
		requests: "Requests",
		blocked: "Blocked",
	};
	const counts: Partial<Record<Tab, number>> = {
		friends: friends.data?.count,
		requests: requests.data?.incoming.length,
	};

	return (
		<div className="flex flex-col gap-6">
			<div
				role="tablist"
				aria-label="Friends"
				className="grid grid-cols-3 border border-border"
			>
				{TABS.map((id) => {
					const active = id === tab;
					const count = counts[id];
					return (
						<button
							key={id}
							type="button"
							role="tab"
							aria-selected={active}
							onClick={() => void setTab(id)}
							className={cn(
								"flex h-14 items-center justify-center gap-2 border-border border-r font-medium text-base transition-colors last:border-r-0 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring",
								active
									? "bg-foreground text-background"
									: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
							)}
						>
							{labels[id]}
							{count != null && count > 0 ? (
								<span
									className={cn(
										"min-w-5 px-1.5 text-center text-xs tabular-nums",
										active ? "bg-background/20" : "bg-muted",
									)}
								>
									{count}
								</span>
							) : null}
						</button>
					);
				})}
			</div>
			<div role="tabpanel">
				{tab === "friends" ? <FriendsTab /> : null}
				{tab === "requests" ? <RequestsTab /> : null}
				{tab === "blocked" ? <BlockedTab /> : null}
			</div>
		</div>
	);
}
