"use client";

import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AuthorPhoto } from "@/components/blocks/author/author-photo";
import { Link } from "@/i18n/navigation";
import { orpc, queryClient } from "@/utils/orpc";

/*
 * What the member follows, grouped by kind. Authors today; when members can follow members
 * add a `people` section to `SECTIONS` (the list from `follow.mine` already carries `type`).
 */

type FollowItem = {
	type: "author";
	id: string;
	followedAt: Date;
	author: {
		slug: string;
		name: string;
		photoUrl: string | null;
		birthYear: number | null;
		deathYear: number | null;
		bookCount: number;
	};
};

const SECTIONS = [{ type: "author" as const }];

function lifespan(author: FollowItem["author"]) {
	if (author.birthYear == null) return null;
	return `${author.birthYear}–${author.deathYear ?? ""}`;
}

export function SettingsFollowing() {
	const t = useTranslations("settings.following");
	const followsQuery = useQuery(orpc.follow.mine.queryOptions());
	const mineKey = orpc.follow.mine.queryKey();

	const toggle = useMutation(
		orpc.follow.toggle.mutationOptions({
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: orpc.follow.key() });
			},
		}),
	);

	function unfollow(item: FollowItem) {
		const previous = queryClient.getQueryData(mineKey);
		queryClient.setQueryData(mineKey, (current: typeof previous) =>
			current
				? {
						...current,
						items: current.items.filter((row) => row.id !== item.id),
					}
				: current,
		);
		toggle.mutate(
			{ target: { type: "author", slug: item.author.slug } },
			{
				onError: (error) => {
					queryClient.setQueryData(mineKey, previous);
					toast.error(error.message ?? t("unfollowFailed"));
				},
				onSuccess: () => {
					toast(t("unfollowed", { name: item.author.name }), {
						action: {
							label: t("undo"),
							onClick: () =>
								toggle.mutate({
									target: { type: "author", slug: item.author.slug },
								}),
						},
					});
				},
			},
		);
	}

	if (followsQuery.isPending) {
		return (
			<div className="flex flex-col gap-2" aria-busy>
				<Skeleton className="h-14 w-full" />
				<Skeleton className="h-14 w-full" />
				<Skeleton className="h-14 w-full" />
			</div>
		);
	}

	if (followsQuery.isError) {
		return (
			<p className="text-destructive text-sm" role="alert">
				{t("loadFailed")}{" "}
				<button
					type="button"
					className="underline underline-offset-4"
					onClick={() => void followsQuery.refetch()}
				>
					{t("tryAgain")}
				</button>
			</p>
		);
	}

	const items = followsQuery.data.items as FollowItem[];

	return (
		<div className="flex flex-col gap-8">
			{SECTIONS.map((section) => {
				const rows = items.filter((item) => item.type === section.type);
				return (
					<section
						key={section.type}
						aria-labelledby={`following-${section.type}`}
						className="flex flex-col gap-3"
					>
						<div>
							<h2
								id={`following-${section.type}`}
								className="font-semibold text-lg tracking-tight"
							>
								{t("authorsTitle")}
								{rows.length > 0 ? (
									<span className="ms-2 font-normal text-muted-foreground text-sm">
										{rows.length}
									</span>
								) : null}
							</h2>
							<p className="text-muted-foreground text-sm">
								{t("authorsDescription")}
							</p>
						</div>

						{rows.length === 0 ? (
							<div className="flex flex-col items-start gap-3 border border-border border-dashed px-4 py-6">
								<p className="text-muted-foreground text-sm">
									{t("authorsEmpty")}
								</p>
								<Button
									variant="outline"
									size="sm"
									render={<Link href={"/authors" as Route} />}
								>
									{t("browseAuthors")}
								</Button>
							</div>
						) : (
							<ul className="divide-y border border-border">
								{rows.map((item) => (
									<li
										key={item.id}
										className="flex items-center gap-3 px-3 py-2.5"
									>
										<AuthorPhoto
											name={item.author.name}
											photoUrl={item.author.photoUrl}
											size="md"
										/>
										<Link
											href={`/authors/${item.author.slug}` as Route}
											className="min-w-0 flex-1 transition-colors hover:text-primary"
										>
											<span className="block truncate font-medium text-sm">
												{item.author.name}
											</span>
											<span className="block truncate text-muted-foreground text-xs">
												{[
													lifespan(item.author),
													t("bookCount", { count: item.author.bookCount }),
												]
													.filter(Boolean)
													.join(" · ")}
											</span>
										</Link>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => unfollow(item)}
											aria-label={t("unfollowLabel", {
												name: item.author.name,
											})}
										>
											{t("unfollow")}
										</Button>
									</li>
								))}
							</ul>
						)}
					</section>
				);
			})}
		</div>
	);
}
