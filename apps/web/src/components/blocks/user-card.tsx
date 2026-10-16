import type { GetUserListOutput } from "@bbrc/api/modules/user/user.schema";
import { Card, CardContent } from "@bbrc/ui/components/card";
import { Crown } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { UserPanel } from "@/components/blocks/user-panel";
import { UserStatusBadge } from "@/components/blocks/user-status-badge";
import { cn } from "@/lib/utils";

export type UserCardUser = GetUserListOutput["items"][number];

type UserCardProps = {
	user: UserCardUser;
	className?: string;
};

export function UserCard({ user, className }: UserCardProps) {
	const profileHref = `/users/${user.username}` as Route;

	return (
		<Link href={profileHref} className={cn("block h-full", className)}>
			<Card size="sm" className="h-full transition-colors hover:bg-muted/40">
				<CardContent className="flex h-full flex-col gap-3">
					<UserPanel
						user={user}
						className="min-w-0 items-start"
						renderTitle={(member) => (
							<span className="flex min-w-0 items-center gap-1.5 font-medium text-sm">
								<span className="truncate">{member.name}</span>
								{user.isAdmin ? (
									<Crown
										className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
										aria-label="Administrator"
									/>
								) : null}
							</span>
						)}
					/>

					<div className="mt-auto flex flex-wrap items-end justify-between gap-2">
						<UserStatusBadge status={user.status} />
						<dl className="flex shrink-0 flex-col items-end gap-0.5 text-muted-foreground text-xs tabular-nums">
							<div>
								<dt className="sr-only">Experience points</dt>
								<dd>
									{user.xpLevel.label} · {user.xp} XP
								</dd>
							</div>
							<div>
								<dt className="sr-only">Reading points</dt>
								<dd>
									{user.rpLevel.label} · {user.rp} RP
								</dd>
							</div>
						</dl>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
