"use client";

import { contentPlainText } from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Heart, MessageCircle } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { GoalProgressBar } from "@/components/blocks/goal-progress-bar";
import { MemberProfileSittingCard } from "@/components/blocks/member-profile-sitting-card";
import { RelativeTime } from "@/components/blocks/relative-time";
import { ShelfCover } from "@/components/blocks/shelf-cover";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { formatReadFinishedMonthField } from "@/lib/format-read-date";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type MemberProfileOverviewProps = {
	username: string;
};

function Section({
	title,
	href,
	linkLabel = "See all",
	className,
	children,
}: {
	title: string;
	href: Route;
	linkLabel?: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<section className={cn("flex min-w-0 flex-col gap-3", className)}>
			<div className="flex items-baseline justify-between gap-3">
				<h2 className="font-semibold text-base tracking-tight">{title}</h2>
				<Link
					href={href}
					className="text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					{linkLabel}
				</Link>
			</div>
			{children}
		</section>
	);
}

function RowList({ children }: { children: React.ReactNode }) {
	return (
		<ul className="divide-y divide-border border border-border">{children}</ul>
	);
}

function RowSkeleton({ rows }: { rows: number }) {
	return (
		<div className="flex flex-col gap-px border border-border" aria-hidden>
			{Array.from({ length: rows }, (_, i) => (
				<Skeleton key={i} className="h-16 w-full" />
			))}
		</div>
	);
}

function Cover({
	coverId,
	className,
}: {
	coverId: number | null | undefined;
	className?: string;
}) {
	const src = bookCoverUrl(coverId);
	return (
		<span
			className={cn(
				"relative block aspect-2/3 w-10 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10",
				className,
			)}
		>
			{src ? (
				<Image src={src} alt="" fill className="object-cover" sizes="48px" />
			) : null}
		</span>
	);
}

const rowLinkClass =
	"flex items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/40";

function snippet(text: string, max = 160) {
	const plain = contentPlainText(text).replace(/\s+/g, " ").trim();
	return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain;
}

export function MemberProfileOverview({
	username,
}: MemberProfileOverviewProps) {
	const base = `/users/${username}`;

	const sittings = useQuery(
		orpc.user.getUserParticipationList.queryOptions({
			input: { username, limit: 3 },
		}),
	);
	const reads = useQuery(
		orpc.read.listForUser.queryOptions({
			input: {
				username,
				sortBy: "readEndMonth",
				sortDirection: "desc",
				limit: 4,
			},
		}),
	);
	const posts = useQuery(
		orpc.post.getPostList.queryOptions({
			input: {
				authorUsername: username,
				feedSort: "recent",
				feedRange: "all",
				limit: 3,
			},
		}),
	);
	const feedbacks = useQuery(
		orpc.feedback.getUserFeedbackList.queryOptions({
			input: {
				username,
				sortBy: "createdAt",
				sortDirection: "desc",
				limit: 3,
			},
		}),
	);
	const shelves = useQuery(
		orpc.shelf.listByUsername.queryOptions({ input: { username } }),
	);
	const goals = useQuery(
		orpc.goal.listByUsername.queryOptions({ input: { username } }),
	);

	const sittingItems = sittings.data?.items ?? [];
	const readItems = reads.data?.items ?? [];
	const postItems = posts.data?.items ?? [];
	const feedbackItems = feedbacks.data?.items ?? [];
	const shelfItems = (shelves.data?.items ?? [])
		.toSorted((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
		.slice(0, 3);
	const goalItems = (goals.data?.items ?? [])
		.filter((goal) => !goal.isExpired)
		.toSorted((a, b) => b.year - a.year)
		.slice(0, 2);

	const queries = [sittings, reads, posts, feedbacks, shelves, goals];
	const settled = queries.every((query) => !query.isPending);
	const nothingToShow =
		settled &&
		sittingItems.length +
			readItems.length +
			postItems.length +
			feedbackItems.length +
			shelfItems.length +
			goalItems.length ===
			0;

	if (nothingToShow) {
		return (
			<div className="border border-border border-dashed px-6 py-12 text-center">
				<p className="font-medium">Nothing here yet</p>
				<p className="mt-1 text-muted-foreground text-sm">
					Sittings, reads, posts and reviews will show up here as this member
					takes part in the club.
				</p>
			</div>
		);
	}

	/*
	 * Mobile: one column ordered by the `order-*` classes.
	 * Desktop: the two wrappers become columns and `order` is reset.
	 */
	return (
		<div className="flex flex-col gap-8 md:grid md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start md:gap-10">
			<div className="contents md:flex md:flex-col md:gap-8">
				{sittings.isPending ? (
					<Section
						title="Recent sittings"
						href={`${base}/sittings` as Route}
						className="order-1 md:order-none"
					>
						<RowSkeleton rows={2} />
					</Section>
				) : sittingItems.length > 0 ? (
					<Section
						title="Recent sittings"
						href={`${base}/sittings` as Route}
						className="order-1 md:order-none"
					>
						<ul className="flex flex-col gap-3">
							{sittingItems.map((item) => (
								<li key={item.id}>
									<MemberProfileSittingCard item={item} />
								</li>
							))}
						</ul>
					</Section>
				) : null}

				{posts.isPending ? (
					<Section
						title="Latest posts"
						href={`${base}/posts` as Route}
						className="order-3 md:order-none"
					>
						<RowSkeleton rows={2} />
					</Section>
				) : postItems.length > 0 ? (
					<Section
						title="Latest posts"
						href={`${base}/posts` as Route}
						className="order-3 md:order-none"
					>
						<RowList>
							{postItems.map((post) => (
								<li key={post.slug}>
									<Link
										href={`/posts/${post.slug}` as Route}
										className="flex flex-col gap-2 px-3 py-3 transition-colors hover:bg-muted/40"
									>
										<span
											className={cn(
												"line-clamp-3 text-sm leading-relaxed",
												post.isSpoiler && "text-muted-foreground italic",
											)}
										>
											{post.isSpoiler
												? "Spoiler — open to read"
												: snippet(post.content) || "Shared an attachment"}
										</span>
										<span className="flex items-center gap-4 text-muted-foreground text-xs tabular-nums">
											<RelativeTime
												date={post.createdAt}
												className="text-muted-foreground text-xs"
											/>
											<span className="inline-flex items-center gap-1">
												<Heart className="size-3.5" aria-hidden />
												{post.likeCount}
											</span>
											<span className="inline-flex items-center gap-1">
												<MessageCircle className="size-3.5" aria-hidden />
												{post.commentCount}
											</span>
										</span>
									</Link>
								</li>
							))}
						</RowList>
					</Section>
				) : null}

				{feedbacks.isPending ? (
					<Section
						title="Recent reviews"
						href={`${base}/feedbacks` as Route}
						className="order-4 md:order-none"
					>
						<RowSkeleton rows={2} />
					</Section>
				) : feedbackItems.length > 0 ? (
					<Section
						title="Recent reviews"
						href={`${base}/feedbacks` as Route}
						className="order-4 md:order-none"
					>
						<RowList>
							{feedbackItems.map((item) => (
								<li key={item.slug}>
									<Link
										href={
											`/books/${item.book.slug}/feedbacks/${item.slug}` as Route
										}
										className={rowLinkClass}
									>
										<Cover coverId={item.book.coverId} />
										<span className="flex min-w-0 flex-1 flex-col gap-1">
											<span className="flex items-start justify-between gap-2">
												<span className="font-medium text-sm leading-snug">
													{item.book.title}
												</span>
												<Badge variant="secondary" className="shrink-0">
													{item.rating.toFixed(1)} / 5
												</Badge>
											</span>
											<span
												className={cn(
													"line-clamp-2 text-muted-foreground text-sm",
													item.isSpoiler && "italic",
												)}
											>
												{item.isSpoiler
													? "Spoiler — open to read"
													: snippet(item.review, 140) || "Rating only"}
											</span>
											<span className="mt-1 flex items-center gap-4 text-muted-foreground text-xs tabular-nums">
												<span className="inline-flex items-center gap-1">
													<Heart className="size-3.5" aria-hidden />
													{item.likeCount}
												</span>
												<span className="inline-flex items-center gap-1">
													<MessageCircle className="size-3.5" aria-hidden />
													{item.commentCount}
												</span>
											</span>
										</span>
									</Link>
								</li>
							))}
						</RowList>
					</Section>
				) : null}
			</div>

			<div className="contents md:flex md:flex-col md:gap-8">
				{reads.isPending ? (
					<Section
						title="Recently read"
						href={`${base}/reads` as Route}
						className="order-2 md:order-none"
					>
						<RowSkeleton rows={3} />
					</Section>
				) : readItems.length > 0 ? (
					<Section
						title="Recently read"
						href={`${base}/reads` as Route}
						className="order-2 md:order-none"
					>
						<RowList>
							{readItems.map((item) => (
								<li key={item.book.slug}>
									<Link
										href={`/books/${item.book.slug}` as Route}
										className={rowLinkClass}
									>
										<Cover coverId={item.book.coverId} className="w-9" />
										<span className="flex min-w-0 flex-1 flex-col gap-0.5">
											<span className="font-medium text-sm leading-snug">
												{item.book.title}
											</span>
											<span className="truncate text-muted-foreground text-xs">
												{formatBookAuthors(item.book.authors)}
											</span>
										</span>
										{item.readEndYear != null && item.readEndMonth != null ? (
											<span className="shrink-0 text-muted-foreground text-xs">
												{formatReadFinishedMonthField(
													item.readEndYear,
													item.readEndMonth,
												)}
											</span>
										) : null}
									</Link>
								</li>
							))}
						</RowList>
					</Section>
				) : null}

				{shelves.isPending ? (
					<Section
						title="Shelves"
						href={`${base}/shelves` as Route}
						className="order-5 md:order-none"
					>
						<RowSkeleton rows={2} />
					</Section>
				) : shelfItems.length > 0 ? (
					<Section
						title="Shelves"
						href={`${base}/shelves` as Route}
						className="order-5 md:order-none"
					>
						<RowList>
							{shelfItems.map((shelf) => (
								<li key={shelf.id}>
									<Link
										href={
											`/users/${shelf.owner.username}/shelves/${shelf.slug}` as Route
										}
										className={rowLinkClass}
									>
										<ShelfCover
											coverIds={shelf.coverPreviewCoverIds}
											coverImageUrl={shelf.coverImageUrl}
											size="sm"
										/>
										<span className="flex min-w-0 flex-col gap-0.5">
											<span className="font-medium text-sm leading-snug">
												{shelf.title}
											</span>
											<span className="text-muted-foreground text-xs tabular-nums">
												{shelf.role === "collaborator"
													? `Collaborating · by ${shelf.owner.name} · `
													: ""}
												{shelf.bookCount}{" "}
												{shelf.bookCount === 1 ? "book" : "books"} · updated{" "}
												<RelativeTime
													date={shelf.updatedAt}
													className="text-muted-foreground text-xs"
												/>
											</span>
										</span>
									</Link>
								</li>
							))}
						</RowList>
					</Section>
				) : null}

				{goalItems.length > 0 ? (
					<Section
						title="Reading goals"
						href={`${base}/goals` as Route}
						className="order-6 md:order-none"
					>
						<RowList>
							{goalItems.map((goal) => (
								<li key={goal.id}>
									<Link
										href={`${base}/goals/${goal.slug}` as Route}
										className="flex flex-col gap-2 px-3 py-3 transition-colors hover:bg-muted/40"
									>
										<span className="flex items-baseline justify-between gap-2">
											<span className="font-medium text-sm leading-snug">
												{goal.title}
											</span>
											<span className="text-muted-foreground text-xs">
												{goal.year}
											</span>
										</span>
										<GoalProgressBar
											current={goal.current}
											target={goal.target}
											isComplete={goal.isComplete}
										/>
									</Link>
								</li>
							))}
						</RowList>
					</Section>
				) : null}
			</div>
		</div>
	);
}
