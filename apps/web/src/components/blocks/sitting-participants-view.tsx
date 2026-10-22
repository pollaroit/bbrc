"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@bbrc/ui/components/avatar";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import type { Route } from "next";
import Link from "next/link";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useMemo, useState } from "react";
import {
	SittingParticipantsAdminToolbar,
	SittingRemovedParticipantsSection,
	useParticipantRemoveDialog,
} from "@/components/blocks/sitting-participants-admin-panel";
import {
	progressIndicatorClassName,
	progressLabels,
} from "@/components/blocks/sitting-participation-progress";
import { SittingParticipationProgressPickerDialog } from "@/components/blocks/sitting-participation-progress-picker-dialog";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import type { FieldLabels } from "@/lib/listing/labels";
import { sortDirectionParser } from "@/lib/listing/parsers";
import { formatPollChipRankLabel } from "@/lib/poll-chip-rank-label";
import { cn } from "@/lib/utils";

type Sitting = GetSittingBySlugOutput;
type Participant = Sitting["participants"][number];
type Progress = Participant["progress"];

const progressFilters = [
	"completed",
	"in_progress",
	"not_started",
	"dnf",
] as const;

const sortFields = ["progress", "rp", "name"] as const;
const sortLabels = {
	progress: "Progress",
	rp: "Reading points",
	name: "Name",
} as const satisfies FieldLabels<(typeof sortFields)[number]>;

const progressRank: Record<Progress, number> = {
	completed: 0,
	in_progress: 1,
	not_started: 2,
	dnf: 3,
};

const paramParsers = {
	search: parseAsString,
	progress: parseAsStringLiteral(progressFilters),
	sortBy: parseAsStringLiteral(sortFields).withDefault("progress"),
	sortDirection: sortDirectionParser.withDefault("asc"),
};

type RowProps = {
	sitting: Sitting;
	participant: Participant;
	viewerUserId: string;
	isAdmin: boolean;
	canRemove: boolean;
	onRemove: () => void;
	removeDisabledReason?: string;
};

function ParticipantRow({
	sitting,
	participant,
	viewerUserId,
	isAdmin,
	canRemove,
	onRemove,
	removeDisabledReason,
}: RowProps) {
	const [pickerOpen, setPickerOpen] = useState(false);
	const isSelf = participant.userId === viewerUserId;
	const showProgress = sitting.status !== "voting";
	const canEditProgress = isAdmin
		? sitting.status !== "voting"
		: isSelf && sitting.status === "reading";
	const chipLabel =
		sitting.status === "voting"
			? formatPollChipRankLabel(participant.pollChipRank)
			: null;

	const showRemove = isAdmin && canRemove;

	return (
		<li className="flex flex-col">
			<div className="flex items-start gap-4 px-4 py-4">
				<Link
					href={`/users/${participant.username}` as Route}
					className="shrink-0"
					tabIndex={-1}
					aria-hidden
				>
					<Avatar className="size-11">
						<AvatarImage src={participant.image ?? undefined} />
						<AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
					</Avatar>
				</Link>

				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
						<Link
							href={`/users/${participant.username}` as Route}
							className="truncate font-medium hover:underline"
						>
							{participant.name}
						</Link>
						{participant.status !== "active" ? (
							<Badge variant="outline" className="h-5 px-1.5 capitalize">
								{participant.status}
							</Badge>
						) : null}
					</p>
					<p className="text-muted-foreground text-xs tabular-nums">
						@{participant.username} · {participant.rpLevel.label} ·{" "}
						{participant.rp.toLocaleString()} RP
					</p>
					{chipLabel ? (
						<p className="font-medium text-xs">{chipLabel}</p>
					) : null}
					{sitting.status === "finished" && participant.rpChange != null ? (
						<p
							className={cn(
								"font-medium text-xs tabular-nums",
								participant.rpChange < 0 && "text-destructive",
							)}
						>
							{participant.rpChange > 0
								? `+${participant.rpChange}`
								: participant.rpChange}{" "}
							RP from this sitting
						</p>
					) : null}
				</div>

				{showProgress ? (
					<p className="flex shrink-0 items-center gap-1.5 text-xs">
						<span
							className={cn(
								"size-2",
								progressIndicatorClassName[participant.progress],
							)}
							aria-hidden
						/>
						{progressLabels[participant.progress]}
					</p>
				) : null}
			</div>

			{canEditProgress || showRemove ? (
				<div className="flex items-center justify-end gap-2 border-border border-t bg-muted/20 px-4 py-2.5">
					{canEditProgress ? (
						<Button
							type="button"
							variant="outline"
							size="xs"
							onClick={() => setPickerOpen(true)}
						>
							Update progress
						</Button>
					) : null}
					{showRemove ? (
						<Button
							type="button"
							variant="outline"
							size="xs"
							className="text-destructive hover:bg-destructive/10 hover:text-destructive"
							disabled={removeDisabledReason != null}
							title={removeDisabledReason}
							onClick={onRemove}
						>
							Remove
						</Button>
					) : null}
				</div>
			) : null}

			{canEditProgress ? (
				<SittingParticipationProgressPickerDialog
					open={pickerOpen}
					onOpenChange={setPickerOpen}
					sitting={sitting}
					participant={{
						userId: participant.userId,
						name: participant.name,
						progress: participant.progress,
					}}
					mode={isAdmin ? "admin" : "self"}
				/>
			) : null}
		</li>
	);
}

type SittingParticipantsViewProps = {
	sitting: Sitting;
	isAdmin: boolean;
	viewerUserId: string;
};

export function SittingParticipantsView({
	sitting,
	isAdmin,
	viewerUserId,
}: SittingParticipantsViewProps) {
	const [params, setParams] = useQueryStates(paramParsers);
	const { canRemove, requestRemove, removeDialog } =
		useParticipantRemoveDialog(sitting);

	const isVoting = sitting.status === "voting";
	const counts = sitting.stats.progressCounts;
	const query = params.search?.trim().toLowerCase();

	const me = sitting.participants.find(
		(person) => person.userId === viewerUserId,
	);

	const visible = useMemo(() => {
		const sign = params.sortDirection === "asc" ? 1 : -1;
		return sitting.participants
			.filter((person) => {
				// You get your own row at the top, outside the filters.
				if (person.userId === viewerUserId) {
					return false;
				}
				if (params.progress && person.progress !== params.progress) {
					return false;
				}
				if (query) {
					return `${person.name} ${person.username}`
						.toLowerCase()
						.includes(query);
				}
				return true;
			})
			.toSorted((a, b) => {
				switch (params.sortBy) {
					case "rp":
						return sign * (a.rp - b.rp);
					case "name":
						return sign * a.name.localeCompare(b.name);
					default:
						return (
							sign * (progressRank[a.progress] - progressRank[b.progress]) ||
							a.name.localeCompare(b.name)
						);
				}
			});
	}, [
		sitting.participants,
		params.progress,
		params.sortBy,
		params.sortDirection,
		query,
		viewerUserId,
	]);

	const filtered = Boolean(params.progress) || Boolean(query);

	return (
		<div className="flex flex-col gap-5">
			<div className="flex flex-col gap-3 md:flex-row md:items-center">
				<ListingSearch
					value={params.search ?? ""}
					onChange={(search) => {
						void setParams({ search });
					}}
					placeholder="Search readers…"
				/>
				<ListingSort
					sortBy={params.sortBy}
					sortDirection={params.sortDirection}
					onSortByChange={(sortBy) => {
						void setParams({ sortBy });
					}}
					onSortDirectionChange={(sortDirection) => {
						void setParams({ sortDirection });
					}}
					sortByOptions={sortFields}
					sortByLabels={sortLabels}
					appearance="library"
				/>
			</div>

			{!isVoting ? (
				<div className="flex flex-wrap gap-1.5">
					<button
						type="button"
						aria-pressed={!params.progress}
						onClick={() => void setParams({ progress: null })}
						className={cn(
							"border px-2.5 py-1 text-xs tabular-nums transition-colors",
							!params.progress
								? "border-foreground bg-muted/30"
								: "border-border hover:bg-muted/40",
						)}
					>
						All {sitting.stats.participantCount}
					</button>
					{progressFilters.map((key) =>
						counts[key] > 0 ? (
							<button
								key={key}
								type="button"
								aria-pressed={params.progress === key}
								onClick={() =>
									void setParams({
										progress: params.progress === key ? null : key,
									})
								}
								className={cn(
									"inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs tabular-nums transition-colors",
									params.progress === key
										? "border-foreground bg-muted/30"
										: "border-border hover:bg-muted/40",
								)}
							>
								<span
									className={cn("size-2", progressIndicatorClassName[key])}
									aria-hidden
								/>
								{progressLabels[key]} {counts[key]}
							</button>
						) : null,
					)}
				</div>
			) : (
				<p className="border border-border bg-muted/30 px-3 py-2.5 text-muted-foreground text-sm leading-relaxed">
					Readers with the highest reading points when voting started get Golden
					and Silver chips; the next tier gets Silver only. Each row shows the
					tier.
				</p>
			)}

			{isAdmin ? (
				<div className="flex flex-wrap items-center gap-2">
					<SittingParticipantsAdminToolbar sitting={sitting} />
				</div>
			) : null}

			{me ? (
				<ul className="border border-foreground/30 bg-muted/20">
					<ParticipantRow
						sitting={sitting}
						participant={me}
						viewerUserId={viewerUserId}
						isAdmin={isAdmin}
						canRemove={canRemove}
						onRemove={() => requestRemove(me)}
						removeDisabledReason={
							me.progress === "completed"
								? "Members who finished the book stay on the roster"
								: sitting.participants.length <= 1
									? "At least one participant must remain"
									: undefined
						}
					/>
				</ul>
			) : null}

			<p className="text-muted-foreground text-sm tabular-nums">
				{visible.length}{" "}
				{me
					? visible.length === 1
						? "other reader"
						: "other readers"
					: visible.length === 1
						? "reader"
						: "readers"}
				{filtered ? " match your filters" : ""}
			</p>

			{visible.length === 0 ? (
				<div className="border border-border border-dashed px-6 py-10 text-center">
					<p className="font-medium">No readers match</p>
					<p className="mt-1 text-muted-foreground text-sm">
						Try clearing the search or the status filter.
					</p>
				</div>
			) : (
				<ul className="divide-y divide-border border border-border">
					{visible.map((participant) => (
						<ParticipantRow
							key={participant.userId}
							sitting={sitting}
							participant={participant}
							viewerUserId={viewerUserId}
							isAdmin={isAdmin}
							canRemove={canRemove}
							onRemove={() => requestRemove(participant)}
							removeDisabledReason={
								participant.progress === "completed"
									? "Members who finished the book stay on the roster"
									: sitting.participants.length <= 1
										? "At least one participant must remain"
										: undefined
							}
						/>
					))}
				</ul>
			)}

			{isAdmin ? <SittingRemovedParticipantsSection sitting={sitting} /> : null}

			{removeDialog}
		</div>
	);
}
