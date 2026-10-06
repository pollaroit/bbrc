import { generateSlug, isSlug } from "./slug";

/** Stable slug for a book author name (URL / filter param). */
export function authorNameToSlug(name: string): string {
	return generateSlug(name.trim());
}

export function isAuthorSlug(value: string): boolean {
	return isSlug(value);
}
