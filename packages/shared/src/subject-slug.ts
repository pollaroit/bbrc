import { generateSlug, isSlug } from "./slug";

/** Stable slug for a catalog subject label (URL / filter param). */
export function subjectNameToSlug(name: string): string {
	return generateSlug(name.trim());
}

export function isSubjectSlug(value: string): boolean {
	return isSlug(value);
}
