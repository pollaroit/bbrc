import type { GetUserByUsernameOutput } from "@bbrc/api/modules/user/user.schema";
import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { Separator } from "@bbrc/ui/components/separator";
import { ArrowLeft, Crown } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { UserPanel } from "@/components/blocks/user-panel";
import { UserStatusBadge } from "@/components/blocks/user-status-badge";

type MemberProfileHeaderProps = {
	user: GetUserByUsernameOutput;
};

export function MemberProfileHeader({ user }: MemberProfileHeaderProps) {
	return (
		<div className="flex flex-col gap-8">
			<Link
				href={"/users" as Route}
				className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				All members
			</Link>

			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<UserPanel
					user={user}
					className="min-w-0 items-start gap-3"
					imageClassName="size-16 text-lg"
					titleClassName="text-xl"
					descriptionClassName="text-sm"
					renderTitle={(member) => (
						<span className="flex min-w-0 items-center gap-2 font-medium text-xl">
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
				<div className="flex flex-wrap items-center gap-2">
					<ResourceShareMenu
						path={`/users/${user.username}`}
						shareText={user.name}
						label="Share member profile"
						shareInPost={{ kind: "user", username: user.username }}
						size="md"
					/>
					<UserStatusBadge status={user.status} />
				</div>
			</div>

			<Separator />

			<section aria-labelledby="member-stats-heading">
				<h2 id="member-stats-heading" className="sr-only">
					Member statistics
				</h2>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<Card size="sm" className="flex flex-col">
						<CardHeader>
							<CardTitle>Experience points</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="font-medium text-2xl tabular-nums">{user.xp}</p>
							<p className="text-muted-foreground text-xs">
								XP earned in the club
							</p>
						</CardContent>
						<CardFooter>
							<Button
								variant="outline"
								size="sm"
								nativeButton={false}
								render={<Link href={`/users/${user.username}/xp` as Route} />}
							>
								View details
							</Button>
						</CardFooter>
					</Card>
					<Card size="sm" className="flex flex-col">
						<CardHeader>
							<CardTitle>Reading points</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="font-medium text-2xl tabular-nums">{user.rp}</p>
							<p className="text-muted-foreground text-xs">
								RP from reading activity
							</p>
						</CardContent>
						<CardFooter>
							<Button
								variant="outline"
								size="sm"
								nativeButton={false}
								render={<Link href={`/users/${user.username}/rp` as Route} />}
							>
								View details
							</Button>
						</CardFooter>
					</Card>
				</div>
			</section>
		</div>
	);
}
