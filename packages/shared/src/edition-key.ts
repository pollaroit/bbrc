/**
 * The id of an edition in a URL (`/books/dune/editions/<key>`): an Open Library
 * edition keeps its own id (`OL123M`), a member-added edition is `m-` plus a short
 * public id (`m-7k2f9x9a`), and an ISBN works as an alias (`isbn-9780441172719`)
 * that redirects to the real address.
 */

export const MEMBER_EDITION_PUBLIC_ID_LENGTH = 8;

export type EditionKey =
	| { kind: "open_library"; olid: string }
	| { kind: "member"; publicId: string }
	| { kind: "isbn"; isbn: string };

const OL_EDITION = /^OL\d+M$/i;
const MEMBER = /^m-([a-z0-9]{8})$/i;
const ISBN_ALIAS = /^isbn-(\d{9}[\dXx]|\d{13})$/;

export function parseEditionKey(value: string): EditionKey | null {
	const key = value.trim();
	if (OL_EDITION.test(key)) {
		return { kind: "open_library", olid: key.toUpperCase() };
	}
	const member = MEMBER.exec(key);
	if (member?.[1]) {
		return { kind: "member", publicId: member[1].toLowerCase() };
	}
	const isbn = ISBN_ALIAS.exec(key);
	if (isbn?.[1]) {
		return { kind: "isbn", isbn: isbn[1].toUpperCase() };
	}
	return null;
}

export const openLibraryEditionKey = (olid: string) => olid.toUpperCase();
export const memberEditionKey = (publicId: string) => `m-${publicId}`;
export const isbnEditionAlias = (isbn: string) => `isbn-${isbn}`;

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** A new short public id for a member edition (random; the caller checks it is free). */
export function newMemberEditionPublicId(
	random: () => number = Math.random,
): string {
	let out = "";
	for (let index = 0; index < MEMBER_EDITION_PUBLIC_ID_LENGTH; index++) {
		out += ALPHABET[Math.floor(random() * ALPHABET.length)];
	}
	return out;
}

/**
 * The address to link to for an edition a member picked. A member edition that is
 * linked to an Open Library edition uses the Open Library address (one page for both).
 */
export function canonicalEditionKey(parts: {
	olid?: string | null;
	publicId?: string | null;
	linkedOlid?: string | null;
}): string | null {
	if (parts.publicId) {
		return parts.linkedOlid
			? openLibraryEditionKey(parts.linkedOlid)
			: memberEditionKey(parts.publicId);
	}
	return parts.olid ? openLibraryEditionKey(parts.olid) : null;
}
