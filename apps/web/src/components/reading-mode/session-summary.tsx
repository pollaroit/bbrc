"use client";

import type { EndReadingSessionOutput } from "@bbrc/api/modules/reading-session/reading-session.schema";
import { formatDuration } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import {
	BookOpen,
	Clock,
	Flame,
	MessageSquarePlus,
	RotateCcw,
	Share2,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { type ComponentType, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { sessionStoryPath } from "@/lib/story/constants";
import {
	fetchSessionImage,
	shareSessionImage,
} from "@/lib/story/share-session-image";
import { cn } from "@/lib/utils";

function Tile({
	icon: Icon,
	label,
	value,
	hint,
}: {
	icon: ComponentType<{ className?: string }>;
	label: string;
	value: string;
	hint?: string;
}) {
	return (
		<div className="flex flex-col gap-1 border border-border bg-card p-3">
			<span className="flex items-center gap-1.5 text-muted-foreground text-xs">
				<Icon className="size-3.5" />
				{label}
			</span>
			<span className="font-heading font-semibold text-2xl tabular-nums leading-none">
				{value}
			</span>
			{hint ? (
				<span className="text-muted-foreground text-xs tabular-nums">
					{hint}
				</span>
			) : null}
		</div>
	);
}

/**
 * The picture of this session the member can share: a preview of it, then two
 * ways to use it. The server draws it, so what you see is what goes out.
 */
function ShareCard({
	sessionId,
	bookTitle,
	onPost,
}: {
	sessionId: string;
	bookTitle: string | null;
	onPost?: (file: File) => void;
}) {
	const [loaded, setLoaded] = useState(false);
	const [failed, setFailed] = useState(false);
	const [busy, setBusy] = useState<"share" | "post" | null>(null);

	async function share() {
		setBusy("share");
		try {
			const outcome = await shareSessionImage(
				sessionId,
				bookTitle ?? "My reading",
			);
			if (outcome === "saved") {
				toast.success("Saved. Add the picture wherever you like.");
			}
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Could not share the picture.",
			);
		} finally {
			setBusy(null);
		}
	}

	async function post() {
		if (!onPost) return;
		setBusy("post");
		try {
			onPost(await fetchSessionImage(sessionId, "post"));
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Could not make the picture.",
			);
		} finally {
			setBusy(null);
		}
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="relative mx-auto aspect-4/5 w-full max-w-[17rem] overflow-hidden border border-border bg-muted">
				{!loaded && !failed ? (
					<Skeleton className="absolute inset-0 size-full" />
				) : null}
				{failed ? (
					<p className="absolute inset-0 flex items-center justify-center p-4 text-center text-muted-foreground text-sm">
						The picture could not be drawn right now.
					</p>
				) : (
					// Not optimised: the browser has to ask the server itself, signed in.
					<Image
						src={sessionStoryPath(sessionId, "post")}
						alt="A picture of this session: the book, how long you read and how far you got"
						fill
						unoptimized
						sizes="272px"
						className="object-cover"
						onLoad={() => setLoaded(true)}
						onError={() => setFailed(true)}
					/>
				)}
			</div>
			<div className={cn("grid gap-2", onPost ? "grid-cols-2" : "grid-cols-1")}>
				<LoadingButton
					type="button"
					className="h-12"
					loading={busy === "share"}
					disabled={failed || busy !== null}
					onClick={() => void share()}
				>
					<Share2 data-icon="inline-start" aria-hidden />
					Share image
				</LoadingButton>
				{onPost ? (
					<LoadingButton
						type="button"
						variant="outline"
						className="h-12"
						loading={busy === "post"}
						disabled={failed || busy !== null}
						onClick={() => void post()}
					>
						<MessageSquarePlus data-icon="inline-start" aria-hidden />
						Post to the club
					</LoadingButton>
				) : null}
			</div>
		</div>
	);
}

/** What the session added up to, and what to do next. */
export function SessionSummary({
	summary,
	seconds,
	notice,
	byPage,
	bookTitle,
	free = false,
	onPost,
	onAgain,
	onDone,
}: {
	summary: EndReadingSessionOutput | null;
	seconds: number;
	notice: string | null;
	byPage: boolean;
	/** The book, or what a session without a book was for. */
	bookTitle: string | null;
	/** A session without a book: time and the pages typed in, no progress, streak or sharing. */
	free?: boolean;
	/** Opens a post with the session picture attached. */
	onPost?: (file: File) => void;
	onAgain: () => void;
	onDone: () => void;
}) {
	const { data: session } = authClient.useSession();
	const username = session?.user.username;
	const pagesGained =
		summary && byPage && summary.pageFrom != null && summary.pageTo != null
			? Math.max(0, summary.pageTo - summary.pageFrom)
			: null;
	const percentGained = summary
		? Math.max(0, summary.percentTo - summary.percentFrom)
		: null;

	return (
		<section
			className="flex w-full max-w-md flex-col gap-5"
			aria-label="Session summary"
		>
			<div className="flex flex-col items-center gap-2 text-center">
				<p className="text-muted-foreground text-sm">
					{free ? "Well done. You focused for" : "Nice reading. You read"}
				</p>
				<p className="font-heading font-semibold text-7xl tabular-nums leading-none tracking-tight">
					{formatDuration(seconds)}
				</p>
				{bookTitle ? (
					<p className="max-w-full truncate text-muted-foreground text-sm">
						{bookTitle}
					</p>
				) : null}
			</div>

			{notice ? (
				<p className="border border-warning/30 bg-warning/10 p-3 text-sm text-warning-ink">
					{notice}
				</p>
			) : null}

			{summary && free ? (
				<div className="grid grid-cols-2 gap-2">
					<Tile icon={Clock} label="Time" value={formatDuration(seconds)} />
					{summary.pageTo != null && summary.pageTo > 0 ? (
						<Tile
							icon={BookOpen}
							label="Pages"
							value={`+${summary.pageTo - (summary.pageFrom ?? 0)}`}
						/>
					) : null}
				</div>
			) : null}

			{summary && !free ? (
				<div className="grid grid-cols-2 gap-2">
					<Tile icon={Clock} label="Time" value={formatDuration(seconds)} />
					<Tile
						icon={BookOpen}
						label={pagesGained != null ? "Pages" : "Progress"}
						value={
							pagesGained != null
								? pagesGained > 0
									? `+${pagesGained}`
									: "0"
								: `${summary.percentTo}%`
						}
						hint={
							pagesGained != null
								? `Now ${summary.percentTo}% through`
								: percentGained
									? `+${percentGained}%`
									: undefined
						}
					/>
					{summary.streakDays > 0 ? (
						<div className="col-span-2">
							<Tile
								icon={Flame}
								label="Reading streak"
								value={`${summary.streakDays} ${summary.streakDays === 1 ? "day" : "days"}`}
								hint={
									summary.streakDays > 1
										? "In a row. Keep it going."
										: undefined
								}
							/>
						</div>
					) : null}
				</div>
			) : null}

			{!free && summary?.id ? (
				<ShareCard
					sessionId={summary.id}
					bookTitle={bookTitle}
					onPost={onPost}
				/>
			) : null}

			<div className="flex flex-col gap-2">
				<Button type="button" className="h-14 text-base" onClick={onDone}>
					Done
				</Button>
				<Button
					type="button"
					variant="outline"
					className="h-12"
					onClick={onAgain}
				>
					<RotateCcw data-icon="inline-start" aria-hidden />
					{free ? "Start again" : "Read again"}
				</Button>
				{/* Sessions without a book are not listed there. */}
				{!free && username ? (
					<Button
						render={<Link href={`/users/${username}/reading` as Route} />}
						nativeButton={false}
						variant="link"
						className="text-muted-foreground"
					>
						All your sessions
					</Button>
				) : null}
			</div>
		</section>
	);
}
