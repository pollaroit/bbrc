/** Whole-number zoom limits for post and comment maps. */
export const CONTENT_MAP_MIN_ZOOM = 1;
export const CONTENT_MAP_MAX_ZOOM = 18;

export type ContentMapSnapshot = {
	centerLng: number;
	centerLat: number;
	zoom: number;
	markerLng: number | null;
	markerLat: number | null;
};

export type CommentMediaParts = {
	image?: boolean;
	gif?: boolean;
	map?: boolean;
};

function isFiniteCoord(n: number, min: number, max: number): boolean {
	return Number.isFinite(n) && n >= min && n <= max;
}

/** Why the map is invalid, or null when it is acceptable. */
export function validateContentMap(value: ContentMapSnapshot): string | null {
	if (!isFiniteCoord(value.centerLng, -180, 180)) {
		return "Map centre longitude must be between -180 and 180.";
	}
	if (!isFiniteCoord(value.centerLat, -90, 90)) {
		return "Map centre latitude must be between -90 and 90.";
	}
	if (
		!Number.isInteger(value.zoom) ||
		value.zoom < CONTENT_MAP_MIN_ZOOM ||
		value.zoom > CONTENT_MAP_MAX_ZOOM
	) {
		return `Map zoom must be a whole number from ${CONTENT_MAP_MIN_ZOOM} to ${CONTENT_MAP_MAX_ZOOM}.`;
	}
	const hasMarkerLng = value.markerLng != null;
	const hasMarkerLat = value.markerLat != null;
	if (hasMarkerLng !== hasMarkerLat) {
		return "Set both marker coordinates or neither.";
	}
	if (hasMarkerLng && hasMarkerLat) {
		const markerLng = value.markerLng;
		const markerLat = value.markerLat;
		if (!isFiniteCoord(markerLng, -180, 180)) {
			return "Marker longitude must be between -180 and 180.";
		}
		if (!isFiniteCoord(markerLat, -90, 90)) {
			return "Marker latitude must be between -90 and 90.";
		}
	}
	return null;
}

/** Marker position for display (explicit marker or map centre). */
export function contentMapMarkerPoint(map: ContentMapSnapshot): {
	lng: number;
	lat: number;
} {
	if (map.markerLng != null && map.markerLat != null) {
		return { lng: map.markerLng, lat: map.markerLat };
	}
	return { lng: map.centerLng, lat: map.centerLat };
}

/** Why these media cannot share one comment, or null when they can. */
export function commentMediaConflict(parts: CommentMediaParts): string | null {
	const count =
		(parts.image ? 1 : 0) + (parts.gif ? 1 : 0) + (parts.map ? 1 : 0);
	if (count > 1) {
		return "A comment can have only one of image, GIF, or map.";
	}
	return null;
}

/** Default map centre when opening the picker (club home city). */
export const CONTENT_MAP_DEFAULT_CENTER = {
	lng: 49.8671,
	lat: 40.4093,
	zoom: 11,
} as const;
