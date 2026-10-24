"use client";

import { Checkbox } from "@bbrc/ui/components/checkbox";
import { TriangleAlert } from "lucide-react";
import { useId } from "react";
import { ClubDateTime } from "@/components/blocks/club-date-time";

/**
 * Joining a sitting that is already being read has a catch: everyone is judged
 * at the deadline. This says so and asks for a tick before the Join button works.
 */
export function SittingReadingRisk({
	deadline,
	checked,
	onCheckedChange,
}: {
	deadline: Date | string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}) {
	const id = useId();

	return (
		<div className="flex flex-col gap-3 border border-warning/50 bg-warning/10 p-3">
			<p className="flex items-start gap-2 text-sm">
				<TriangleAlert
					className="mt-0.5 size-4 shrink-0 text-warning-ink"
					aria-hidden
				/>
				<span>
					Reading ends <ClubDateTime value={deadline} />. If you have not
					finished the book by then, it counts as “did not finish”: you lose
					reading points, and it can lead to a warning and then a ban.
				</span>
			</p>
			<label
				htmlFor={id}
				className="flex cursor-pointer items-start gap-2 text-sm"
			>
				<Checkbox
					id={id}
					className="mt-0.5"
					checked={checked}
					onCheckedChange={(next) => onCheckedChange(next === true)}
				/>
				<span>I understand, and I can finish by the deadline.</span>
			</label>
		</div>
	);
}
