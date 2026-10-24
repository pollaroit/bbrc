"use client";

import {
	VIEW_KINDS,
	VIEW_RESOURCES,
	VIEW_SOURCE_LABELS,
	VIEW_SOURCES,
} from "@bbrc/shared";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@bbrc/ui/components/avatar";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { Switch } from "@bbrc/ui/components/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@bbrc/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import {
	parseAsBoolean,
	parseAsInteger,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import { useId } from "react";
import {
	ADMIN_TABLE_MOBILE_MIN_WIDTH,
	AdminListTableScroll,
} from "@/components/blocks/admin-list-table-scroll";
import {
	formatNumber,
	RESOURCE_LABELS,
	RESOURCE_SINGULAR,
} from "@/components/blocks/admin-views-parts";
import { clubTimeZone } from "@/lib/club-timezone";
import { orpc } from "@/utils/orpc";

const PAGE_SIZE = 25;
const VIEWERS = ["all", "member", "guest"] as const;
const ALL = "all";

const KIND_LABELS = { detail: "Opened", list: "Seen in a list" } as const;
const VIEWER_LABELS = {
	all: "Members and guests",
	member: "Members",
	guest: "Guests",
} as const;

const whenFormat = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: clubTimeZone,
});

let regionNames: Intl.DisplayNames | null = null;
function countryName(code: string | null) {
	if (!code) return "Unknown";
	try {
		regionNames ??= new Intl.DisplayNames(["en"], { type: "region" });
		return regionNames.of(code) ?? code;
	} catch {
		return code;
	}
}

function FilterSelect({
	label,
	value,
	onChange,
	options,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: readonly { value: string; label: string }[];
}) {
	const current = options.find((option) => option.value === value);
	return (
		<Select value={value} onValueChange={(next) => onChange(next ?? ALL)}>
			<SelectTrigger className="w-full sm:w-48" aria-label={label}>
				<SelectValue>{current?.label ?? label}</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

/** List tab: every counted view, newest first, with filters. */
export function AdminViewsListTable() {
	const ownId = useId();
	const [params, setParams] = useQueryStates(
		{
			page: parseAsInteger.withDefault(1),
			resource: parseAsStringLiteral(VIEW_RESOURCES),
			kind: parseAsStringLiteral(VIEW_KINDS),
			viewer: parseAsStringLiteral(VIEWERS).withDefault("all"),
			source: parseAsStringLiteral(VIEW_SOURCES),
			own: parseAsBoolean.withDefault(false),
		},
		{ history: "replace" },
	);
	const page = Math.max(1, params.page);

	const { data, isPending, isError, error, refetch } = useQuery(
		orpc.view.adminList.queryOptions({
			input: {
				page,
				pageSize: PAGE_SIZE,
				resource: params.resource ?? undefined,
				kind: params.kind ?? undefined,
				viewer: params.viewer,
				source: params.source ?? undefined,
				includeOwn: params.own,
			},
		}),
	);

	const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
	const filtered =
		params.resource != null ||
		params.kind != null ||
		params.viewer !== "all" ||
		params.source != null ||
		params.own;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
				<FilterSelect
					label="Kind of content"
					value={params.resource ?? ALL}
					onChange={(next) =>
						void setParams({
							resource:
								next === ALL ? null : (next as (typeof VIEW_RESOURCES)[number]),
							page: 1,
						})
					}
					options={[
						{ value: ALL, label: "All content" },
						...VIEW_RESOURCES.map((resource) => ({
							value: resource,
							label: RESOURCE_LABELS[resource],
						})),
					]}
				/>
				<FilterSelect
					label="What happened"
					value={params.kind ?? ALL}
					onChange={(next) =>
						void setParams({
							kind: next === ALL ? null : (next as (typeof VIEW_KINDS)[number]),
							page: 1,
						})
					}
					options={[
						{ value: ALL, label: "Opens and list views" },
						...VIEW_KINDS.map((kind) => ({
							value: kind,
							label: KIND_LABELS[kind],
						})),
					]}
				/>
				<FilterSelect
					label="Who"
					value={params.viewer}
					onChange={(next) =>
						void setParams({
							viewer: next as (typeof VIEWERS)[number],
							page: 1,
						})
					}
					options={VIEWERS.map((viewer) => ({
						value: viewer,
						label: VIEWER_LABELS[viewer],
					}))}
				/>
				<FilterSelect
					label="Where from"
					value={params.source ?? ALL}
					onChange={(next) =>
						void setParams({
							source:
								next === ALL ? null : (next as (typeof VIEW_SOURCES)[number]),
							page: 1,
						})
					}
					options={[
						{ value: ALL, label: "Any place" },
						...VIEW_SOURCES.map((source) => ({
							value: source,
							label: VIEW_SOURCE_LABELS[source],
						})),
					]}
				/>
				<div className="flex items-center gap-2 text-sm">
					<Switch
						id={ownId}
						checked={params.own}
						onCheckedChange={(checked) =>
							void setParams({ own: checked, page: 1 })
						}
					/>
					<label htmlFor={ownId}>Include views of own content</label>
				</div>
				{filtered ? (
					<Button
						variant="ghost"
						size="sm"
						onClick={() =>
							void setParams({
								resource: null,
								kind: null,
								viewer: null,
								source: null,
								own: null,
								page: null,
							})
						}
					>
						Clear filters
					</Button>
				) : null}
			</div>

			{isPending ? (
				<Skeleton className="h-120 w-full" />
			) : isError ? (
				<div className="flex flex-col items-start gap-3 border border-dashed p-6">
					<p className="text-sm">{error?.message ?? "Could not load views."}</p>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						Try again
					</Button>
				</div>
			) : data.items.length === 0 ? (
				<div className="border border-dashed p-8 text-center">
					<p className="font-medium text-sm">No views match these filters</p>
					<p className="mt-1 text-muted-foreground text-sm">
						Try clearing a filter. Bots are never recorded, and views of own
						content are hidden unless you include them.
					</p>
				</div>
			) : (
				<AdminListTableScroll>
					<Table className={ADMIN_TABLE_MOBILE_MIN_WIDTH}>
						<TableHeader>
							<TableRow>
								<TableHead>When</TableHead>
								<TableHead>Who</TableHead>
								<TableHead>What</TableHead>
								<TableHead className="hidden md:table-cell">
									Where from
								</TableHead>
								<TableHead className="hidden lg:table-cell">Device</TableHead>
								<TableHead className="hidden lg:table-cell">Country</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.items.map((view) => (
								<TableRow key={view.id}>
									<TableCell className="whitespace-nowrap text-muted-foreground text-xs tabular-nums">
										{whenFormat.format(view.at)}
									</TableCell>
									<TableCell>
										{view.viewer ? (
											<Link
												href={`/users/${view.viewer.username}` as Route}
												className="flex items-center gap-2 hover:underline"
											>
												<Avatar className="size-6">
													{view.viewer.image ? (
														<AvatarImage src={view.viewer.image} alt="" />
													) : null}
													<AvatarFallback>
														{view.viewer.name.slice(0, 1).toUpperCase()}
													</AvatarFallback>
												</Avatar>
												<span className="min-w-0 truncate text-sm">
													{view.viewer.name}
												</span>
											</Link>
										) : (
											<span className="text-muted-foreground text-sm">
												Guest{" "}
												<span className="font-mono text-2xs">
													{view.guestTag}
												</span>
											</span>
										)}
									</TableCell>
									<TableCell className="max-w-72">
										<div className="flex flex-wrap items-center gap-1.5">
											<Badge
												variant={view.kind === "detail" ? "default" : "outline"}
											>
												{KIND_LABELS[view.kind]}
											</Badge>
											{view.isOwner ? (
												<Badge variant="secondary">Own</Badge>
											) : null}
										</div>
										<div className="mt-1 truncate text-sm">
											<span className="me-1.5 text-muted-foreground text-xs">
												{RESOURCE_SINGULAR[view.resource]}
											</span>
											{view.item ? (
												<Link
													href={view.item.href as Route}
													className="hover:underline"
												>
													{view.item.title}
												</Link>
											) : (
												<span className="text-muted-foreground">Removed</span>
											)}
										</div>
									</TableCell>
									<TableCell className="hidden text-sm md:table-cell">
										{VIEW_SOURCE_LABELS[view.source]}
										{view.referrerHost ? (
											<span className="block text-muted-foreground text-xs">
												{view.referrerHost}
											</span>
										) : null}
									</TableCell>
									<TableCell className="hidden text-sm lg:table-cell">
										<span className="capitalize">
											{view.device ?? "Unknown"}
										</span>
										<span className="block text-muted-foreground text-xs">
											{[view.browser, view.os].filter(Boolean).join(" · ") ||
												"Unknown"}
										</span>
									</TableCell>
									<TableCell className="hidden text-sm lg:table-cell">
										{countryName(view.country)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</AdminListTableScroll>
			)}

			{data && data.items.length > 0 ? (
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-muted-foreground text-sm tabular-nums">
						{formatNumber(data.total)} views · Page {page} of {totalPages}
					</p>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={page <= 1}
							onClick={() => void setParams({ page: page - 1 })}
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={page >= totalPages}
							onClick={() => void setParams({ page: page + 1 })}
						>
							Next
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}
