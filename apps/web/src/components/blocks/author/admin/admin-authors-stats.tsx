"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { CountryFlagIcon } from "@/components/blocks/country-dropdown";
import { orpc } from "@/utils/orpc";

function useAuthorTotal(filters: {
	includeEmpty?: boolean;
	hasPhoto?: boolean;
	statuses?: ("verified" | "auto" | "needs_review")[];
	genders?: ("female" | "male" | "non_binary" | "other" | "unknown")[];
	minBooks?: number;
}) {
	const query = useQuery(
		orpc.author.list.queryOptions({
			input: { ...filters, limit: 1, sortBy: "name", sortDirection: "asc" },
		}),
	);
	return { value: query.data?.metadata.total, pending: query.isPending };
}

function Bar({
	label,
	value,
	max,
	leading,
}: {
	label: string;
	value: number;
	max: number;
	leading?: React.ReactNode;
}) {
	const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
	return (
		<li className="flex items-center gap-3 text-sm">
			<span className="flex w-40 shrink-0 items-center gap-2 truncate">
				{leading}
				<span className="truncate">{label}</span>
			</span>
			<span className="h-2 min-w-0 flex-1 bg-muted" aria-hidden>
				<span
					className="block h-full bg-primary"
					style={{ width: `${width}%` }}
				/>
			</span>
			<span className="w-10 shrink-0 text-right text-muted-foreground tabular-nums">
				{value}
			</span>
		</li>
	);
}

export function AdminAuthorsStats() {
	const everyone = useAuthorTotal({ includeEmpty: true });
	const withBooks = useAuthorTotal({});
	const withPhoto = useAuthorTotal({ includeEmpty: true, hasPhoto: true });
	const verified = useAuthorTotal({
		includeEmpty: true,
		statuses: ["verified"],
	});
	const auto = useAuthorTotal({ includeEmpty: true, statuses: ["auto"] });
	const review = useAuthorTotal({
		includeEmpty: true,
		statuses: ["needs_review"],
	});
	const female = useAuthorTotal({ genders: ["female"] });
	const male = useAuthorTotal({ genders: ["male"] });
	const otherGender = useAuthorTotal({ genders: ["non_binary", "other"] });
	const unknownGender = useAuthorTotal({ genders: ["unknown"] });
	const facets = useQuery(
		orpc.author.nationalityFacets.queryOptions({ input: {} }),
	);

	const total = everyone.value ?? 0;
	const statusRows = [
		{ label: "Verified", value: verified.value ?? 0 },
		{ label: "Filled in automatically", value: auto.value ?? 0 },
		{ label: "Needs review", value: review.value ?? 0 },
	];
	const coverageRows = [
		{ label: "With books", value: withBooks.value ?? 0 },
		{ label: "With a photo", value: withPhoto.value ?? 0 },
	];
	const genderRows = [
		{ label: "Women", value: female.value ?? 0 },
		{ label: "Men", value: male.value ?? 0 },
		{ label: "Non-binary or other", value: otherGender.value ?? 0 },
		{ label: "Not known", value: unknownGender.value ?? 0 },
	];
	const countries = (facets.data?.countries ?? [])
		.slice()
		.sort((a, b) => b.authorCount - a.authorCount)
		.slice(0, 12);

	if (everyone.pending) {
		return (
			<div className="grid gap-4 lg:grid-cols-2" aria-hidden>
				<Skeleton className="h-48 w-full" />
				<Skeleton className="h-48 w-full" />
				<Skeleton className="h-64 w-full" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	return (
		<div className="grid gap-4 lg:grid-cols-2">
			<Card size="sm">
				<CardHeader>
					<CardTitle>Check status</CardTitle>
					<CardDescription>
						{total.toLocaleString()} authors in all
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ul className="flex flex-col gap-2">
						{statusRows.map((row) => (
							<Bar key={row.label} {...row} max={total} />
						))}
					</ul>
				</CardContent>
			</Card>
			<Card size="sm">
				<CardHeader>
					<CardTitle>Coverage</CardTitle>
					<CardDescription>How complete the records are</CardDescription>
				</CardHeader>
				<CardContent>
					<ul className="flex flex-col gap-2">
						{coverageRows.map((row) => (
							<Bar key={row.label} {...row} max={total} />
						))}
					</ul>
				</CardContent>
			</Card>
			<Card size="sm">
				<CardHeader>
					<CardTitle>Gender</CardTitle>
					<CardDescription>Authors with books in the library</CardDescription>
				</CardHeader>
				<CardContent>
					<ul className="flex flex-col gap-2">
						{genderRows.map((row) => (
							<Bar key={row.label} {...row} max={withBooks.value ?? 0} />
						))}
					</ul>
				</CardContent>
			</Card>
			<Card size="sm">
				<CardHeader>
					<CardTitle>Nationalities</CardTitle>
					<CardDescription>The 12 most common</CardDescription>
				</CardHeader>
				<CardContent>
					{facets.isPending ? (
						<Skeleton className="h-40 w-full" aria-hidden />
					) : countries.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No nationalities yet.
						</p>
					) : (
						<ul className="flex flex-col gap-2">
							{countries.map((country) => (
								<Bar
									key={country.alpha2}
									label={country.name}
									value={country.authorCount}
									max={countries[0]?.authorCount ?? 0}
									leading={
										<CountryFlagIcon alpha2={country.alpha2} size="sm" />
									}
								/>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
