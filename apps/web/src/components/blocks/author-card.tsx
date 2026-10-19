"use client";

import type { AuthorListItem } from "@bbrc/api/modules/author/author.schema";
import { getBookCountryName } from "@bbrc/shared";
import type { LucideIcon } from "lucide-react";
import { BookOpen, MessageSquareText, Star, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { CountryFlagIcon } from "@/components/blocks/country-dropdown";
import { cn } from "@/lib/utils";

type AuthorCardProps = {
	author: AuthorListItem;
	className?: string;
};

function MetaStripStat({
	icon: Icon,
	label,
	title,
}: {
	icon: LucideIcon;
	label: string;
	title: string;
}) {
	return (
		<span
			className="inline-flex shrink-0 items-center gap-0.5 tabular-nums"
			title={title}
		>
			<Icon className="size-3.5 shrink-0" aria-hidden />
			<span>{label}</span>
		</span>
	);
}

export function AuthorCard({ author, className }: AuthorCardProps) {
	const href = `/authors/${author.slug}` as Route;
	const bookTitle = `${author.bookCount} catalog book${author.bookCount === 1 ? "" : "s"}`;
	const readerTitle = `${author.readerCount} club reader${author.readerCount === 1 ? "" : "s"}`;
	const reviewTitle = `${author.reviewCount} club review${author.reviewCount === 1 ? "" : "s"}`;
	const countryName = author.countryAlpha2
		? (getBookCountryName(author.countryAlpha2) ?? author.countryAlpha2)
		: null;

	return (
		<Link
			href={href}
			className={cn(
				"group flex cursor-pointer flex-col overflow-hidden border border-border bg-card transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				className,
			)}
			aria-label={`View ${author.name}`}
		>
			<div className="flex flex-col gap-2 p-4">
				<div className="flex flex-col gap-1">
					<h2 className="font-semibold text-base leading-snug tracking-tight">
						{author.name}
					</h2>
					<p className="font-mono text-muted-foreground text-xs">
						{author.slug}
					</p>
				</div>
			</div>

			<div className="mt-auto flex w-full flex-nowrap items-center justify-between gap-1 border-border border-t bg-muted/10 px-3 py-1.5 text-muted-foreground text-xs tabular-nums">
				<MetaStripStat
					icon={BookOpen}
					label={String(author.bookCount)}
					title={bookTitle}
				/>
				<MetaStripStat
					icon={Users}
					label={String(author.readerCount)}
					title={readerTitle}
				/>
				{author.averageRating != null ? (
					<MetaStripStat
						icon={Star}
						label={author.averageRating.toFixed(1)}
						title={`Club average ${author.averageRating.toFixed(1)}`}
					/>
				) : (
					<span className="shrink-0 text-muted-foreground/60">—</span>
				)}
				<MetaStripStat
					icon={MessageSquareText}
					label={String(author.reviewCount)}
					title={reviewTitle}
				/>
				{author.countryAlpha2 && countryName ? (
					<span className="shrink-0" title={countryName}>
						<CountryFlagIcon alpha2={author.countryAlpha2} size="sm" />
					</span>
				) : (
					<span className="shrink-0 text-muted-foreground/60">—</span>
				)}
			</div>
		</Link>
	);
}
