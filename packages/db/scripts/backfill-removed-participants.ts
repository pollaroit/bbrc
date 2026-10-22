/**
 * One-off backfill for members an admin removed from a sitting before removal
 * had a "DNF" vs "remove completely" choice.
 *
 *   bun run db:backfill-removed -- entries.json            # dry run
 *   bun run db:backfill-removed -- entries.json --apply    # write changes
 *
 * entries.json: [{ "sitting": "<slug>", "username": "<username>", "action": "dnf" | "remove" }]
 *
 * - remove: deletes the participation row, as if the member never joined.
 * - dnf: marks the row DNF (kept as removed). When the sitting is already
 *   finished it also applies the DNF penalty the finish step would have applied
 *   (RP event, RP balance, warned/banned status). Open sittings need nothing
 *   more: the finish step now includes removed DNF members.
 */
import { readFileSync } from "node:fs";

import "varlock/auto-load";

import { ENV } from "../src/env.js";
import { createPrismaClient } from "../src/index.js";

type Entry = { sitting: string; username: string; action: "dnf" | "remove" };

// Mirrors calculateRpPointsDelta / nextUserStatusAfterParticipationProgress in @bbrc/api.
const dnfPoints = (pages: number) => -Math.round(1000 / pages);
const statusAfterDnf = <T extends string>(status: T) =>
	status === "active" ? "warned" : status === "warned" ? "banned" : status;

async function main() {
	const [file, ...flags] = process.argv.slice(2).filter((arg) => arg !== "--");
	const apply = flags.includes("--apply");

	if (!file) {
		throw new Error(
			"Usage: backfill-removed-participants <entries.json> [--apply]",
		);
	}

	const entries = JSON.parse(readFileSync(file, "utf8")) as Entry[];
	const db = createPrismaClient({ DATABASE_URL: ENV.DATABASE_URL });

	console.log(apply ? "APPLYING changes" : "DRY RUN (pass --apply to write)");

	try {
		for (const entry of entries) {
			const label = `${entry.username} @ ${entry.sitting} -> ${entry.action}`;
			const participation = await db.participation.findFirst({
				where: {
					user: { username: entry.username },
					sitting: { slug: entry.sitting },
				},
				select: {
					id: true,
					userId: true,
					sittingId: true,
					progress: true,
					removedAt: true,
					user: { select: { status: true, rp: true } },
					sitting: {
						select: {
							status: true,
							selectedBook: { select: { pages: true } },
						},
					},
				},
			});

			if (!participation) {
				console.warn(`SKIP ${label}: no participation found`);
				continue;
			}
			if (participation.removedAt == null) {
				console.warn(`SKIP ${label}: member is still active on the sitting`);
				continue;
			}

			if (entry.action === "remove") {
				console.log(`${label}: delete participation row`);
				if (apply) {
					await db.participation.delete({ where: { id: participation.id } });
				}
				continue;
			}

			const finished = participation.sitting.status === "finished";
			const pages = participation.sitting.selectedBook?.pages;
			const penaltyDone = await db.rPEvent.findFirst({
				where: {
					userId: participation.userId,
					sittingId: participation.sittingId,
				},
				select: { id: true },
			});

			console.log(
				`${label}: mark DNF${
					finished && !penaltyDone && pages
						? `, RP ${dnfPoints(pages)}, status ${participation.user.status} -> ${statusAfterDnf(participation.user.status)}`
						: finished
							? " (penalty already recorded or no book pages)"
							: " (penalty applies when the sitting finishes)"
				}`,
			);

			if (!apply) {
				continue;
			}

			await db.$transaction(async (tx) => {
				await tx.participation.update({
					where: { id: participation.id },
					data: { progress: "dnf" },
				});

				if (finished && !penaltyDone && pages) {
					const points = dnfPoints(pages);
					await tx.rPEvent.create({
						data: {
							userId: participation.userId,
							sittingId: participation.sittingId,
							points,
						},
					});
					await tx.user.update({
						where: { id: participation.userId },
						data: {
							rp: { increment: points },
							status: statusAfterDnf(participation.user.status),
						},
					});
				}
			});
		}
	} finally {
		await db.$disconnect();
	}
}

await main();
