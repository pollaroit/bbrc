import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Card, CardContent } from "@bbrc/ui/components/card";
import type { Route } from "next";
import Link from "next/link";
import { progressLabels } from "@/components/blocks/sitting-participation-progress";
import { UserPanel } from "@/components/blocks/user-panel";
import { UserStatusBadge } from "@/components/blocks/user-status-badge";
import { cn } from "@/lib/utils";

type Participant = GetSittingBySlugOutput["participants"][number];

type SittingParticipantCardProps = {
	participant: Participant;
	sittingStatus: GetSittingBySlugOutput["status"];
};

export function SittingParticipantCard({
	participant,
	sittingStatus,
}: SittingParticipantCardProps) {
	const profileHref = `/users/${participant.username}` as Route;
	const showReadingProgress =
		sittingStatus === "reading" || sittingStatus === "finished";

	return (
		<Link href={profileHref} className="block h-full">
			<Card
				size="sm"
				className="h-full transition-colors hover:bg-muted/40 **:data-[slot=avatar]:after:hidden"
			>
				<CardContent className="flex h-full flex-col gap-3">
					<UserPanel user={participant} className="min-w-0 items-start" />
					<div className="mt-auto flex flex-col gap-1.5">
						<UserStatusBadge status={participant.status} />
						{showReadingProgress ? (
							<p className="text-muted-foreground text-xs">
								{progressLabels[participant.progress]}
							</p>
						) : null}
						{sittingStatus === "finished" && participant.rpChange != null ? (
							<p
								className={cn(
									"font-medium text-xs tabular-nums",
									participant.rpChange >= 0
										? "text-foreground"
										: "text-destructive",
								)}
							>
								{participant.rpChange > 0
									? `+${participant.rpChange}`
									: participant.rpChange}{" "}
								RP
							</p>
						) : null}
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
