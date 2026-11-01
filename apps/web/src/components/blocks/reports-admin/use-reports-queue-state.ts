"use client";

import {
	REPORT_REASONS,
	REPORT_SORT_FIELDS,
	REPORT_TARGETS,
	type ReportReason,
	type ReportSortField,
	type ReportTargetKind,
} from "@bbrc/shared";
import {
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
	useQueryState,
} from "nuqs";

export const REPORT_TABS = ["open", "closed"] as const;
export type ReportTab = (typeof REPORT_TABS)[number];

/** `kind:id`: what the case pane shows. */
export function itemKey(target: string, targetId: string) {
	return `${target}:${targetId}`;
}

/**
 * The queue's whole state lives in the address (`?tab=`, `?sortBy=`,
 * `?sortDirection=`, `?kind=`, `?reason=`, `?page=`, `?item=`), so a reload, the
 * back button and a shared link all keep it. Anything that changes what the
 * list holds sends you back to page 1.
 */
export function useReportsQueueState() {
	const [tab, setTab] = useQueryState(
		"tab",
		parseAsStringLiteral(REPORT_TABS).withDefault("open"),
	);
	const [sortBy, setSortBy] = useQueryState(
		"sortBy",
		parseAsStringLiteral(REPORT_SORT_FIELDS).withDefault("date"),
	);
	const [sortDirection, setSortDirection] = useQueryState(
		"sortDirection",
		parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
	);
	const [kind, setKind] = useQueryState(
		"kind",
		parseAsStringLiteral(REPORT_TARGETS),
	);
	const [reason, setReason] = useQueryState(
		"reason",
		parseAsStringLiteral(REPORT_REASONS),
	);
	const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
	const [item, setItem] = useQueryState("item", parseAsString);

	const replace = { history: "replace" as const };
	const toFirstPage = () => setPage(null, replace);

	return {
		tab,
		sortBy,
		sortDirection,
		kind,
		reason,
		page,
		item,
		setTab: (value: ReportTab) =>
			void Promise.all([setTab(value), toFirstPage(), setItem(null, replace)]),
		setSortBy: (value: ReportSortField | null) =>
			void Promise.all([setSortBy(value), toFirstPage()]),
		setSortDirection: (value: "asc" | "desc" | null) =>
			void Promise.all([setSortDirection(value), toFirstPage()]),
		setKind: (value: ReportTargetKind | null) =>
			void Promise.all([setKind(value), toFirstPage()]),
		setReason: (value: ReportReason | null) =>
			void Promise.all([setReason(value), toFirstPage()]),
		clearFilters: () =>
			void Promise.all([setKind(null), setReason(null), toFirstPage()]),
		setPage: (value: number) => void setPage(value <= 1 ? null : value),
		/** Choosing an item is navigation (the back button closes it on a phone); closing it is not. */
		setItem: (value: string | null) =>
			void setItem(value, value ? undefined : replace),
	};
}

export type ReportsQueueState = ReturnType<typeof useReportsQueueState>;
