import { CONTENT_MAP_MAX_ZOOM, CONTENT_MAP_MIN_ZOOM } from "@bbrc/shared";
import type { z } from "zod";
import zod from "zod";

export const ContentMapViewSchema = zod.object({
	centerLng: zod.number(),
	centerLat: zod.number(),
	zoom: zod.number().int(),
	markerLng: zod.number().nullable(),
	markerLat: zod.number().nullable(),
});

export type ContentMapView = z.infer<typeof ContentMapViewSchema>;

export const ContentMapInputSchema = zod
	.object({
		centerLng: zod.number().min(-180).max(180),
		centerLat: zod.number().min(-90).max(90),
		zoom: zod
			.number()
			.int()
			.min(CONTENT_MAP_MIN_ZOOM)
			.max(CONTENT_MAP_MAX_ZOOM),
		markerLng: zod.number().min(-180).max(180).nullable().optional(),
		markerLat: zod.number().min(-90).max(90).nullable().optional(),
	})
	.transform((value) => ({
		centerLng: value.centerLng,
		centerLat: value.centerLat,
		zoom: value.zoom,
		markerLng: value.markerLng ?? null,
		markerLat: value.markerLat ?? null,
	}));

export type ContentMapInput = z.infer<typeof ContentMapInputSchema>;

export const contentMapSelect = {
	centerLng: true,
	centerLat: true,
	zoom: true,
	markerLng: true,
	markerLat: true,
} as const;
