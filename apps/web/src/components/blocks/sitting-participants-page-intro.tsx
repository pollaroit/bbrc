import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { progressIndicatorClassName } from "@/components/blocks/sitting-participation-progress";
import { cn } from "@/lib/utils";

const readingProgressStats = [
	{ key: "not_started" as const, label: "Not started" },
	{ key: "in_progress" as const, label: "Reading" },
	{ key: "completed" as const, label: "Finished the book" },
	{ key: "dnf" as const, label: "Did not finish" },
] as const;

type SittingParticipantsPageIntroProps = {
	sitting: GetSittingBySlugOutput;
};

export function SittingParticipantsPageIntro({
	sitting,
}: SittingParticipantsPageIntroProps) {
	const active = sitting.participants;
	const progressCounts = {
		not_started: active.filter((p) => p.progress === "not_started").length,
		in_progress: active.filter((p) => p.progress === "in_progress").length,
		completed: active.filter((p) => p.progress === "completed").length,
		dnf: active.filter((p) => p.progress === "dnf").length,
	};
	const canMutate = sitting.status === "voting" || sitting.status === "reading";

	return (
		<header className="flex flex-col gap-4 border border-border bg-muted/30 p-4 sm:p-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex flex-col gap-2">
					<h2 className="font-semibold text-xl tracking-tight sm:text-2xl">
						Participants
					</h2>
					<p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
						{canMutate
							? "Club members on this sitting. Admins can add or remove people while voting or reading is open."
							: "Final roster and reading outcomes for this sitting."}
					</p>
				</div>
				<Badge variant="outline">{active.length} active</Badge>
			</div>

			{sitting.status === "reading" || sitting.status === "finished" ? (
				<div className="flex flex-col gap-2">
					<p className="font-medium text-sm">Reading progress</p>
					<dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						{readingProgressStats.map(({ key, label }) => (
							<div
								key={key}
								className="grid grid-cols-[0.5rem_minmax(0,1fr)] gap-x-1.5 gap-y-1 bg-background/80 px-3 py-2"
							>
								<span
									className={cn(
										"size-2 shrink-0 self-center",
										progressIndicatorClassName[key],
									)}
									aria-hidden
								/>
								<dt className="text-muted-foreground text-xs leading-snug">
									{label}
								</dt>
								<dd className="col-start-2 font-medium text-sm tabular-nums">
									{progressCounts[key]}
								</dd>
							</div>
						))}
					</dl>
				</div>
			) : (
				<dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
					<div className="border border-border/60 bg-background/80 px-3 py-2">
						<dt className="text-muted-foreground text-xs">Active members</dt>
						<dd className="font-medium text-sm tabular-nums">
							{active.length}
						</dd>
					</div>
					<div className="border border-border/60 bg-background/80 px-3 py-2">
						<dt className="text-muted-foreground text-xs">Phase</dt>
						<dd className="font-medium text-sm capitalize">{sitting.status}</dd>
					</div>
					{sitting.status === "voting" ? (
						<div className="col-span-2 border border-border/60 bg-background/80 px-3 py-2 sm:col-span-3">
							<dt className="text-muted-foreground text-xs">Poll chip ranks</dt>
							<dd className="mt-0.5 text-sm leading-snug">
								Rank 1 (highest RP at voting start) gets Golden and Silver
								chips; rank 2 gets Silver only. RP and rank are shown on each
								card.
							</dd>
						</div>
					) : null}
					{sitting.removedParticipants.length > 0 ? (
						<div className="border border-border/60 bg-background/80 px-3 py-2">
							<dt className="text-muted-foreground text-xs">Removed</dt>
							<dd className="font-medium text-sm tabular-nums">
								{sitting.removedParticipants.length}
							</dd>
						</div>
					) : null}
				</dl>
			)}
		</header>
	);
}
