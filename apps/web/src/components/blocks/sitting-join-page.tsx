"use client";

import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpen, Check, Users } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SittingReadingRisk } from "@/components/blocks/sitting-reading-risk";
import { SittingStatusBadge } from "@/components/blocks/sitting-status-badge";
import { Link, useRouter } from "@/i18n/navigation";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { formatDateTime } from "@/lib/format-datetime";
import { orpc, queryClient } from "@/utils/orpc";

/** The open join window in a sentence. */
function windowSentence(preview: {
	window: { open: boolean; closesAt: Date | null; message: string | null };
	sitting: { status: "voting" | "reading" | "finished" };
}): string | null {
	const { window, sitting } = preview;
	if (!window.open) {
		return window.message;
	}
	if (window.closesAt) {
		return `You can join until ${formatDateTime(window.closesAt)}.`;
	}
	return sitting.status === "voting"
		? "You can join while voting is open."
		: "You can join while reading is open.";
}

export function SittingJoinPage({ token }: { token: string }) {
	const router = useRouter();
	const [accepted, setAccepted] = useState(false);
	const opened = useRef(false);

	const query = useQuery({
		...orpc.sitting.join.links.preview.queryOptions({ input: { token } }),
		retry: false,
	});
	const preview = query.data;

	const open = useMutation(orpc.sitting.join.links.open.mutationOptions());

	// One open per visit, counted once per person on the server.
	useEffect(() => {
		if (preview && !opened.current) {
			opened.current = true;
			open.mutate({ token });
		}
	}, [preview, open, token]);

	const alreadyIn = preview?.viewer.isParticipant ?? false;
	const slug = preview?.sitting.slug;
	useEffect(() => {
		if (alreadyIn && slug) {
			router.replace(`/sittings/${slug}` as Route);
		}
	}, [alreadyIn, slug, router]);

	const join = useMutation(
		orpc.sitting.join.links.join.mutationOptions({
			onSuccess: async (result) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: orpc.sitting.join.state.key(),
					}),
					queryClient.invalidateQueries({
						queryKey: orpc.sitting.getSittingList.key(),
					}),
				]);
				toast.success(
					result.alreadyParticipant
						? "You are already in this sitting."
						: "You joined the sitting.",
				);
				router.replace(`/sittings/${result.sittingSlug}` as Route);
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (query.isPending) {
		return <Skeleton className="h-72 w-full max-w-2xl" aria-hidden />;
	}

	if (query.isError || !preview) {
		return (
			<div className="flex max-w-2xl flex-col items-start gap-3 border border-border p-6">
				<p className="font-heading font-semibold text-lg">
					This invitation link does not work.
				</p>
				<p className="text-muted-foreground text-sm">
					It may be mistyped, or the organiser may have deleted it. Ask them for
					a new one.
				</p>
				<Button
					render={<Link href={"/sittings" as Route} />}
					nativeButton={false}
					variant="outline"
					size="sm"
				>
					See all sittings
				</Button>
			</div>
		);
	}

	const { sitting } = preview;
	const cover = bookCoverUrl(sitting.bookCoverId);
	const reading = preview.readingWarning;
	const joinedNow = join.isPending || join.isSuccess;
	const people = sitting.participantCount + (joinedNow ? 1 : 0);
	const sentence = windowSentence(preview);
	const blocked = preview.canJoin ? null : preview.joinBlockedReason;

	if (alreadyIn) {
		return (
			<p className="text-muted-foreground text-sm">
				You are already in this sitting. Taking you there…
			</p>
		);
	}

	return (
		<div className="flex max-w-2xl flex-col gap-6">
			<header className="flex flex-col gap-1">
				<h1 className="font-semibold text-2xl tracking-tight">
					You are invited to a reading sitting
				</h1>
				<p className="text-muted-foreground text-sm">
					{preview.label ? `Invitation: ${preview.label}. ` : ""}Read the same
					book as the club and share your progress.
				</p>
			</header>

			<section className="flex gap-4 border border-border p-4">
				<span className="relative block aspect-2/3 w-20 shrink-0 self-start overflow-hidden bg-muted ring-1 ring-foreground/10">
					{cover ? (
						<Image
							src={cover}
							alt=""
							fill
							className="object-cover"
							sizes="80px"
						/>
					) : (
						<BookOpen
							className="absolute inset-0 m-auto size-6 text-muted-foreground"
							aria-hidden
						/>
					)}
				</span>
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<div className="flex flex-wrap items-center gap-2">
						<h2 className="font-semibold text-lg leading-snug">
							{sitting.bookTitle ?? sitting.displayName}
						</h2>
						<SittingStatusBadge status={sitting.status} />
					</div>
					{sitting.bookTitle ? (
						<p className="text-muted-foreground text-sm">
							{formatBookAuthors(sitting.bookAuthors)}
							{sitting.bookPages ? ` · ${sitting.bookPages} pages` : ""}
						</p>
					) : (
						<p className="text-muted-foreground text-sm">
							The club is choosing the next book.
						</p>
					)}
					<ul className="flex flex-col gap-1 text-sm">
						<li className="flex items-center gap-2">
							<Users className="size-4 text-muted-foreground" aria-hidden />
							<span className="tabular-nums">
								{people} {people === 1 ? "reader is" : "readers are"} in
							</span>
						</li>
						{sitting.status === "voting" && sitting.pollDeadline ? (
							<li className="text-muted-foreground">
								Voting closes {formatDateTime(sitting.pollDeadline)}
							</li>
						) : null}
						{sitting.status === "reading" ? (
							<li className="text-muted-foreground">
								Reading ends {formatDateTime(sitting.deadline)}
							</li>
						) : null}
						{sentence ? (
							<li
								className={
									preview.window.open
										? "text-foreground"
										: "text-muted-foreground"
								}
							>
								{sentence}
							</li>
						) : null}
					</ul>
				</div>
			</section>

			{joinedNow ? (
				<p className="flex items-center gap-2 border border-foreground p-3 font-medium text-sm">
					<Check className="size-4" aria-hidden />
					You are in. Taking you to the sitting…
				</p>
			) : blocked ? (
				<div className="flex flex-col items-start gap-3 border border-border border-dashed p-4">
					<p className="text-sm">{blocked}</p>
					<Button
						render={<Link href={`/sittings/${sitting.slug}` as Route} />}
						nativeButton={false}
						variant="outline"
						size="sm"
					>
						Open the sitting
					</Button>
				</div>
			) : (
				<div className="flex flex-col gap-4">
					{reading ? (
						<SittingReadingRisk
							deadline={sitting.deadline}
							checked={accepted}
							onCheckedChange={setAccepted}
						/>
					) : null}
					<div className="flex flex-wrap items-center gap-2">
						<Button
							disabled={reading && !accepted}
							onClick={() => join.mutate({ token })}
						>
							Join this sitting
						</Button>
						<Button
							variant="ghost"
							render={<Link href={"/sittings" as Route} />}
							nativeButton={false}
						>
							Not now
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
