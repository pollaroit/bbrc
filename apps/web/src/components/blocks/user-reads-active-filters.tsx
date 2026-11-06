"use client";

import { getBookCountryName } from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { X } from "lucide-react";
import type {
	UserReadsListingSearchParams,
	useUserReadsListingSearchParams,
} from "@/lib/listing/user-reads-listing";

const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

function monthLabel(value: string | null): string | null {
	const match = value ? /^(\d{4})-(\d{2})$/.exec(value) : null;
	return match ? `${MONTHS[Number(match[2]) - 1]} ${match[1]}` : null;
}

function range(
	from: string | number | null,
	to: string | number | null,
	format: (value: string | number) => string = String,
): string | null {
	if (from == null && to == null) return null;
	if (from != null && to != null) {
		return from === to ? format(from) : `${format(from)} – ${format(to)}`;
	}
	return from != null
		? `from ${format(from)}`
		: `up to ${format(to as string | number)}`;
}

/**
 * The filters that are on, as badges that take themselves off. A click on a stats chart
 * arrives here with its filters set, so this is where you see them and let go of them.
 */
export function UserReadsActiveFilters({
	params,
	setParams,
}: {
	params: UserReadsListingSearchParams;
	setParams: ReturnType<typeof useUserReadsListingSearchParams>[1];
}) {
	const badges: { id: string; label: string; clear: () => void }[] = [];
	const add = (id: string, label: string | null, clear: () => void) => {
		if (label) badges.push({ id, label, clear });
	};

	add(
		"finished",
		range(
			params.finishedFrom,
			params.finishedTo,
			(value) => monthLabel(String(value)) ?? String(value),
		),
		() => void setParams({ finishedFrom: null, finishedTo: null }),
	);
	add(
		"published",
		range(params.minPublishedIn, params.maxPublishedIn),
		() => void setParams({ minPublishedIn: null, maxPublishedIn: null }),
	);
	add(
		"pages",
		range(params.minPages, params.maxPages),
		() => void setParams({ minPages: null, maxPages: null }),
	);
	add(
		"club-rating",
		range(params.minAverageRating, params.maxAverageRating, (value) =>
			Number(value)
				.toFixed(2)
				.replace(/\.?0+$/, ""),
		),
		() => void setParams({ minAverageRating: null, maxAverageRating: null }),
	);
	add(
		"subject",
		params.subjectKey ? `Subject: ${params.subjectKey}` : null,
		() => void setParams({ subjectKey: null }),
	);
	add(
		"series",
		params.series ? `Series: ${params.series}` : null,
		() => void setParams({ series: null }),
	);
	for (const code of params.countries ?? []) {
		add(`country-${code}`, getBookCountryName(code) ?? code, () => {
			const next = (params.countries ?? []).filter((value) => value !== code);
			void setParams({ countries: next.length > 0 ? next : null });
		});
	}
	for (const slug of params.authors ?? []) {
		add(`author-${slug}`, `Author: ${slug}`, () => {
			const next = (params.authors ?? []).filter((value) => value !== slug);
			void setParams({ authors: next.length > 0 ? next : null });
		});
	}

	if (badges.length === 0) return null;
	const labels: Record<string, string> = {
		finished: "Finished",
		published: "Published",
		pages: "Pages",
		"club-rating": "Club rating",
	};

	return (
		<ul
			className="flex flex-wrap items-center gap-1.5"
			aria-label="Active filters"
		>
			{badges.map((badge) => (
				<li key={badge.id}>
					<Badge variant="secondary" className="gap-1.5 pe-1">
						<span>
							{labels[badge.id] ? `${labels[badge.id]}: ` : ""}
							{badge.label}
						</span>
						<button
							type="button"
							onClick={badge.clear}
							aria-label={`Remove filter: ${badge.label}`}
							className="p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
						>
							<X className="size-3" aria-hidden />
						</button>
					</Badge>
				</li>
			))}
		</ul>
	);
}
