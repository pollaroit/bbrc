"use client";

import type { AdminDocumentOverviewOutput } from "@bbrc/api/modules/admin/admin-document.schema";
import { documentLanguageLabel } from "@bbrc/shared";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Route } from "next";
import Link from "next/link";
import { adminDocumentStatusLabels } from "@/lib/listing/admin-documents-listing";

type DocumentRankingItem =
	AdminDocumentOverviewOutput["rankings"]["oldestPending"][number];

function formatDocumentMetric(
	item: DocumentRankingItem,
	metricLabel: string,
	formatAsDate?: boolean,
) {
	if (formatAsDate && item.metric > 1_000_000_000_000) {
		const date = new Intl.DateTimeFormat(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
		}).format(new Date(item.metric));
		return `${metricLabel}: ${date}`;
	}

	return `${metricLabel}: ${item.metric}`;
}

function DocumentRankingRow({
	item,
	metricLabel,
	secondaryLabel,
	formatAsDate,
}: {
	item: DocumentRankingItem;
	metricLabel: string;
	secondaryLabel?: string;
	formatAsDate?: boolean;
}) {
	return (
		<li className="flex items-start gap-2 border-border border-b py-2 last:border-0">
			<div className="min-w-0 flex-1">
				<p className="line-clamp-2 text-sm">{item.name}</p>
				<p className="text-muted-foreground text-xs">
					<Link
						href={`/books/${item.bookSlug}` as Route}
						className="hover:underline"
					>
						{item.bookTitle}
					</Link>
					{" · "}
					<Link
						href={`/users/${item.submitterUsername}` as Route}
						className="hover:underline"
					>
						@{item.submitterUsername}
					</Link>
				</p>
				<p className="text-muted-foreground text-xs">
					{adminDocumentStatusLabels[item.status]} ·{" "}
					{documentLanguageLabel(item.language)} ·{" "}
					<span className="font-mono">{item.slug}</span>
				</p>
				<p className="text-muted-foreground text-xs tabular-nums">
					{formatDocumentMetric(item, metricLabel, formatAsDate)}
					{item.secondaryMetric != null && secondaryLabel
						? ` · ${secondaryLabel}: ${item.secondaryMetric}`
						: null}
				</p>
			</div>
		</li>
	);
}

function DocumentRankingCard({
	title,
	items,
	metricLabel,
	secondaryLabel,
	formatAsDate,
}: {
	title: string;
	items: DocumentRankingItem[];
	metricLabel: string;
	secondaryLabel?: string;
	formatAsDate?: boolean;
}) {
	return (
		<Card size="sm">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				{items.length === 0 ? (
					<p className="text-muted-foreground text-xs">No data yet.</p>
				) : (
					<ul>
						{items.map((item) => (
							<DocumentRankingRow
								key={`${title}-${item.slug}`}
								item={item}
								metricLabel={metricLabel}
								secondaryLabel={secondaryLabel}
								formatAsDate={formatAsDate}
							/>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

type AdminDocumentRankingListsProps = {
	rankings: AdminDocumentOverviewOutput["rankings"];
};

export function AdminDocumentRankingLists({
	rankings,
}: AdminDocumentRankingListsProps) {
	return (
		<div className="grid gap-4 md:grid-cols-2">
			<DocumentRankingCard
				title="Oldest pending"
				items={rankings.oldestPending}
				metricLabel="Submitted"
				formatAsDate
			/>
			<DocumentRankingCard
				title="Recently submitted"
				items={rankings.recentlySubmitted}
				metricLabel="Submitted"
				formatAsDate
			/>
			<DocumentRankingCard
				title="Most documents by book"
				items={rankings.mostByBook}
				metricLabel="Documents"
			/>
			<DocumentRankingCard
				title="Most documents by submitter"
				items={rankings.mostBySubmitter}
				metricLabel="Documents"
			/>
		</div>
	);
}
