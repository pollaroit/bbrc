import type { Database } from "@bbrc/db";
import { activeParticipationWhere } from "../../modules/sitting/participation-active";
import { sendTelegramMessage, sendTelegramPoll } from "./client";
import { escapeTelegramHtml } from "./escape-html";
import { formatClubDateTime } from "./format-club-datetime";
import { resolvePublicAppOrigin } from "./public-app-origin";

function sittingLabel(slug: string): string {
	return slug.replaceAll("_", " ");
}

function absoluteUrl(path: string): string {
	const origin = resolvePublicAppOrigin();
	return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function telegramAnnouncePollOpen(
	db: Database,
	sittingSlug: string,
	options?: { force?: boolean },
): Promise<boolean> {
	const sitting = await db.sitting.findUnique({
		where: { slug: sittingSlug },
		select: {
			id: true,
			slug: true,
			telegramPollOpenSentAt: true,
			poll: {
				select: {
					deadline: true,
					_count: { select: { options: true } },
				},
			},
			_count: { select: { participants: true } },
		},
	});

	if (!sitting?.poll) {
		return false;
	}

	if (sitting.telegramPollOpenSentAt && !options?.force) {
		return false;
	}

	const label = escapeTelegramHtml(sittingLabel(sitting.slug));
	const deadline = escapeTelegramHtml(
		formatClubDateTime(sitting.poll.deadline),
	);
	const voteUrl = absoluteUrl(`/sittings/${sitting.slug}/vote`);

	const text = [
		`<b>Poll open</b> — ${label}`,
		`Closes: ${deadline} (club time)`,
		`Options: ${sitting.poll._count.options} · Participants: ${sitting._count.participants}`,
		`<a href="${voteUrl}">Vote now</a>`,
	].join("\n");

	const sent = await sendTelegramMessage({ text });
	if (sent) {
		await db.sitting.update({
			where: { id: sitting.id },
			data: { telegramPollOpenSentAt: new Date() },
		});
	}
	return sent;
}

export async function telegramAnnounceReadingStarted(
	db: Database,
	sittingSlug: string,
): Promise<void> {
	const sitting = await db.sitting.findUnique({
		where: { slug: sittingSlug },
		select: {
			slug: true,
			deadline: true,
			selectedBook: {
				select: { title: true, slug: true },
			},
		},
	});

	if (!sitting?.selectedBook) {
		return;
	}

	const bookTitle = escapeTelegramHtml(sitting.selectedBook.title);
	const deadline = escapeTelegramHtml(formatClubDateTime(sitting.deadline));
	const sittingUrl = absoluteUrl(`/sittings/${sitting.slug}`);

	const text = [
		"<b>Reading started</b>",
		`Winner: <i>${bookTitle}</i>`,
		`Reading deadline: ${deadline} (club time)`,
		`<a href="${sittingUrl}">Open sitting</a>`,
	].join("\n");

	await sendTelegramMessage({ text });
}

export async function telegramAnnounceSittingFinished(
	db: Database,
	sittingSlug: string,
): Promise<void> {
	const sitting = await db.sitting.findUnique({
		where: { slug: sittingSlug },
		select: {
			slug: true,
			selectedBook: {
				select: { title: true, slug: true },
			},
			participants: {
				where: activeParticipationWhere,
				select: { progress: true },
			},
		},
	});

	if (!sitting?.selectedBook) {
		return;
	}

	let completed = 0;
	let dnf = 0;
	for (const row of sitting.participants) {
		if (row.progress === "completed") {
			completed += 1;
		} else if (row.progress === "dnf") {
			dnf += 1;
		}
	}

	const bookTitle = escapeTelegramHtml(sitting.selectedBook.title);
	const sittingUrl = absoluteUrl(`/sittings/${sitting.slug}`);
	const participantsUrl = absoluteUrl(`/sittings/${sitting.slug}/participants`);
	const feedbackUrl = absoluteUrl(
		`/books/${sitting.selectedBook.slug}/feedbacks`,
	);

	const text = [
		`<b>Sitting finished</b> — <i>${bookTitle}</i>`,
		`Completed: ${completed} · DNF: ${dnf}`,
		`<a href="${feedbackUrl}">Leave feedback</a> · <a href="${participantsUrl}">Participants</a>`,
		`<a href="${sittingUrl}">Sitting recap</a>`,
	].join("\n");

	await sendTelegramMessage({ text });
}

const READING_PROGRESS_POLL_OPTIONS = [
	"Not started",
	"Started",
	"About half",
	"Finished",
] as const;

/** Midterm-style progress poll in the club Telegram group (non-anonymous). */
export async function telegramSendReadingProgressPoll(
	db: Database,
	sittingSlug: string,
): Promise<boolean> {
	const sitting = await db.sitting.findUnique({
		where: { slug: sittingSlug },
		select: {
			slug: true,
			status: true,
			selectedBook: { select: { title: true } },
		},
	});

	if (!sitting?.selectedBook || sitting.status !== "reading") {
		return false;
	}

	const bookTitle = sitting.selectedBook.title.slice(0, 200);
	const question = `What is your progress on “${bookTitle}”?`;
	const sittingUrl = absoluteUrl(`/sittings/${sitting.slug}`);
	const explanation = `Update on BBRC: ${sittingUrl}`.slice(0, 200);

	return sendTelegramPoll({
		question,
		options: [...READING_PROGRESS_POLL_OPTIONS],
		isAnonymous: false,
		explanation,
	});
}

/** ~24h before reading ends: warn the group and name members not yet completed. */
export async function telegramSendReading24hWarning(
	db: Database,
	sittingSlug: string,
): Promise<boolean> {
	const sitting = await db.sitting.findUnique({
		where: { slug: sittingSlug },
		select: {
			slug: true,
			status: true,
			deadline: true,
			selectedBook: { select: { title: true } },
			participants: {
				where: activeParticipationWhere,
				select: {
					progress: true,
					user: { select: { name: true, username: true } },
				},
			},
		},
	});

	if (!sitting?.selectedBook || sitting.status !== "reading") {
		return false;
	}

	const behind = sitting.participants.filter(
		(row) => row.progress !== "completed",
	);
	const bookTitle = escapeTelegramHtml(sitting.selectedBook.title);
	const deadline = escapeTelegramHtml(formatClubDateTime(sitting.deadline));
	const sittingUrl = absoluteUrl(`/sittings/${sitting.slug}`);

	const nameLines =
		behind.length === 0
			? "Everyone has marked completed on BBRC."
			: behind
					.slice(0, 20)
					.map((row) => {
						const label = escapeTelegramHtml(
							row.user.name?.trim() || row.user.username,
						);
						return `· ${label} (${row.progress.replaceAll("_", " ")})`;
					})
					.join("\n");

	const text = [
		"<b>24 hours left</b>",
		`Reading <i>${bookTitle}</i> ends ${deadline} (club time).`,
		behind.length > 0
			? `<b>Not completed yet (${behind.length}):</b>\n${nameLines}`
			: nameLines,
		`<a href="${sittingUrl}">Open sitting</a>`,
	].join("\n\n");

	return sendTelegramMessage({ text });
}
