import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Card, CardContent } from "@bbrc/ui/components/card";
import type { Route } from "next";
import Link from "next/link";
import {
	progressCardAccentClassName,
	progressLabels,
} from "@/components/blocks/sitting-participation-progress";
import { UserPanel } from "@/components/blocks/user-panel";
import { UserStatusBadge } from "@/components/blocks/user-status-badge";
import { cn } from "@/lib/utils";

type Participant = GetSittingBySlugOutput["participants"][number];

type SittingParticipantCardProps = {
	participant: Participant;
	sittingStatus: GetSittingBySlugOutput["status"];
	className?: string;
};

export function SittingParticipantCard({
	participant,
	sittingStatus,
	className,
}: SittingParticipantCardProps) {
	const profileHref = `/users/${participant.username}` as Route;
	const showReadingProgress =
		sittingStatus === "reading" || sittingStatus === "finished";

	const progressAccentClass = showReadingProgress
		? progressCardAccentClassName[participant.progress]
		: null;

	return (
		<Link
			href={profileHref}
			className="block h-full"
			aria-label={
				showReadingProgress
					? `${participant.name}, ${progressLabels[participant.progress]}`
					: participant.name
			}
		>
			<Card
				size="sm"
				className={cn(
					"h-full transition-colors hover:bg-muted/40 **:data-[slot=avatar]:after:hidden",
					progressAccentClass,
					className,
				)}
			>
				<CardContent className="flex h-full flex-col gap-3">
					<div className="flex items-start justify-between gap-2">
						<UserPanel
							user={participant}
							className="min-w-0 flex-1 items-start"
						/>
						<UserStatusBadge status={participant.status} className="shrink-0" />
					</div>
					<div className="mt-auto flex flex-col gap-1.5">
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
