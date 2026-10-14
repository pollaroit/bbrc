import type { Session } from "@bbrc/auth";
import type { Database } from "@bbrc/db";
import type { ProgressSchema } from "@bbrc/schemas";
import type { z } from "zod";
import { getBookListFields } from "../../modules/book/book.schema";
import { activeParticipationWhere } from "../../modules/sitting/participation-active";
import { getUserProfileCard } from "../../modules/user/user.service";
import { escapeTelegramHtml } from "./escape-html";
import { formatReadingDeadlineTelegramLine } from "./format-reading-deadline-line";
import { resolvePublicAppOrigin } from "./public-app-origin";
import { pickRandomClassicalQuote } from "./telegram-classical-quotes";
import {
	buildLinkAccountReply,
	loadLinkedUserByTelegramId,
} from "./telegram-linked-user";

type Progress = z.infer<typeof ProgressSchema>;

function memberProgressLabel(progress: Progress): string {
	switch (progress) {
		case "not_started":
			return "Not started yet";
		case "in_progress":
			return "Currently reading";
		case "completed":
			return "Completed the book";
		case "dnf":
			return "Did not finish";
		default: {
			const label: string = progress;
			return label.replaceAll("_", " ");
		}
	}
}

function formatClubStatus(status: string): string | null {
	switch (status) {
		case "active":
			return null;
		case "warned":
			return "Warned";
		case "banned":
			return "Banned";
		default:
			return status;
	}
}

function telegramAnchor(href: string, label: string): string {
	return `<a href="${href}">${label}</a>`;
}

function formatBookList(titles: string[], emptyLabel: string): string {
	if (titles.length === 0) {
		return emptyLabel;
	}
	return titles.map((title) => `· ${escapeTelegramHtml(title)}`).join("\n");
}

export function buildPingReply(): string {
	return pickRandomClassicalQuote();
}

export async function buildLinkstatusReply(
	db: Database,
	telegramUserId: number,
	telegramHandle?: string,
): Promise<string> {
	const user = await loadLinkedUserByTelegramId(db, telegramUserId);
	if (!user) {
		return [
			"<b>BBRC link</b>",
			"Not linked.",
			"",
			buildLinkAccountReply(),
		].join("\n");
	}

	const profileUrl = `${resolvePublicAppOrigin()}/users/${user.username}`;
	const lines = [
		"<b>BBRC link</b>",
		`Linked as <b>${escapeTelegramHtml(user.name)}</b> (@${escapeTelegramHtml(user.username)})`,
	];

	if (user.telegramUsername) {
		lines.push(
			`Telegram on file: @${escapeTelegramHtml(user.telegramUsername)}`,
		);
	} else if (telegramHandle) {
		lines.push(`Telegram: @${escapeTelegramHtml(telegramHandle)}`);
	}

	lines.push(telegramAnchor(profileUrl, "Open profile"));
	return lines.join("\n");
}

export async function buildMeReply(
	db: Database,
	telegramUserId: number,
): Promise<string> {
	const user = await loadLinkedUserByTelegramId(db, telegramUserId);
	if (!user) {
		return buildLinkAccountReply();
	}

	const session = {
		user: {
			id: user.id,
			isAdmin: user.isAdmin,
		},
	} as Session;

	const card = await getUserProfileCard(
		{ username: user.username },
		db,
		session,
	);

	const profileUrl = `${resolvePublicAppOrigin()}/users/${user.username}`;
	const statusLabel = formatClubStatus(card.status);
	const favoriteTitles = card.favorites.map((row) => row.book.title);
	const recentTitles = card.recentReads.map((row) => row.book.title);

	return [
		"<b>Your BBRC profile</b>",
		`${escapeTelegramHtml(card.name)} (@${escapeTelegramHtml(card.username)})`,
		statusLabel ? `Club status: ${escapeTelegramHtml(statusLabel)}` : null,
		`XP ${card.xp} · RP ${card.rp}`,
		"",
		"<b>Stats</b>",
		`Reads ${card.stats.readsCount} · Feedbacks ${card.stats.feedbacksCount}`,
		`Participations ${card.stats.participationsCount} · Shelves ${card.stats.shelvesCount}`,
		"",
		"<b>Favorite books</b>",
		formatBookList(favoriteTitles, "No favorites yet."),
		"",
		"<b>Recently read</b>",
		formatBookList(recentTitles, "No reads recorded yet."),
		"",
		telegramAnchor(profileUrl, "Open full profile"),
	]
		.filter((line) => line != null)
		.join("\n");
}

async function loadVotingSitting(db: Database) {
	return db.sitting.findFirst({
		where: { status: "voting" },
		orderBy: { createdAt: "desc" },
		select: {
			slug: true,
			poll: {
				select: {
					id: true,
					deadline: true,
				},
			},
			participants: {
				where: activeParticipationWhere,
				select: { userId: true },
			},
		},
	});
}

export async function buildVotedReply(
	db: Database,
	telegramUserId?: number,
): Promise<string> {
	const sitting = await loadVotingSitting(db);
	if (!sitting?.poll) {
		return "No poll open right now.";
	}

	const participantCount = sitting.participants.length;
	const voterRows = await db.pollVote.groupBy({
		by: ["userId"],
		where: { option: { pollId: sitting.poll.id } },
	});
	const voterCount = voterRows.length;
	const closes = formatReadingDeadlineTelegramLine(sitting.poll.deadline);
	const voteUrl = `${resolvePublicAppOrigin()}${"/sittings/"}${sitting.slug}/vote`;

	const lines = [
		"<b>Poll participation</b>",
		`${voterCount} of ${participantCount} participants have voted.`,
		`Poll closes: ${closes}`,
	];

	if (telegramUserId != null) {
		const user = await loadLinkedUserByTelegramId(db, telegramUserId);
		if (!user) {
			lines.push("", "Link your account to see your vote status.");
		} else {
			const isParticipant = sitting.participants.some(
				(row) => row.userId === user.id,
			);
			if (!isParticipant) {
				lines.push("", "You are not on this sitting's participant list.");
			} else {
				const myVoteCount = await db.pollVote.count({
					where: {
						userId: user.id,
						option: { pollId: sitting.poll.id },
					},
				});
				if (myVoteCount > 0) {
					const bookWord = myVoteCount === 1 ? "book" : "books";
					lines.push(
						"",
						`You have voted (${myVoteCount} ${bookWord} selected).`,
					);
				} else {
					lines.push("", "You have not voted yet.");
				}
			}
		}
	}

	lines.push(telegramAnchor(voteUrl, "Open poll on BBRC"));
	return lines.join("\n");
}

async function loadOngoingSittingForNext(db: Database) {
	return db.sitting.findFirst({
		where: { status: { in: ["voting", "reading"] } },
		orderBy: { createdAt: "desc" },
		select: {
			slug: true,
			status: true,
			deadline: true,
			selectedBookId: true,
			selectedBook: { select: getBookListFields },
			poll: { select: { id: true, deadline: true } },
			participants: {
				where: activeParticipationWhere,
				select: { userId: true, progress: true },
			},
		},
	});
}

export async function buildNextReply(
	db: Database,
	telegramUserId: number,
): Promise<string> {
	const user = await loadLinkedUserByTelegramId(db, telegramUserId);
	if (!user) {
		return buildLinkAccountReply();
	}

	const origin = resolvePublicAppOrigin();
	const lines: string[] = ["<b>What to do next</b>"];

	const statusLabel = formatClubStatus(user.status);
	if (statusLabel === "Banned") {
		lines.push("Your club status is banned—you cannot join new sittings.");
	}

	const sitting = await loadOngoingSittingForNext(db);
	if (!sitting) {
		lines.push("No voting or reading sitting right now.");
		lines.push(telegramAnchor(origin, "Browse BBRC"));
		return lines.join("\n");
	}

	const sittingUrl = `${origin}${"/sittings/"}${sitting.slug}`;
	const participation = sitting.participants.find(
		(row) => row.userId === user.id,
	);

	if (sitting.status === "voting" && sitting.poll) {
		const closes = formatReadingDeadlineTelegramLine(sitting.poll.deadline);
		const voteUrl = `${sittingUrl}/vote`;

		if (!participation) {
			lines.push("There is an open book poll, but you are not a participant.");
		} else if (user.status === "banned") {
			lines.push("Poll is open, but banned members cannot vote.");
		} else {
			const myVoteCount = await db.pollVote.count({
				where: {
					userId: user.id,
					option: { pollId: sitting.poll.id },
				},
			});
			if (myVoteCount === 0) {
				lines.push("Vote before the poll closes (" + closes + ").");
				lines.push(telegramAnchor(voteUrl, "Vote on BBRC"));
			} else {
				const bookWord = myVoteCount === 1 ? "book" : "books";
				lines.push(
					"You already voted (" +
						String(myVoteCount) +
						" " +
						bookWord +
						"). You can change votes until " +
						closes +
						".",
				);
				lines.push(telegramAnchor(voteUrl, "Review your vote"));
			}
		}
	}

	if (sitting.status === "reading") {
		const deadline = formatReadingDeadlineTelegramLine(sitting.deadline);
		const bookTitle = sitting.selectedBook?.title;

		if (!participation) {
			if (bookTitle) {
				lines.push(
					"Reading phase: <i>" + escapeTelegramHtml(bookTitle) + "</i>.",
				);
			} else {
				lines.push("Reading phase is underway.");
			}
			lines.push("You are not on this sitting's participant list.");
		} else {
			const progress = participation.progress;
			if (bookTitle) {
				lines.push(
					"Reading <i>" +
						escapeTelegramHtml(bookTitle) +
						"</i> — deadline " +
						deadline +
						".",
				);
			} else {
				lines.push("Reading deadline: " + deadline + ".");
			}
			lines.push(
				"Your progress: " +
					escapeTelegramHtml(memberProgressLabel(progress)) +
					".",
			);

			if (progress !== "completed") {
				lines.push("Use /setprogress to update your status.");
			} else if (sitting.selectedBookId) {
				const feedback = await db.feedback.findUnique({
					where: {
						authorId_bookId: {
							authorId: user.id,
							bookId: sitting.selectedBookId,
						},
					},
					select: { slug: true },
				});
				if (!feedback) {
					const bookSlug = sitting.selectedBook?.slug;
					const feedbackUrl = bookSlug
						? `${origin}${"/books/"}${bookSlug}`
						: sittingUrl;
					lines.push("Leave feedback for this book on BBRC.");
					lines.push(telegramAnchor(feedbackUrl, "Open book"));
				} else {
					lines.push(
						"You marked completed and have feedback—you're caught up.",
					);
					lines.push(
						telegramAnchor(
							`${origin}${"/feedbacks/"}${feedback.slug}`,
							"View your feedback",
						),
					);
				}
			}
		}
	}

	if (lines.length === 1) {
		lines.push(telegramAnchor(sittingUrl, "Open sitting"));
	}

	return lines.join("\n");
}
