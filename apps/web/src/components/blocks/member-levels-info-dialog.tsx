"use client";

import {
	isSameLevelTier,
	type LevelTier,
	RP_LEVEL_TIERS,
	resolveRpLevel,
	resolveXpLevel,
	XP_LEVEL_TIERS,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Info } from "lucide-react";
import { useMemo, useState } from "react";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { cn } from "@/lib/utils";

type MemberLevelsKind = "xp" | "rp";

const CONFIG: Record<
	MemberLevelsKind,
	{
		title: string;
		description: string;
		pointsLabel: string;
		tiers: readonly LevelTier[];
		resolve: (points: number) => LevelTier;
	}
> = {
	xp: {
		title: "Experience point levels",
		description:
			"XP rewards club activity — joining sittings, voting, posts, comments, feedback, and more. Totals only go up.",
		pointsLabel: "XP",
		tiers: XP_LEVEL_TIERS,
		resolve: resolveXpLevel,
	},
	rp: {
		title: "Reading point levels",
		description:
			"RP reflects reading performance on finished sittings. You earn or lose RP when a sitting ends, based on progress and book length.",
		pointsLabel: "RP",
		tiers: RP_LEVEL_TIERS,
		resolve: resolveRpLevel,
	},
};

type MemberLevelsInfoDialogProps = {
	kind: MemberLevelsKind;
	/** Highlight the member’s current band when set. */
	currentPoints?: number;
	triggerClassName?: string;
};

function LevelsTable({
	tiers,
	currentTier,
}: {
	tiers: readonly LevelTier[];
	currentTier: LevelTier | null;
}) {
	return (
		<div className="max-h-[min(24rem,60vh)] overflow-y-auto border border-border">
			<table className="w-full border-collapse text-sm">
				<thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
					<tr className="border-border border-b text-left">
						<th scope="col" className="px-3 py-2 font-medium">
							Points
						</th>
						<th scope="col" className="px-3 py-2 font-medium">
							Level
						</th>
					</tr>
				</thead>
				<tbody>
					{tiers.map((tier) => {
						const isCurrent =
							currentTier != null && isSameLevelTier(tier, currentTier);

						return (
							<tr
								key={`${tier.minInclusive}-${tier.label}`}
								className={cn(
									"border-border border-b last:border-b-0",
									isCurrent && "bg-primary/10",
								)}
							>
								<td className="px-3 py-2 text-muted-foreground tabular-nums">
									{tier.rangeLabel}
								</td>
								<td className="px-3 py-2 font-medium">{tier.label}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

export function MemberLevelsInfoDialog({
	kind,
	currentPoints,
	triggerClassName,
}: MemberLevelsInfoDialogProps) {
	const f = useFormatters();
	const [open, setOpen] = useState(false);
	const config = CONFIG[kind];

	const currentTier = useMemo(() => {
		if (currentPoints == null) {
			return null;
		}
		return config.resolve(currentPoints);
	}, [config, currentPoints]);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				className={cn("shrink-0 text-muted-foreground", triggerClassName)}
				aria-label={`About ${config.pointsLabel} levels`}
				onClick={() => setOpen(true)}
			>
				<Info className="size-4" aria-hidden />
			</Button>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{config.title}</DialogTitle>
					<DialogDescription>{config.description}</DialogDescription>
				</DialogHeader>
				<LevelsTable tiers={config.tiers} currentTier={currentTier} />
				{currentTier != null && currentPoints != null ? (
					<p className="text-muted-foreground text-xs">
						Your total:{" "}
						<span className="font-medium text-foreground tabular-nums">
							{f.number(currentPoints)} {config.pointsLabel}
						</span>{" "}
						({currentTier.label})
					</p>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
