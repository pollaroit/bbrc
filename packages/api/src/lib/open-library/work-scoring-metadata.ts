import {
	openLibraryFetchDocumentJson,
	openLibraryWorkJsonUrl,
	openLibraryWorkRatingsUrl,
} from "./fetch";

function normalizeSubjectEntry(entry: unknown): string | null {
	if (typeof entry === "string") {
		const trimmed = entry.trim();
		return trimmed ? trimmed : null;
	}

	if (entry != null && typeof entry === "object" && "name" in entry) {
		const name = (entry as { name?: unknown }).name;
		if (typeof name === "string") {
			const trimmed = name.trim();
			return trimmed ? trimmed : null;
		}
	}

	return null;
}

function normalizeSubjectList(values: unknown[] | undefined): string[] {
	if (!values?.length) {
		return [];
	}

	const seen = new Set<string>();
	const result: string[] = [];

	for (const entry of values) {
		const normalized = normalizeSubjectEntry(entry);
		if (!normalized) {
			continue;
		}

		const key = normalized.toLowerCase();
		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		result.push(normalized);
	}

	return result;
}

type WorkDocument = {
	subjects?: unknown[];
	subject_people?: unknown[];
	subject_times?: unknown[];
};

export type WorkScoringMetadata = {
	subjects: string[];
	subjectPeople: string[];
	subjectTimes: string[];
	openLibraryRating: number | null;
};

export async function fetchWorkScoringMetadata(
	workKey: string,
): Promise<WorkScoringMetadata> {
	const work = await openLibraryFetchDocumentJson<WorkDocument>(
		openLibraryWorkJsonUrl(workKey),
	);
	const ratings = await openLibraryFetchDocumentJson<{
		summary?: { average?: number };
	}>(openLibraryWorkRatingsUrl(workKey));

	const subjects = normalizeSubjectList(work?.subjects);
	const subjectPeople = normalizeSubjectList(work?.subject_people);
	const subjectTimes = normalizeSubjectList(work?.subject_times);

	let openLibraryRating: number | null = null;
	const average = ratings?.summary?.average;
	if (typeof average === "number" && Number.isFinite(average)) {
		openLibraryRating = average;
	}

	return {
		subjects,
		subjectPeople,
		subjectTimes,
		openLibraryRating,
	};
}
