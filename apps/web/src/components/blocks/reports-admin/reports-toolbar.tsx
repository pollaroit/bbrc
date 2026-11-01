"use client";

import {
	REPORT_REASON_LABELS,
	REPORT_REASONS,
	REPORT_SORT_FIELD_LABELS,
	REPORT_SORT_FIELDS,
	REPORT_TARGET_LABELS,
	REPORT_TARGETS,
	type ReportReason,
	type ReportTargetKind,
} from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import {
	Field,
	FieldContent,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@bbrc/ui/components/field";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bbrc/ui/components/popover";
import { RadioGroup, RadioGroupItem } from "@bbrc/ui/components/radio-group";
import { ListFilter, X } from "lucide-react";
import { useId } from "react";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { ListingSort } from "@/components/listing/listing-sort";
import type { ReportsQueueState } from "./use-reports-queue-state";

const ANY = "any";

function FilterGroup<T extends string>({
	legend,
	value,
	options,
	labels,
	onChange,
}: {
	legend: string;
	value: T | null;
	options: readonly T[];
	labels: Record<T, string>;
	onChange: (value: T | null) => void;
}) {
	const id = useId();
	return (
		<FieldSet>
			<FieldLegend variant="label">{legend}</FieldLegend>
			<RadioGroup
				value={value ?? ANY}
				onValueChange={(next) => onChange(next === ANY ? null : (next as T))}
				className="grid-cols-1 gap-1"
			>
				{[ANY, ...options].map((option) => (
					<FieldLabel key={option} htmlFor={`${id}-${option}`}>
						<Field orientation="horizontal" className="px-2 py-1.5">
							<FieldContent>
								<FieldTitle className="font-normal">
									{option === ANY ? "Any" : labels[option as T]}
								</FieldTitle>
							</FieldContent>
							<RadioGroupItem id={`${id}-${option}`} value={option} />
						</Field>
					</FieldLabel>
				))}
			</RadioGroup>
		</FieldSet>
	);
}

function ActiveFilter({
	label,
	onRemove,
}: {
	label: string;
	onRemove: () => void;
}) {
	return (
		<Badge variant="secondary" className="gap-1 pr-1">
			{label}
			<Button
				type="button"
				variant="ghost"
				size="icon-xs"
				className="size-4"
				aria-label={`Remove filter: ${label}`}
				onClick={onRemove}
			>
				<X aria-hidden />
			</Button>
		</Badge>
	);
}

export function ReportsToolbar({
	state,
	openTotal,
}: {
	state: ReportsQueueState;
	openTotal: number | undefined;
}) {
	const { kind, reason } = state;
	const activeCount = Number(Boolean(kind)) + Number(Boolean(reason));

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<SegmentedControl
					label="Open or closed"
					value={state.tab}
					onChange={state.setTab}
					options={[
						{ id: "open", label: "Open", count: openTotal },
						{ id: "closed", label: "Closed" },
					]}
				/>
				<div className="flex items-center gap-2">
					<Popover>
						<PopoverTrigger
							render={<Button type="button" variant="outline" size="sm" />}
						>
							<ListFilter data-icon="inline-start" aria-hidden />
							Filter
							{activeCount > 0 ? (
								<Badge className="ml-0.5 px-1.5">{activeCount}</Badge>
							) : null}
						</PopoverTrigger>
						<PopoverContent align="end" className="w-72 gap-4">
							<FilterGroup<ReportTargetKind>
								legend="What was reported"
								value={kind}
								options={REPORT_TARGETS}
								labels={REPORT_TARGET_LABELS}
								onChange={state.setKind}
							/>
							<FilterGroup<ReportReason>
								legend="Reason"
								value={reason}
								options={REPORT_REASONS}
								labels={REPORT_REASON_LABELS}
								onChange={state.setReason}
							/>
						</PopoverContent>
					</Popover>
					<ListingSort
						sortBy={state.sortBy}
						sortDirection={state.sortDirection}
						onSortByChange={state.setSortBy}
						onSortDirectionChange={state.setSortDirection}
						sortByOptions={REPORT_SORT_FIELDS}
						sortByLabels={REPORT_SORT_FIELD_LABELS}
					/>
				</div>
			</div>

			{activeCount > 0 ? (
				<div className="flex flex-wrap items-center gap-2">
					{kind ? (
						<ActiveFilter
							label={REPORT_TARGET_LABELS[kind]}
							onRemove={() => state.setKind(null)}
						/>
					) : null}
					{reason ? (
						<ActiveFilter
							label={REPORT_REASON_LABELS[reason]}
							onRemove={() => state.setReason(null)}
						/>
					) : null}
					<Button
						type="button"
						variant="link"
						size="sm"
						className="h-auto px-1 text-muted-foreground"
						onClick={state.clearFilters}
					>
						Clear filters
					</Button>
				</div>
			) : null}
		</div>
	);
}
