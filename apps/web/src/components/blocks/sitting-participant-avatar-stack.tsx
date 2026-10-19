"use client";

import type { GetOngoingSittingOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { cn } from "@/lib/utils";

type PreviewUser = NonNullable<
	NonNullable<GetOngoingSittingOutput>["participantPreview"]
>[number];

type SittingParticipantAvatarStackProps = {
	participants: PreviewUser[];
	totalCount: number;
	className?: string;
	maxVisible?: number;
};

export function SittingParticipantAvatarStack({
	participants,
	totalCount,
	className,
	maxVisible = 4,
}: SittingParticipantAvatarStackProps) {
	const visible = participants.slice(0, maxVisible);
	const overflow = totalCount - visible.length;

	if (visible.length === 0) {
		return null;
	}

	return (
		<div className={cn("flex items-center", className)}>
			<div className="flex">
				{visible.map((user, index) => (
					<UserAvatar
						key={user.username}
						user={user}
						className={cn(
							"size-7 ring-2 ring-background",
							index > 0 && "-ms-2",
						)}
					/>
				))}
			</div>
			{overflow > 0 ? (
				<span className="ms-2 text-muted-foreground text-xs tabular-nums">
					+{overflow}
				</span>
			) : null}
		</div>
	);
}
