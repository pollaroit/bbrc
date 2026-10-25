import { isValidIsbn10, isValidIsbn13, normalizeIsbn } from "./book-lookup";

/** The ISBN-13 that goes with an ISBN-10 (978 prefix, new check digit); null when it is not valid. */
export function isbn10To13(value: string): string | null {
	const isbn = normalizeIsbn(value);
	if (!isValidIsbn10(isbn)) return null;
	const body = `978${isbn.slice(0, 9)}`;
	let sum = 0;
	for (let index = 0; index < 12; index++) {
		sum += Number(body[index]) * (index % 2 === 0 ? 1 : 3);
	}
	return `${body}${(10 - (sum % 10)) % 10}`;
}

/** The ISBN-10 that goes with a 978 ISBN-13; null for 979 prefixes and invalid input. */
export function isbn13To10(value: string): string | null {
	const isbn = normalizeIsbn(value);
	if (!isValidIsbn13(isbn) || !isbn.startsWith("978")) return null;
	const body = isbn.slice(3, 12);
	let sum = 0;
	for (let index = 0; index < 9; index++) {
		sum += Number(body[index]) * (10 - index);
	}
	const check = (11 - (sum % 11)) % 11;
	return `${body}${check === 10 ? "X" : check}`;
}

/** Both forms of one ISBN (digits only), whichever was given. */
export function isbnPair(value: string): {
	isbn13: string | null;
	isbn10: string | null;
} {
	const isbn = normalizeIsbn(value);
	if (isValidIsbn13(isbn)) return { isbn13: isbn, isbn10: isbn13To10(isbn) };
	if (isValidIsbn10(isbn)) return { isbn13: isbn10To13(isbn), isbn10: isbn };
	return { isbn13: null, isbn10: null };
}
