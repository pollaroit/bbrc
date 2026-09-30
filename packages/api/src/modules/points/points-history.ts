import { UserSchema } from "@bbrc/schemas";
import type { z } from "zod";
import zod from "zod";

export const PointsChartPointSchema = zod.object({
	date: zod.coerce.date(),
	total: zod.number().int(),
});

export type PointsChartPoint = z.infer<typeof PointsChartPointSchema>;

export const GetPointsChartInputSchema = zod.object({
	username: UserSchema.shape.username,
});

export type GetPointsChartInput = z.infer<typeof GetPointsChartInputSchema>;

export const GetPointsChartOutputSchema = zod.object({
	currentTotal: zod.number().int(),
	points: zod.array(PointsChartPointSchema),
});

export type GetPointsChartOutput = z.infer<typeof GetPointsChartOutputSchema>;

export function buildRunningBalanceLookup(
	events: readonly { id: string; points: number }[],
	currentTotal: number,
): Map<string, { before: number; after: number }> {
	let running = currentTotal;
	const lookup = new Map<string, { before: number; after: number }>();

	for (const event of events) {
		const after = running;
		const before = running - event.points;
		lookup.set(event.id, { before, after });
		running = before;
	}

	return lookup;
}

export function buildPointsChartSeries(
	userCreatedAt: Date,
	currentTotal: number,
	eventsAsc: readonly { createdAt: Date; points: number }[],
): GetPointsChartOutput["points"] {
	const points: GetPointsChartOutput["points"] = [
		{ date: userCreatedAt, total: 0 },
	];

	let running = 0;

	for (const event of eventsAsc) {
		running += event.points;
		points.push({ date: event.createdAt, total: running });
	}

	if (points.length === 1 && currentTotal !== 0) {
		points.push({ date: userCreatedAt, total: currentTotal });
	}

	return points;
}
