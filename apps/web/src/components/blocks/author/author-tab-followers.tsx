"use client";

import { AuthorFollowerSortFields } from "@bbrc/api/modules/author/author.schema";
import {
	Field,
	FieldGroup,
	FieldLegend,
	FieldSet,
} from "@bbrc/ui/components/field";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Route } from "next";
import {
	parseAsBoolean,
	parseAsString,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import {
	AuthorTabEmptyContent,
	AuthorTabSkeleton,
} from "@/components/blocks/author/author-tab-shell";
import { PeopleCard } from "@/components/blocks/people-card";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

const LIMIT = 24;

const SORT_LABELS = {
	followedAt: "Followed",
	name: "Name",
	username: "Username",
	joinedAt: "Joined the club",
	reads: "Reads",
	reviews: "Reviews",
	authorReads: "Reads of this author",
} as const;

const params = {
	search: parseAsString,
	sortBy: parseAsStringLiteral(AuthorFollowerSortFields).withDefault(
		"followedAt",
	),
	sortDirection: parseAsStringLiteral(["asc", "desc"] as const).withDefault(
		"desc",
	),
	readAuthor: parseAsBoolean,
	reviewedAuthor: parseAsBoolean,
	hasBio: parseAsBoolean,
	hasAvatar: parseAsBoolean,
	location: parseAsString,
	followedFrom: parseAsString,
	followedTo: parseAsString,
};

export function AuthorTabFollowers({
	slug,
	authorName,
}: {
	slug: string;
	authorName: string;
}) {
	const [filters, setFilters] = useQueryStates(params);
	const { data: session } = authClient.useSession();

	const activeCount =
		(filters.readAuthor ? 1 : 0) +
		(filters.reviewedAuthor ? 1 : 0) +
		(filters.hasBio ? 1 : 0) +
		(filters.hasAvatar ? 1 : 0) +
		(filters.location?.trim() ? 1 : 0) +
		(filters.followedFrom || filters.followedTo ? 1 : 0);
	const narrowed = activeCount > 0 || Boolean(filters.search?.trim());

	const query = useInfiniteQuery(
		orpc.author.followers.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (last) => last.metadata.nextCursor ?? undefined,
			input: (cursor) => ({
				slug,
				limit: LIMIT,
				sortBy: filters.sortBy,
				sortDirection: filters.sortDirection,
				...(filters.search?.trim() ? { search: filters.search.trim() } : {}),
				...(filters.readAuthor ? { readAuthor: true } : {}),
				...(filters.reviewedAuthor ? { reviewedAuthor: true } : {}),
				...(filters.hasBio ? { hasBio: true } : {}),
				...(filters.hasAvatar ? { hasAvatar: true } : {}),
				...(filters.location?.trim()
					? { location: filters.location.trim() }
					: {}),
				...(filters.followedFrom
					? { followedFrom: new Date(filters.followedFrom) }
					: {}),
				...(filters.followedTo
					? { followedTo: new Date(filters.followedTo) }
					: {}),
				...(cursor != null ? { cursor } : {}),
			}),
		}),
	);

	const items = query.data?.pages.flatMap((page) => page.items) ?? [];
	const followerCount = query.data?.pages[0]?.followerCount;
	const total = query.data?.pages[0]?.metadata.total;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
				<ListingSearch
					value={filters.search ?? ""}
					onChange={(search) => {
						void setFilters({ search: search || null });
					}}
					placeholder="Search followers by name or username…"
				/>
				<div className="flex flex-wrap items-center gap-2 lg:shrink-0">
					<ListingSort
						sortBy={filters.sortBy}
						sortDirection={filters.sortDirection}
						onSortByChange={(sortBy) => {
							void setFilters({ sortBy: sortBy ?? "followedAt" });
						}}
						onSortDirectionChange={(sortDirection) => {
							void setFilters({ sortDirection: sortDirection ?? "desc" });
						}}
						sortByOptions={AuthorFollowerSortFields}
						sortByLabels={SORT_LABELS}
						appearance="library"
					/>
					<ListingFiltersSheet
						title="Follower filters"
						description={`Narrow the members who follow ${authorName}.`}
						activeFilterCount={activeCount}
						onClear={() => {
							void setFilters({
								readAuthor: null,
								reviewedAuthor: null,
								hasBio: null,
								hasAvatar: null,
								location: null,
								followedFrom: null,
								followedTo: null,
							});
						}}
						appearance="library"
					>
						<ListingCheckboxList
							legend="Activity"
							options={[
								{
									id: "followers-read-author",
									label: `Has read ${authorName}`,
									checked: filters.readAuthor === true,
									onCheckedChange: (checked) => {
										void setFilters({ readAuthor: checked ? true : null });
									},
								},
								{
									id: "followers-reviewed-author",
									label: `Has reviewed ${authorName}`,
									checked: filters.reviewedAuthor === true,
									onCheckedChange: (checked) => {
										void setFilters({ reviewedAuthor: checked ? true : null });
									},
								},
							]}
						/>
						<ListingCheckboxList
							legend="Profile"
							options={[
								{
									id: "followers-has-bio",
									label: "Has a bio",
									checked: filters.hasBio === true,
									onCheckedChange: (checked) => {
										void setFilters({ hasBio: checked ? true : null });
									},
								},
								{
									id: "followers-has-avatar",
									label: "Has a photo",
									checked: filters.hasAvatar === true,
									onCheckedChange: (checked) => {
										void setFilters({ hasAvatar: checked ? true : null });
									},
								},
							]}
						/>
						<FieldSet className="gap-3">
							<FieldLegend>Location</FieldLegend>
							<Field>
								<Label htmlFor="followers-location">Lives in</Label>
								<Input
									id="followers-location"
									placeholder="Any place"
									value={filters.location ?? ""}
									onChange={(event) => {
										void setFilters({ location: event.target.value || null });
									}}
								/>
							</Field>
						</FieldSet>
						<FieldSet className="gap-3">
							<FieldLegend>Followed between</FieldLegend>
							<FieldGroup className="grid grid-cols-2 gap-3">
								<Field>
									<Label htmlFor="followers-from">From</Label>
									<Input
										id="followers-from"
										type="date"
										value={filters.followedFrom ?? ""}
										onChange={(event) => {
											void setFilters({
												followedFrom: event.target.value || null,
											});
										}}
									/>
								</Field>
								<Field>
									<Label htmlFor="followers-to">To</Label>
									<Input
										id="followers-to"
										type="date"
										value={filters.followedTo ?? ""}
										onChange={(event) => {
											void setFilters({
												followedTo: event.target.value || null,
											});
										}}
									/>
								</Field>
							</FieldGroup>
						</FieldSet>
					</ListingFiltersSheet>
				</div>
			</div>

			<InfiniteScroll
				className="flex flex-col gap-3"
				hasNextPage={query.hasNextPage}
				isFetchingNextPage={query.isFetchingNextPage}
				fetchNextPage={() => {
					void query.fetchNextPage();
				}}
				isPending={query.isPending}
				isError={query.isError}
				error={query.error}
				onRetry={() => {
					void query.refetch();
				}}
				isEmpty={items.length === 0}
				emptyContent={
					<AuthorTabEmptyContent
						authorSlug={slug}
						text={
							narrowed
								? "No follower matches. Try removing a filter."
								: `No one follows ${authorName} yet. Follow from the author page to be the first.`
						}
						linkLabel={
							narrowed ? "Back to the overview" : "Follow from the overview"
						}
						href={`/authors/${slug}` as Route}
					/>
				}
				loadingContent={<AuthorTabSkeleton variant="grid" />}
				endMessage="You have reached the end of the list."
			>
				{total != null || followerCount != null ? (
					<p className="border-border border-b pb-2 font-medium text-muted-foreground text-sm tabular-nums">
						{narrowed && total != null
							? `${total.toLocaleString()} of ${(followerCount ?? total).toLocaleString()} followers`
							: `${(followerCount ?? total ?? 0).toLocaleString()} ${(followerCount ?? total) === 1 ? "follower" : "followers"}`}
					</p>
				) : null}
				<ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{items.map((person) => (
						<li key={person.username} className="min-h-0">
							<PeopleCard
								person={person}
								isViewer={session?.user?.id === person.id}
							/>
						</li>
					))}
				</ul>
			</InfiniteScroll>
		</div>
	);
}
