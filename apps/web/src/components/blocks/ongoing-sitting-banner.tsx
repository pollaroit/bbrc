import type { GetOngoingSittingOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Button } from "@bbrc/ui/components/button";
import { Card, CardContent } from "@bbrc/ui/components/card";
import { ArrowRight, BookOpen } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { SittingParticipantAvatarStack } from "@/components/blocks/sitting-participant-avatar-stack";
import { SittingStatusBadge } from "@/components/blocks/sitting-status-badge";
import { formatBookAuthors } from "@/lib/book-cover";
import { formatDateTime } from "@/lib/format-datetime";

type OngoingSittingBannerProps = {
	sitting: NonNullable<GetOngoingSittingOutput>;
};

export function OngoingSittingBanner({ sitting }: OngoingSittingBannerProps) {
	const href =
		sitting.status === "voting"
			? (`/sittings/${sitting.slug}/vote` as Route)
			: (`/sittings/${sitting.slug}` as Route);
	const phaseDeadline =
		sitting.status === "voting" && sitting.pollDeadline
			? sitting.pollDeadline
			: sitting.status !== "voting"
				? sitting.deadline
				: null;
	const deadlineLabel =
		sitting.status === "voting" ? "Poll closes" : "Reading deadline";

	const bookTitle = sitting.selectedBookTitle?.trim();
	const authorsLabel =
		sitting.selectedBookAuthors.length > 0
			? formatBookAuthors(sitting.selectedBookAuthors)
			: null;

	return (
		<Card className="border-primary/30 bg-primary/5">
			<CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex min-w-0 flex-col gap-3">
					<div className="flex flex-wrap items-center gap-2">
						<p className="font-semibold text-sm">Current sitting</p>
						<SittingStatusBadge status={sitting.status} />
					</div>
					{bookTitle ? (
						<div className="flex flex-col gap-1">
							<p className="font-medium leading-snug">{bookTitle}</p>
							{authorsLabel ? (
								<p className="text-muted-foreground text-sm">{authorsLabel}</p>
							) : null}
						</div>
					) : (
						<p className="font-medium">{sitting.displayName}</p>
					)}
					<dl className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground text-xs">
						{phaseDeadline ? (
							<div>
								<dt className="sr-only">{deadlineLabel}</dt>
								<dd>
									{deadlineLabel}: {formatDateTime(phaseDeadline)}
								</dd>
							</div>
						) : null}
						<div className="flex items-center gap-1.5">
							<BookOpen className="size-3.5 shrink-0" aria-hidden />
							<span>
								{sitting.participantCount}{" "}
								{sitting.participantCount === 1
									? "participant"
									: "participants"}
							</span>
						</div>
					</dl>
					<SittingParticipantAvatarStack
						participants={sitting.participantPreview}
						totalCount={sitting.participantCount}
					/>
				</div>
				<Button render={<Link href={href} />} nativeButton={false} size="sm">
					{sitting.status === "voting" ? "Vote in poll" : "Open sitting"}
					<ArrowRight data-icon="inline-end" />
				</Button>
			</CardContent>
		</Card>
	);
}
