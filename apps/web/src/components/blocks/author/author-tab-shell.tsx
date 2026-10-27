"use client";

import { Skeleton } from "@bbrc/ui/components/skeleton";
import type { Route } from "next";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

export const authorTabGridClassName =
	"grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

/** Shown instead of a bare "nothing here": says what is missing and where to go next. */
export function AuthorTabEmptyContent({
	authorSlug,
	text,
	linkLabel,
	href,
}: {
	authorSlug: string;
	text: string;
	linkLabel?: string;
	/** Defaults to the books tab. */
	href?: Route;
}) {
	const t = useTranslations("authors");
	return (
		<div className="flex flex-col items-center gap-2 border border-border border-dashed px-4 py-10 text-center">
			<p className="max-w-md text-sm">{text}</p>
			<Link
				href={href ?? (`/authors/${authorSlug}/books` as Route)}
				className="text-sm underline underline-offset-4 hover:text-foreground"
			>
				{linkLabel ?? t("shell.browseBooks")}
			</Link>
		</div>
	);
}

export type AuthorTabSkeletonVariant = "grid" | "list" | "rows";

/** Same box sizes as the loaded lists, so nothing jumps when the data arrives. */
export function AuthorTabSkeleton({
	variant = "grid",
	count = 6,
}: {
	variant?: AuthorTabSkeletonVariant;
	count?: number;
}) {
	if (variant === "list") {
		return (
			<div className="flex flex-col gap-4" aria-hidden>
				{Array.from({ length: Math.min(count, 3) }, (_, index) => (
					<Skeleton key={index} className="h-48 w-full" />
				))}
			</div>
		);
	}

	if (variant === "rows") {
		return (
			<div className="flex flex-col gap-3" aria-hidden>
				{Array.from({ length: count }, (_, index) => (
					<Skeleton key={index} className="h-24 w-full" />
				))}
			</div>
		);
	}

	return (
		<div className={authorTabGridClassName} aria-hidden>
			{Array.from({ length: count }, (_, index) => (
				<Skeleton key={index} className="h-36 w-full" />
			))}
		</div>
	);
}

type BookLineProps = {
	book: {
		slug: string;
		title: string;
		authors: string[];
		coverId: number | null;
	};
	className?: string;
	/** Hide the author line (the whole page is about one author). */
	hideAuthors?: boolean;
};

/** A small cover with the title, used wherever a row points at one of the author's books. */
export function AuthorTabBookLine({
	book,
	className,
	hideAuthors = false,
}: BookLineProps) {
	const href = `/books/${book.slug}` as Route;
	const coverSrc = bookCoverUrl(book.coverId, "S");

	return (
		<div className={cn("flex min-w-0 items-center gap-3", className)}>
			<Link
				href={href}
				tabIndex={-1}
				aria-hidden
				className="relative block aspect-2/3 w-9 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10"
			>
				{coverSrc ? (
					<Image
						src={coverSrc}
						alt=""
						fill
						className="object-cover"
						sizes="36px"
					/>
				) : null}
			</Link>
			<div className="min-w-0">
				<Link
					href={href}
					className="line-clamp-2 font-medium text-sm leading-snug hover:underline"
				>
					{book.title}
				</Link>
				{hideAuthors ? null : (
					<p className="truncate text-muted-foreground text-xs">
						{formatBookAuthors(book.authors)}
					</p>
				)}
			</div>
		</div>
	);
}

/** Heading + count line above a list, for tabs that want one. */
export function AuthorTabHeading({
	title,
	children,
}: {
	title: string;
	children?: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1">
			<h2 className="font-semibold text-lg">{title}</h2>
			{children ? (
				<p className="text-muted-foreground text-sm tabular-nums">{children}</p>
			) : null}
		</div>
	);
}
