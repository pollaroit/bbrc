import type { GetSittingListOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Card, CardContent } from "@bbrc/ui/components/card";
import { CalendarDays, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ClubDateTime } from "@/components/blocks/club-date-time";
import { SittingStatusBadge } from "@/components/blocks/sitting-status-badge";
import { cn } from "@/lib/utils";

export type SittingCardSitting = GetSittingListOutput["items"][number];

type SittingCardProps = {
	sitting: SittingCardSitting;
	className?: string;
};

export function SittingCard({ sitting, className }: SittingCardProps) {
	const href = `/sittings/${sitting.slug}` as Route;

	return (
		<Link href={href} className={cn("block h-full", className)}>
			<Card size="sm" className="h-full transition-colors hover:bg-muted/40">
				<CardContent className="flex h-full flex-col gap-3">
					<div className="flex items-start justify-between gap-2">
						<p className="font-medium text-sm leading-snug">
							{sitting.displayName}
						</p>
						<SittingStatusBadge status={sitting.status} />
					</div>

					<dl className="mt-auto flex flex-col gap-2 text-muted-foreground text-xs">
						<div className="flex items-center gap-1.5">
							<CalendarDays className="size-3.5 shrink-0" aria-hidden />
							<div>
								<dt className="sr-only">Deadline</dt>
								<dd>
									<ClubDateTime value={sitting.deadline} />
								</dd>
							</div>
						</div>
						<div className="flex items-center gap-1.5">
							<Users className="size-3.5 shrink-0" aria-hidden />
							<div>
								<dt className="sr-only">Participants</dt>
								<dd>
									{sitting.participantCount}{" "}
									{sitting.participantCount === 1
										? "participant"
										: "participants"}
								</dd>
							</div>
						</div>
					</dl>
				</CardContent>
			</Card>
		</Link>
	);
}
