"use client";

import type { MemberStatsOverviewOutput } from "@bbrc/api/modules/member-stats/member-stats.schema";
import {
	memberStatsShareFacts,
	statsSharePostContent,
	statsShareText,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import {
	ClipboardCopy,
	Image as ImageIcon,
	Link2,
	Send,
	Share2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useComposePost } from "@/components/blocks/compose-post-provider";
import { saveImageFile, shareImageFile } from "@/lib/story/share-session-image";
import { fetchStatsImage } from "@/lib/story/share-stats-image";
import { useUserStatsSearchParams } from "@/lib/user-stats-search-params";

/**
 * Share a member's stats: for the member, a picture (story or post size, shared or saved,
 * or posted to the club); for everyone, the link and a text summary. The picture is drawn
 * by the server from the same facts as the text, and only its owner can ask for it.
 */
export function StatsShareMenu({
	data,
	username,
	isOwner,
}: {
	data: MemberStatsOverviewOutput;
	username: string;
	isOwner: boolean;
}) {
	const [params] = useUserStatsSearchParams();
	const { openCompose } = useComposePost();
	const [busy, setBusy] = useState(false);

	const query = () => {
		const next = new URLSearchParams();
		next.set("period_type", params.period_type);
		if (params.period) next.set("period", params.period);
		if (params.period_start) next.set("period_start", params.period_start);
		if (params.period_end) next.set("period_end", params.period_end);
		return next;
	};
	const link = () =>
		`${window.location.origin}/users/${username}/stats?${query().toString()}`;
	const facts = () =>
		memberStatsShareFacts({
			title: data.title,
			periodLabel: data.periodLabel,
			member: { name: data.member.name, username },
			scoreboard: data.scoreboard,
			books: data.booksRead.books,
			rank: data.rank,
			topAuthor: null,
		});
	const summary = () => statsShareText(facts(), link());

	async function run(action: () => Promise<void>) {
		if (busy) return;
		setBusy(true);
		try {
			await action();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Could not share.");
		} finally {
			setBusy(false);
		}
	}

	const copy = (text: string, done: string) =>
		run(async () => {
			await navigator.clipboard.writeText(text);
			toast.success(done);
		});

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={<Button variant="outline" size="sm" disabled={busy} />}
			>
				<Share2 data-icon="inline-start" aria-hidden />
				Share
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-56">
				{isOwner ? (
					<>
						<DropdownMenuItem
							onClick={() =>
								void run(async () => {
									const file = await fetchStatsImage(
										username,
										"story",
										query(),
									);
									const outcome = await shareImageFile(file, data.title);
									if (outcome === "saved") toast.success("Picture saved.");
								})
							}
						>
							<ImageIcon aria-hidden />
							Share picture (story)
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() =>
								void run(async () => {
									const file = await fetchStatsImage(username, "post", query());
									const outcome = await shareImageFile(file, data.title);
									if (outcome === "saved") toast.success("Picture saved.");
								})
							}
						>
							<ImageIcon aria-hidden />
							Share picture (post)
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() =>
								void run(async () => {
									saveImageFile(
										await fetchStatsImage(username, "story", query()),
									);
								})
							}
						>
							<ImageIcon aria-hidden />
							Save picture
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() =>
								void run(async () => {
									const file = await fetchStatsImage(username, "post", query());
									openCompose(
										null,
										statsSharePostContent(facts(), link()),
										file,
									);
								})
							}
						>
							<Send aria-hidden />
							Post to the club
						</DropdownMenuItem>
						<DropdownMenuSeparator />
					</>
				) : null}
				<DropdownMenuItem onClick={() => void copy(link(), "Link copied.")}>
					<Link2 aria-hidden />
					Copy link
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => void copy(summary(), "Summary copied.")}
				>
					<ClipboardCopy aria-hidden />
					Copy summary
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
