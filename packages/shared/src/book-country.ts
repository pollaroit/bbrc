import { countries } from "country-data-list";
import { z } from "zod";

type CountryRow = {
	alpha2?: string;
	name?: string;
	status?: string;
};

const VALID_ALPHA2 = new Set(
	(countries.all as CountryRow[])
		.filter((row): row is CountryRow & { alpha2: string } =>
			Boolean(row.alpha2 && row.status !== "deleted"),
		)
		.map((row) => row.alpha2.toUpperCase()),
);

/** ISO 3166-1 alpha-2 aliases Gemini or humans may emit. */
const ALPHA2_ALIASES: Record<string, string> = {
	UK: "GB",
};

export const bookCountryCodeSchema = z
	.string()
	.trim()
	.transform((value) => value.toUpperCase())
	.transform((value) => ALPHA2_ALIASES[value] ?? value)
	.refine((value) => /^[A-Z]{2}$/.test(value), {
		message: "Country code must be ISO 3166-1 alpha-2",
	})
	.refine((value) => VALID_ALPHA2.has(value), {
		message: "Unknown country code",
	});

export const bookCountriesSchema = z.array(bookCountryCodeSchema).max(8);

export function normalizeBookCountryCodes(codes: readonly string[]): string[] {
	const seen = new Set<string>();
	const normalized: string[] = [];

	for (const raw of codes) {
		const parsed = bookCountryCodeSchema.safeParse(raw);
		if (!parsed.success) {
			continue;
		}
		if (seen.has(parsed.data)) {
			continue;
		}
		seen.add(parsed.data);
		normalized.push(parsed.data);
	}

	return normalized;
}

export function getBookCountryName(alpha2: string): string | null {
	const code = alpha2.toUpperCase();
	const row = (countries.all as CountryRow[]).find(
		(entry) => entry.alpha2?.toUpperCase() === code,
	);
	return row?.name ?? null;
}

export const bookCountrySelectOptions = (countries.all as CountryRow[])
	.filter((row): row is CountryRow & { alpha2: string; name: string } =>
		Boolean(row.alpha2 && row.name && row.status !== "deleted"),
	)
	.map((row) => ({
		alpha2: row.alpha2.toUpperCase(),
		name: row.name,
	}))
	.toSorted((a, b) => a.name.localeCompare(b.name));
