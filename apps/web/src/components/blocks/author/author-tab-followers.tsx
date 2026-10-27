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
import { useTranslations } from "next-intl";
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
import { useFormatters } from "@/lib/i18n/use-formatters";
import { orpc } from "@/utils/orpc";

const LIMIT = 24;

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
	const f = useFormatters();
	const t = useTranslations("authors");
	const sortLabels = Object.fromEntries(
		AuthorFollowerSortFields.map((field) => [
			field,
			t(`followersTab.sort.${field}`),
		]),
	) as Record<(typeof AuthorFollowerSortFields)[number], string>;
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
					placeholder={t("followersTab.search")}
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
						sortByLabels={sortLabels}
						appearance="library"
					/>
					<ListingFiltersSheet
						title={t("followersTab.filtersTitle")}
						description={t("followersTab.filtersDescription", {
							name: authorName,
						})}
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
							legend={t("followersTab.activity")}
							options={[
								{
									id: "followers-read-author",
									label: t("followersTab.hasRead", { name: authorName }),
									checked: filters.readAuthor === true,
									onCheckedChange: (checked) => {
										void setFilters({ readAuthor: checked ? true : null });
									},
								},
								{
									id: "followers-reviewed-author",
									label: t("followersTab.hasReviewed", { name: authorName }),
									checked: filters.reviewedAuthor === true,
									onCheckedChange: (checked) => {
										void setFilters({ reviewedAuthor: checked ? true : null });
									},
								},
							]}
						/>
						<ListingCheckboxList
							legend={t("followersTab.profile")}
							options={[
								{
									id: "followers-has-bio",
									label: t("followersTab.hasBio"),
									checked: filters.hasBio === true,
									onCheckedChange: (checked) => {
										void setFilters({ hasBio: checked ? true : null });
									},
								},
								{
									id: "followers-has-avatar",
									label: t("followersTab.hasPhoto"),
									checked: filters.hasAvatar === true,
									onCheckedChange: (checked) => {
										void setFilters({ hasAvatar: checked ? true : null });
									},
								},
							]}
						/>
						<FieldSet className="gap-3">
							<FieldLegend>{t("followersTab.location")}</FieldLegend>
							<Field>
								<Label htmlFor="followers-location">
									{t("followersTab.livesIn")}
								</Label>
								<Input
									id="followers-location"
									placeholder={t("followersTab.anyPlace")}
									value={filters.location ?? ""}
									onChange={(event) => {
										void setFilters({ location: event.target.value || null });
									}}
								/>
							</Field>
						</FieldSet>
						<FieldSet className="gap-3">
							<FieldLegend>{t("followersTab.followedBetween")}</FieldLegend>
							<FieldGroup className="grid grid-cols-2 gap-3">
								<Field>
									<Label htmlFor="followers-from">
										{t("followersTab.from")}
									</Label>
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
									<Label htmlFor="followers-to">{t("followersTab.to")}</Label>
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
								? t("followersTab.noMatch")
								: t("followersTab.none", { name: authorName })
						}
						linkLabel={
							narrowed
								? t("followersTab.backToOverview")
								: t("followersTab.followFromOverview")
						}
						href={`/authors/${slug}` as Route}
					/>
				}
				loadingContent={<AuthorTabSkeleton variant="grid" />}
				endMessage={t("list.end")}
			>
				{total != null || followerCount != null ? (
					<p className="border-border border-b pb-2 font-medium text-muted-foreground text-sm tabular-nums">
						{narrowed && total != null
							? t("followersTab.countNarrowed", {
									total: f.number(total),
									all: followerCount ?? total,
								})
							: t("followersTab.count", {
									count: followerCount ?? total ?? 0,
								})}
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
