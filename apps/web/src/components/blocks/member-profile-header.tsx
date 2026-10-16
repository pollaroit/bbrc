import type { GetUserByUsernameOutput } from "@bbrc/api/modules/user/user.schema";
import { Button } from "@bbrc/ui/components/button";
import { Crown } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { MemberLevelsInfoDialog } from "@/components/blocks/member-levels-info-dialog";
import { MemberProfileCardDialog } from "@/components/blocks/member-profile-card-dialog";
import { ReadingStreakBadge } from "@/components/blocks/reading-streak-badge";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { UserPanel } from "@/components/blocks/user-panel";
import { UserStatusBadge } from "@/components/blocks/user-status-badge";

type MemberProfileHeaderProps = {
	user: GetUserByUsernameOutput;
	favoritesHighlight?: React.ReactNode;
	recentReadsHighlight?: React.ReactNode;
};

function ProfileGridCell({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-0 flex-col bg-background p-4 sm:p-5">
			{children}
		</div>
	);
}

export function MemberProfileHeader({
	user,
	favoritesHighlight,
	recentReadsHighlight,
}: MemberProfileHeaderProps) {
	return (
		<header className="flex flex-col gap-6">
			<Link
				href={"/leaderboard/overview" as Route}
				className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
			>
				<span aria-hidden className="text-base leading-none">
					←
				</span>
				Leaderboard
			</Link>

			<div className="flex flex-col gap-5 border border-border bg-muted/10 p-4 sm:p-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<UserPanel
						user={user}
						className="min-w-0 items-start gap-3"
						imageClassName="size-[4.5rem] text-lg"
						titleClassName="text-xl sm:text-2xl"
						descriptionClassName="text-sm"
						renderTitle={(member) => (
							<span className="flex min-w-0 items-center gap-2 font-medium tracking-tight">
								<span className="truncate">{member.name}</span>
								{user.isAdmin ? (
									<Crown
										className="size-5 shrink-0 text-amber-600 dark:text-amber-400"
										aria-label="Administrator"
									/>
								) : null}
							</span>
						)}
					/>
					<div className="flex flex-col gap-2 sm:items-end">
						<ReadingStreakBadge streak={user.readingStreak} />
						<div className="flex flex-wrap items-center gap-2 sm:justify-end">
							<UserStatusBadge status={user.status} />
							<ResourceShareMenu
								path={`/users/${user.username}`}
								shareText={user.name}
								label="Share member profile"
								shareInPost={{ kind: "user", username: user.username }}
								size="md"
							/>
							<MemberProfileCardDialog user={user} />
							<Button
								variant="outline"
								size="sm"
								nativeButton={false}
								render={
									<Link href={`/users/${user.username}/stats` as Route} />
								}
							>
								Stats
							</Button>
						</div>
					</div>
				</div>

				<section
					className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2"
					aria-labelledby="member-profile-grid-heading"
				>
					<h2 id="member-profile-grid-heading" className="sr-only">
						Member stats and library highlights
					</h2>
					<ProfileGridCell>
						<div className="flex items-center gap-1">
							<p className="text-muted-foreground text-sm">Experience points</p>
							<MemberLevelsInfoDialog kind="xp" currentPoints={user.xp} />
						</div>
						<p className="font-medium text-3xl tabular-nums tracking-tight">
							{user.xp}
						</p>
						<p className="text-muted-foreground text-sm">
							{user.xpLevel.label}
						</p>
						<Button
							variant="outline"
							size="sm"
							className="mt-2 w-fit"
							nativeButton={false}
							render={<Link href={`/users/${user.username}/xp` as Route} />}
						>
							XP history
						</Button>
					</ProfileGridCell>
					<ProfileGridCell>
						<div className="flex items-center gap-1">
							<p className="text-muted-foreground text-sm">Reading points</p>
							<MemberLevelsInfoDialog kind="rp" currentPoints={user.rp} />
						</div>
						<p className="font-medium text-3xl tabular-nums tracking-tight">
							{user.rp}
						</p>
						<p className="text-muted-foreground text-sm">
							{user.rpLevel.label}
						</p>
						<Button
							variant="outline"
							size="sm"
							className="mt-2 w-fit"
							nativeButton={false}
							render={<Link href={`/users/${user.username}/rp` as Route} />}
						>
							RP history
						</Button>
					</ProfileGridCell>
					<ProfileGridCell>{favoritesHighlight}</ProfileGridCell>
					<ProfileGridCell>{recentReadsHighlight}</ProfileGridCell>
				</section>
			</div>
		</header>
	);
}
