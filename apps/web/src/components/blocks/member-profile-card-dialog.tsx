"use client";

import type {
	GetUserByUsernameOutput,
	GetUserProfileCardOutput,
} from "@bbrc/api/modules/user/user.schema";
import { Button } from "@bbrc/ui/components/button";
import { Dialog, DialogContent, DialogTitle } from "@bbrc/ui/components/dialog";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import { useQuery } from "@tanstack/react-query";
import { Crown, IdCard } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { UserPanel } from "@/components/blocks/user-panel";
import { bookCoverUrl } from "@/lib/book-cover";
import { formatDateTime } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type MemberProfileCardDialogProps = {
	user: GetUserByUsernameOutput;
};

const coverClassName =
	"relative block aspect-2/3 w-[3.75rem] overflow-hidden bg-muted ring-1 ring-foreground/10 transition-opacity hover:opacity-90 sm:w-[4.25rem]";

function ProfileCardCoverRow({
	books,
	emptyLabel,
	align = "start",
}: {
	books:
		| GetUserProfileCardOutput["favorites"]
		| GetUserProfileCardOutput["recentReads"];
	emptyLabel: string;
	align?: "start" | "end";
}) {
	const alignEnd = align === "end";

	if (books.length === 0) {
		return (
			<p
				className={cn(
					"text-muted-foreground text-sm leading-relaxed",
					alignEnd && "text-right",
				)}
			>
				{emptyLabel}
			</p>
		);
	}

	return (
		<ul
			className={cn(
				"flex flex-wrap gap-2.5",
				alignEnd ? "justify-end" : "justify-start",
			)}
		>
			{books.map((entry) => {
				const book = entry.book;
				const key = "id" in entry ? entry.id : book.slug;
				const href = `/books/${book.slug}` as Route;
				const coverSrc = bookCoverUrl(book.coverId);

				return (
					<li key={key}>
						<Tooltip>
							<TooltipTrigger
								render={
									<Link href={href} className={coverClassName}>
										{coverSrc ? (
											<Image
												src={coverSrc}
												alt=""
												fill
												className="object-cover"
												sizes="68px"
											/>
										) : (
											<span className="flex size-full items-center justify-center px-1 text-center text-[10px] text-muted-foreground">
												No cover
											</span>
										)}
									</Link>
								}
							/>
							<TooltipContent side="bottom">
								<p className="max-w-[14rem] font-medium text-sm">
									{book.title}
								</p>
							</TooltipContent>
						</Tooltip>
					</li>
				);
			})}
		</ul>
	);
}

function ProfileCardSkeleton() {
	return (
		<div className="flex flex-col gap-5" aria-hidden>
			<Skeleton className="h-14 w-full" />
			<div className="grid grid-cols-2 gap-3">
				<Skeleton className="h-20" />
				<Skeleton className="h-20" />
			</div>
			<Skeleton className="h-24 w-full" />
			<Skeleton className="h-28 w-full" />
		</div>
	);
}

function statCell(label: string, value: number) {
	return (
		<div className="flex flex-col gap-0.5 border border-border bg-background p-3">
			<span className="text-muted-foreground text-sm">{label}</span>
			<span className="font-medium text-2xl tabular-nums tracking-tight">
				{value}
			</span>
		</div>
	);
}

function PointsMetric({ label, value }: { label: string; value: number }) {
	return (
		<div className="flex min-w-0 flex-col gap-1 bg-background px-4 py-3.5 sm:px-5 sm:py-4">
			<span className="text-muted-foreground text-xs leading-none sm:text-sm">
				{label}
			</span>
			<span className="font-medium text-3xl tabular-nums tracking-tight sm:text-4xl">
				{value}
			</span>
		</div>
	);
}

export function MemberProfileCardDialog({
	user,
}: MemberProfileCardDialogProps) {
	const [open, setOpen] = useState(false);

	const { data, isPending, isError, refetch } = useQuery({
		...orpc.user.getUserProfileCard.queryOptions({
			input: { username: user.username },
		}),
		enabled: open,
	});

	const card = data;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="gap-1.5"
				onClick={() => setOpen(true)}
			>
				<IdCard className="size-4" aria-hidden />
				Profile card
			</Button>
			<DialogContent
				showCloseButton={false}
				className="gap-0 overflow-y-auto p-0 sm:max-w-md"
			>
				<DialogTitle className="sr-only">
					Profile card for {user.name}
				</DialogTitle>

				<div className="flex flex-col gap-5 p-4 sm:p-5">
					{isPending ? <ProfileCardSkeleton /> : null}

					{isError ? (
						<div className="flex flex-col gap-3 border border-border bg-muted/15 p-4">
							<p className="text-sm">Could not load this profile card.</p>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="w-fit"
								onClick={() => {
									void refetch();
								}}
							>
								Try again
							</Button>
						</div>
					) : null}

					{card ? (
						<div className="flex flex-col gap-5">
							<UserPanel
								user={card}
								className="min-w-0 items-start gap-2.5"
								imageClassName="size-12 text-base"
								titleClassName="text-base"
								descriptionClassName="text-sm"
								renderTitle={(member) => (
									<span className="flex min-w-0 items-center gap-2 font-medium">
										<span className="truncate">{member.name}</span>
										{card.isAdmin ? (
											<Crown
												className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
												aria-label="Administrator"
											/>
										) : null}
									</span>
								)}
							/>

							<div className="grid grid-cols-2 gap-px border border-border bg-border">
								<PointsMetric label="Experience points" value={card.xp} />
								<PointsMetric label="Reading points" value={card.rp} />
							</div>

							<div className="grid grid-cols-2 gap-3 sm:gap-4">
								<div className="min-w-0">
									<h3 className="mb-2 font-medium text-sm">Favorite books</h3>
									<ProfileCardCoverRow
										books={card.favorites}
										emptyLabel="No favorites yet."
										align="start"
									/>
								</div>
								<div className="min-w-0">
									<h3 className="mb-2 text-right font-medium text-sm">
										Recently read
									</h3>
									<ProfileCardCoverRow
										books={card.recentReads}
										emptyLabel="No reads recorded yet."
										align="end"
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-2">
								{statCell("Reads", card.stats.readsCount)}
								{statCell("Feedbacks", card.stats.feedbacksCount)}
								{statCell("Participations", card.stats.participationsCount)}
								{statCell("Shelves", card.stats.shelvesCount)}
							</div>

							<p className="border-border border-t pt-3 text-center text-muted-foreground text-xs tabular-nums">
								{formatDateTime(card.generatedAt)}
							</p>
						</div>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}
