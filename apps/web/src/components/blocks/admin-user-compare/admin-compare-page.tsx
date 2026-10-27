"use client";

import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, GitCompareArrows } from "lucide-react";
import type { Route } from "next";
import { UserAvatar } from "@/components/blocks/user-avatar";
import {
	CompareMemberPicker,
	CompareView,
} from "@/components/blocks/user-compare/compare-view";
import { Link } from "@/i18n/navigation";
import { useAdminCompareSearchParams } from "@/lib/listing/admin-user-compare-listing";
import { orpc } from "@/utils/orpc";

function SideSlot({
	label,
	username,
	other,
	onSelect,
}: {
	label: string;
	username: string | null;
	other: string | null;
	onSelect: (username: string) => void;
}) {
	return (
		<div className="flex min-w-0 flex-1 items-center gap-3 border border-border bg-card p-3">
			{username ? (
				<UserAvatar user={{ name: username }} className="size-9" />
			) : (
				<span
					aria-hidden
					className="flex size-9 shrink-0 items-center justify-center border border-border border-dashed text-muted-foreground"
				>
					?
				</span>
			)}
			<div className="flex min-w-0 flex-1 flex-col">
				<span className="text-muted-foreground text-xs">{label}</span>
				<span className="truncate font-medium text-sm">
					{username ? `@${username}` : "Pick a member"}
				</span>
			</div>
			<CompareMemberPicker
				asAdmin
				value={username ?? undefined}
				excludeUsername={other ?? undefined}
				onSelect={onSelect}
			/>
		</div>
	);
}

/** Suggestions while no pair is chosen: the most and the least alike pairs of the whole club. */
function Suggestions({ onPick }: { onPick: (a: string, b: string) => void }) {
	const { data, isPending } = useQuery({
		...orpc.userCompareAdmin.stats.queryOptions({ input: { filters: {} } }),
		staleTime: 60_000,
	});
	const top = data?.topPairs[0];
	const bottom = data?.bottomPairs[0];

	return (
		<div className="flex flex-col items-center gap-4 border border-border border-dashed bg-card px-4 py-12 text-center">
			<GitCompareArrows className="size-8 text-muted-foreground" aria-hidden />
			<div className="flex flex-col gap-1">
				<h2 className="font-medium text-base">Pick two members to compare</h2>
				<p className="max-w-md text-muted-foreground text-sm">
					As an admin you can compare any two members, including those who
					turned comparisons off. Or start from a pair the club already stands
					out in.
				</p>
			</div>
			{isPending ? (
				<Skeleton className="h-8 w-64" />
			) : top || bottom ? (
				<div className="flex flex-wrap justify-center gap-2">
					{top ? (
						<Button
							variant="outline"
							size="sm"
							onClick={() => onPick(top.a.username, top.b.username)}
						>
							Most alike: {top.a.name} and {top.b.name} ({top.score})
						</Button>
					) : null}
					{bottom ? (
						<Button
							variant="outline"
							size="sm"
							onClick={() => onPick(bottom.a.username, bottom.b.username)}
						>
							Least alike: {bottom.a.name} and {bottom.b.name} ({bottom.score})
						</Button>
					) : null}
				</div>
			) : null}
			<Link
				href={"/admin/users/compare/stats" as Route}
				className="text-sm underline-offset-4 hover:underline"
			>
				See the club-wide comparison
			</Link>
		</div>
	);
}

export function AdminComparePage() {
	const [{ a, b }, setPair] = useAdminCompareSearchParams();

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
				<SideSlot
					label="First member"
					username={a}
					other={b}
					onSelect={(username) => setPair({ a: username })}
				/>
				<Button
					variant="ghost"
					size="icon"
					className="mx-auto shrink-0"
					aria-label="Swap the two members"
					disabled={!a && !b}
					onClick={() => setPair({ a: b, b: a })}
				>
					<ArrowLeftRight aria-hidden />
				</Button>
				<SideSlot
					label="Second member"
					username={b}
					other={a}
					onSelect={(username) => setPair({ b: username })}
				/>
			</div>

			{a && b ? (
				a === b ? (
					<p
						role="alert"
						className="border border-destructive/40 bg-destructive/10 p-3 text-destructive-ink text-sm"
					>
						Pick two different members.
					</p>
				) : (
					<CompareView
						a={a}
						b={b}
						asAdmin
						onChangeMember={(side, username) =>
							setPair(side === "a" ? { a: username } : { b: username })
						}
					/>
				)
			) : (
				<Suggestions
					onPick={(first, second) => setPair({ a: first, b: second })}
				/>
			)}
		</div>
	);
}
