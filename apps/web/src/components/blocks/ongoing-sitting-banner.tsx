import type { GetOngoingSittingOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Button } from "@bbrc/ui/components/button";
import { Card, CardContent } from "@bbrc/ui/components/card";
import { ArrowRight, BookOpen } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { SittingStatusBadge } from "@/components/blocks/sitting-status-badge";
import { formatDateTime } from "@/lib/format-datetime";

type OngoingSittingBannerProps = {
	sitting: NonNullable<GetOngoingSittingOutput>;
};

export function OngoingSittingBanner({ sitting }: OngoingSittingBannerProps) {
	const href = `/sittings/${sitting.slug}` as Route;
	const phaseDeadline =
		sitting.status === "voting" && sitting.pollDeadline
			? sitting.pollDeadline
			: sitting.status !== "voting"
				? sitting.deadline
				: null;
	const deadlineLabel =
		sitting.status === "voting" ? "Poll closes" : "Reading deadline";

	return (
		<Card className="border-primary/30 bg-primary/5">
			<CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-col gap-2">
					<div className="flex flex-wrap items-center gap-2">
						<p className="font-semibold text-sm">Ongoing sitting</p>
						<SittingStatusBadge status={sitting.status} />
					</div>
					<p className="font-medium">{sitting.slug}</p>
					<dl className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
						<div>
							<dt className="sr-only">Participants</dt>
							<dd>{sitting.participantCount} participants</dd>
						</div>
						{sitting.selectedBookTitle ? (
							<div className="flex items-center gap-1">
								<BookOpen className="size-3.5" aria-hidden />
								<dd>{sitting.selectedBookTitle}</dd>
							</div>
						) : null}
						{phaseDeadline ? (
							<div>
								<dt className="sr-only">{deadlineLabel}</dt>
								<dd>
									{deadlineLabel}: {formatDateTime(phaseDeadline)}
								</dd>
							</div>
						) : null}
					</dl>
				</div>
				<Button render={<Link href={href} />} nativeButton={false} size="sm">
					Open sitting
					<ArrowRight data-icon="inline-end" />
				</Button>
			</CardContent>
		</Card>
	);
}
