import type { Locale } from "../locales";
import { az } from "./az";
import { en } from "./en";
import type { Messages } from "./shape";

export type { Messages } from "./shape";

export type Namespace = keyof Messages;

const catalogs: Record<Locale, Messages> = { en, az };

/** All messages of a language. */
export function getMessages(locale: Locale): Messages {
	return catalogs[locale];
}

/** Only some namespaces, so a page sends the browser what it needs and nothing else. */
export function pickMessages<const N extends Namespace>(
	locale: Locale,
	namespaces: readonly N[],
): Pick<Messages, N> {
	const all = catalogs[locale];
	return Object.fromEntries(
		namespaces.map((name) => [name, all[name]]),
	) as Pick<Messages, N>;
}
