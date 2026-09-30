import {
	clampSittingDeadlineToClubEnd,
	defaultPollDeadline,
	generateSlug,
	generateUniqueSlug,
	snapPollDeadlineOnOrAfter,
} from "@bbrc/shared";
import { faker } from "@faker-js/faker";
import type {
	Book,
	Participation,
	Poll,
	PollOption,
	Sitting,
	User,
} from "../../prisma/generated/client.js";
import type { Database, DatabaseTransaction } from "../index.js";
import { rpDelta, type SeedProgress, XP_AWARD } from "./constants.js";
import {
	createBookFromWork,
	type OpenLibraryWorkSeed,
} from "./open-library.js";
import { eligibleParticipants } from "./users.js";

const SITTING_COUNT = 10;
const FINISHED_SITTING_COUNT = 9;
const SEED_TRANSACTION_MS = 120_000;

type CreatedSitting = Sitting & {
	poll: Poll & { options: PollOption[] };
	participants: Participation[];
	selectedBook: Book | null;
};

function sittingSlug(seed: string): string {
	return generateSlug(`club_${seed}`);
}

function pollSlugForSitting(sittingSlugValue: string): string {
	const combined = `poll_of_${sittingSlugValue}`;
	return combined.length <= 60
		? combined
		: combined.slice(0, 60).replace(/_+$/, "");
}

function pickParticipants(users: User[], count: number): User[] {
	const pool = eligibleParticipants(users);
	const shuffled = faker.helpers.shuffle([...pool]);
	return shuffled.slice(0, Math.min(count, shuffled.length));
}

function finalizeProgress(index: number, finished: boolean): SeedProgress {
	if (!finished) {
		const roll = index % 4;
		if (roll === 0) {
			return "completed";
		}
		if (roll === 1) {
			return "in_progress";
		}
		return "not_started";
	}

	const roll = index % 5;
	if (roll <= 2) {
		return "completed";
	}

	return "dnf";
}

async function createSittingWithPoll(
	tx: DatabaseTransaction,
	input: {
		createdAt: Date;
		deadline: Date;
		pollDeadline: Date;
		status: "voting" | "reading" | "finished";
		pollBooks: Book[];
		participantUsers: User[];
		selectedBookId: string | null;
		slugSeed: string;
	},
): Promise<CreatedSitting> {
	const slug = await generateUniqueSlug(
		sittingSlug(input.slugSeed),
		async (candidate) =>
			(await tx.sitting.findUnique({ where: { slug: candidate } })) == null,
	);

	const pollSlug = await generateUniqueSlug(
		pollSlugForSitting(slug),
		async (candidate) =>
			(await tx.poll.findUnique({ where: { slug: candidate } })) == null,
	);

	const pollBooks = input.pollBooks;

	const sitting = await tx.sitting.create({
		data: {
			slug,
			status: input.status,
			deadline: input.deadline,
			selectedBookId: input.selectedBookId,
			createdAt: input.createdAt,
			updatedAt: input.createdAt,
			poll: {
				create: {
					slug: pollSlug,
					deadline: input.pollDeadline,
					minPages: 150,
					maxPages: 600,
					take: 6,
					minChoices: 1,
					maxChoices: 3,
					createdAt: input.createdAt,
					updatedAt: input.createdAt,
					options: {
						create: pollBooks.map((book) => ({
							bookId: book.id,
							createdAt: input.createdAt,
							updatedAt: input.createdAt,
						})),
					},
				},
			},
			participants: {
				create: input.participantUsers.map((user) => ({
					userId: user.id,
					progress: "not_started",
					createdAt: input.createdAt,
					updatedAt: input.createdAt,
				})),
			},
		},
		include: {
			poll: { include: { options: true } },
			participants: true,
			selectedBook: true,
		},
	});

	if (!sitting.poll) {
		throw new Error("Expected poll on newly created sitting");
	}

	return sitting as CreatedSitting;
}

export async function seedBooksAndSittings(
	db: Database,
	users: User[],
	works: OpenLibraryWorkSeed[],
) {
	const now = new Date();
	const books: Book[] = [];

	for (const work of works) {
		const createdAt = faker.date.past({ years: 2, refDate: now });
		const book = await db.$transaction(
			async (tx) => createBookFromWork(tx, work, "wishlist", createdAt),
			{ timeout: SEED_TRANSACTION_MS },
		);
		books.push(book);
	}

	const sittings: CreatedSitting[] = [];
	const sittingSelectedBooks = books.slice(0, SITTING_COUNT);

	for (let index = 0; index < SITTING_COUNT; index += 1) {
		const finished = index < FINISHED_SITTING_COUNT;
		const isActive = !finished;
		const createdAt = faker.date.past({
			years: 1,
			refDate: new Date(
				now.getTime() - (FINISHED_SITTING_COUNT - index) * 86_400_000,
			),
		});
		const pollDeadline = isActive
			? defaultPollDeadline(now)
			: snapPollDeadlineOnOrAfter(
					new Date(createdAt.getTime() + 7 * 86_400_000),
				);
		const readingDeadline = isActive
			? clampSittingDeadlineToClubEnd(
					faker.date.soon({ days: 45, refDate: now }),
				)
			: clampSittingDeadlineToClubEnd(
					new Date(pollDeadline.getTime() + 45 * 86_400_000),
				);
		const participants = pickParticipants(
			users,
			faker.number.int({ min: 8, max: 12 }),
		);

		const selectedBook = sittingSelectedBooks[index];
		if (!selectedBook) {
			throw new Error("Missing selected book assignment for sitting seed");
		}

		const pollPool = books.filter((book) => book.id !== selectedBook.id);
		const pollBooks = [
			selectedBook,
			...faker.helpers.arrayElements(pollPool, Math.min(5, pollPool.length)),
		];

		const sitting = await db.$transaction(
			async (tx) => {
				const draft = await createSittingWithPoll(tx, {
					createdAt,
					pollDeadline,
					deadline: isActive ? readingDeadline : readingDeadline,
					status: isActive ? "reading" : "finished",
					pollBooks,
					participantUsers: participants,
					selectedBookId: null,
					slugSeed: `sitting_${index + 1}`,
				});

				const winningOption = draft.poll.options.find(
					(option) => option.bookId === selectedBook.id,
				);

				if (!winningOption) {
					throw new Error("Selected book missing from poll options");
				}

				await tx.book.update({
					where: { id: selectedBook.id },
					data: {
						status: isActive ? "reading" : "completed",
					},
				});

				const updatedSitting = await tx.sitting.update({
					where: { id: draft.id },
					data: {
						selectedBookId: selectedBook.id,
						status: isActive ? "reading" : "finished",
					},
					include: {
						poll: { include: { options: true } },
						participants: true,
						selectedBook: true,
					},
				});

				for (const participant of participants) {
					const voteOptions = faker.helpers.arrayElements(
						draft.poll.options,
						faker.number.int({ min: 1, max: 3 }),
					);

					for (const option of voteOptions) {
						await tx.pollVote.create({
							data: {
								userId: participant.id,
								optionId: option.id,
								createdAt: new Date(pollDeadline.getTime() - 86_400_000),
								updatedAt: new Date(pollDeadline.getTime() - 86_400_000),
							},
						});
					}

					await tx.xPEvent.create({
						data: {
							userId: participant.id,
							points: XP_AWARD.participation,
							reason: "participation",
							entityId: draft.id,
							createdAt: new Date(createdAt.getTime() + 3_600_000),
						},
					});

					await tx.xPEvent.create({
						data: {
							userId: participant.id,
							points: XP_AWARD.vote,
							reason: "vote",
							entityId: draft.poll.id,
							createdAt: new Date(pollDeadline.getTime() - 86_400_000),
						},
					});
				}

				const progressByUserId = new Map<string, SeedProgress>();

				for (
					let pIndex = 0;
					pIndex < updatedSitting.participants.length;
					pIndex += 1
				) {
					const participation = updatedSitting.participants[pIndex];
					if (!participation) {
						continue;
					}

					let progress = finalizeProgress(pIndex, finished);
					if (isActive && progress === "dnf") {
						progress = "in_progress";
					}

					if (
						finished &&
						(progress === "not_started" || progress === "in_progress")
					) {
						progress = "dnf";
					}

					progressByUserId.set(participation.userId, progress);

					await tx.participation.update({
						where: { id: participation.id },
						data: { progress },
					});

					if (progress === "completed" || progress === "dnf") {
						const points = rpDelta(progress, selectedBook.pages);
						await tx.rPEvent.create({
							data: {
								userId: participation.userId,
								points,
								sittingId: draft.id,
								createdAt: readingDeadline,
							},
						});
					}
				}

				if (finished) {
					const completedParticipants = updatedSitting.participants.filter(
						(participation) =>
							progressByUserId.get(participation.userId) === "completed",
					);

					for (const participation of completedParticipants.slice(0, 6)) {
						const existingFeedback = await tx.feedback.findUnique({
							where: {
								authorId_bookId: {
									authorId: participation.userId,
									bookId: selectedBook.id,
								},
							},
							select: { id: true },
						});

						if (existingFeedback) {
							continue;
						}

						const feedback = await tx.feedback.create({
							data: {
								authorId: participation.userId,
								bookId: selectedBook.id,
								rating: faker.number.float({
									min: 2.5,
									max: 5,
									fractionDigits: 1,
								}),
								review: faker.lorem.paragraph({ min: 2, max: 4 }).slice(0, 500),
								createdAt: new Date(readingDeadline.getTime() + 86_400_000),
								updatedAt: new Date(readingDeadline.getTime() + 86_400_000),
							},
						});

						await tx.xPEvent.create({
							data: {
								userId: participation.userId,
								points: XP_AWARD.feedback,
								reason: "feedback",
								entityId: feedback.id,
								createdAt: feedback.createdAt,
							},
						});

						const ratings = await tx.feedback.findMany({
							where: { bookId: selectedBook.id },
							select: { rating: true },
						});

						const average =
							ratings.reduce((sum, row) => sum + row.rating, 0) /
							ratings.length;

						await tx.book.update({
							where: { id: selectedBook.id },
							data: { averageRating: Math.round(average * 10) / 10 },
						});
					}
				}

				if (!updatedSitting.poll) {
					throw new Error("Expected poll on sitting");
				}

				return updatedSitting as CreatedSitting;
			},
			{ timeout: SEED_TRANSACTION_MS },
		);

		sittings.push(sitting);
	}

	await syncUserPoints(db);

	return { books, sittings };
}

async function syncUserPoints(db: Database) {
	const users = await db.user.findMany({ select: { id: true } });

	for (const user of users) {
		const [xpSum, rpSum] = await Promise.all([
			db.xPEvent.aggregate({
				where: { userId: user.id },
				_sum: { points: true },
			}),
			db.rPEvent.aggregate({
				where: { userId: user.id },
				_sum: { points: true },
			}),
		]);

		await db.user.update({
			where: { id: user.id },
			data: {
				xp: xpSum._sum.points ?? 0,
				rp: rpSum._sum.points ?? 0,
			},
		});
	}
}
