"use client";

import type { AuthorCard as AuthorCardData } from "@bbrc/api/modules/author/author.schema";
import type { LucideIcon } from "lucide-react";
import { BookOpen, Star, UserRound, Users } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { FollowAuthorButton } from "@/components/blocks/author/follow-author-button";
import { CountryFlagIcon } from "@/components/blocks/country-dropdown";
import { bookCoverFrameClassName, bookCoverUrl } from "@/lib/book-cover";
import {
	type AuthorSortField,
	authorStatusLabels,
} from "@/lib/listing/authors-listing";
import { cn } from "@/lib/utils";

type AuthorCardProps = {
	author: AuthorCardData;
	/** The list's current sort: a figure that has no room on the card shows in the top strip. */
	sortBy?: AuthorSortField;
	className?: string;
};

type SortMetric = { label: string; value: string };

/** Sorts whose figure is not already in the footer. */
function sortMetricFor(
	author: AuthorCardData,
	sortBy: AuthorSortField | undefined,
): SortMetric | null {
	switch (sortBy) {
		case "reviewCount":
			return { label: "Reviews", value: String(author.reviewCount) };
		case "birthYear":
			return {
				label: "Born",
				value: author.birthYear != null ? String(author.birthYear) : "—",
			};
		default:
			return null;
	}
}

const statusClassName = {
	verified: "bg-success/10 text-success-ink",
	auto: "bg-info/10 text-info-ink",
	needs_review: "bg-warning/10 text-warning-ink",
} as const;

function FooterStat({
	icon: Icon,
	value,
	title,
}: {
	icon: LucideIcon;
	value: number | string;
	title: string;
}) {
	return (
		<span
			className="inline-flex shrink-0 items-center gap-0.5 tabular-nums"
			title={title}
		>
			<Icon className="size-3.5 shrink-0" aria-hidden />
			<span aria-hidden>{value}</span>
			<span className="sr-only">{`${title}: ${value}`}</span>
		</span>
	);
}

function plural(count: number, one: string, many = `${one}s`) {
	return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}

function initialOf(name: string) {
	return name.trim().charAt(0).toUpperCase() || "?";
}

export function AuthorCardPortrait({
	name,
	photoUrl,
	className,
}: {
	name: string;
	photoUrl: string | null;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"relative aspect-3/4 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10",
				className,
			)}
		>
			{photoUrl ? (
				<Image
					src={photoUrl}
					alt=""
					fill
					sizes="72px"
					className="object-cover"
				/>
			) : (
				<span
					className="flex size-full items-center justify-center font-semibold text-2xl text-muted-foreground"
					aria-hidden
				>
					{initialOf(name)}
				</span>
			)}
		</div>
	);
}

export function AuthorCard({ author, sortBy, className }: AuthorCardProps) {
	const href = `/authors/${author.slug}` as Route;
	const metric = sortMetricFor(author, sortBy);
	const [firstNationality] = author.nationalities;
	const extraNationalities = author.nationalities.length - 1;
	const covers = author.coverIds.flatMap((coverId) => {
		const src = bookCoverUrl(coverId, "S");
		return src ? [src] : [];
	});

	return (
		<article
			className={cn(
				"relative flex h-full flex-col overflow-hidden border border-border bg-card transition-colors focus-within:bg-muted/20 hover:bg-muted/20",
				className,
			)}
		>
			<div className="relative z-2 flex items-center justify-between gap-2 border-border border-b bg-muted/10 px-3 py-1.5 text-muted-foreground text-xs">
				{firstNationality ? (
					<span
						className="inline-flex min-w-0 items-center gap-1.5"
						title={author.nationalities.map((n) => n.name).join(", ")}
					>
						<CountryFlagIcon alpha2={firstNationality.code} size="sm" />
						<span className="truncate">{firstNationality.name}</span>
						{extraNationalities > 0 ? (
							<span className="shrink-0 tabular-nums">
								+{extraNationalities}
							</span>
						) : null}
					</span>
				) : (
					<span className="min-w-0 truncate">Nationality unknown</span>
				)}
				{metric ? (
					<span className="shrink-0 tabular-nums">
						<span className="font-normal opacity-80">{metric.label} </span>
						<span className="font-semibold text-foreground">
							{metric.value}
						</span>
					</span>
				) : null}
			</div>

			<div className="relative flex min-h-[8.5rem] flex-1">
				<Link
					href={href}
					aria-label={`View ${author.name}`}
					className="absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
				/>
				<div className="pointer-events-none relative z-1 flex min-w-0 flex-1 gap-3 p-3 sm:gap-4 sm:p-4">
					<AuthorCardPortrait
						name={author.name}
						photoUrl={author.photoUrl}
						className="w-16 sm:w-18"
					/>
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<h2 className="font-semibold text-base leading-snug tracking-tight">
							<span className="line-clamp-2">{author.name}</span>
						</h2>
						{author.lifespan ? (
							<p className="text-muted-foreground text-sm tabular-nums">
								{author.lifespan}
							</p>
						) : null}
						{author.status ? (
							<span
								className={cn(
									"w-fit px-1.5 py-0.5 font-medium text-3xs",
									statusClassName[author.status],
								)}
							>
								{authorStatusLabels[author.status]}
							</span>
						) : null}
						{covers.length > 0 ? (
							<div className="mt-auto flex gap-1 pt-2" aria-hidden>
								{covers.map((src) => (
									<div
										key={src}
										className={cn(
											"relative aspect-2/3 w-7",
											bookCoverFrameClassName,
										)}
									>
										<Image
											src={src}
											alt=""
											fill
											sizes="28px"
											className="object-cover"
										/>
									</div>
								))}
							</div>
						) : (
							<p className="mt-auto inline-flex items-center gap-1 pt-2 text-muted-foreground text-xs">
								<UserRound className="size-3.5" aria-hidden />
								No covers yet
							</p>
						)}
					</div>
				</div>
			</div>

			<div className="relative z-2 flex flex-nowrap items-center justify-between gap-2 border-border border-t bg-muted/10 px-3 py-1.5 text-muted-foreground text-xs tabular-nums">
				<div className="flex min-w-0 items-center gap-3">
					<FooterStat
						icon={BookOpen}
						value={author.bookCount}
						title={plural(author.bookCount, "book")}
					/>
					<FooterStat
						icon={Users}
						value={author.readerCount}
						title={plural(author.readerCount, "reader")}
					/>
					{author.averageRating != null ? (
						<FooterStat
							icon={Star}
							value={author.averageRating.toFixed(1)}
							title="Club average rating"
						/>
					) : null}
				</div>
				<FollowAuthorButton
					slug={author.slug}
					initial={{
						following: author.followedByMe,
						followerCount: author.followerCount,
					}}
					size="sm"
					showCount
				/>
			</div>
		</article>
	);
}
