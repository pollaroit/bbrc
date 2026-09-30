import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { SittingParticipantCard } from "@/components/blocks/sitting-participant-card";
import { cn } from "@/lib/utils";

type Participant = GetSittingBySlugOutput["participants"][number];

type SittingParticipantsSectionProps = {
	status: GetSittingBySlugOutput["status"];
	participants: Participant[];
};

export function SittingParticipantsSection({
	status,
	participants,
}: SittingParticipantsSectionProps) {
	const sectionTitle =
		status === "reading"
			? "Participants"
			: status === "finished"
				? "Participants & outcomes"
				: "Participants";

	return (
		<section className="flex flex-col gap-3">
			<h2 className="font-semibold text-lg">{sectionTitle}</h2>
			<ul
				className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3")}
			>
				{participants.map((participant) => (
					<li key={participant.userId}>
						<SittingParticipantCard
							participant={participant}
							sittingStatus={status}
						/>
					</li>
				))}
			</ul>
		</section>
	);
}
