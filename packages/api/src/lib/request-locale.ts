import { AsyncLocalStorage } from "node:async_hooks";
import {
	DEFAULT_LOCALE,
	type Locale,
	setValidationLocaleResolver,
} from "@bbrc/i18n";

const storage = new AsyncLocalStorage<Locale>();

/**
 * Runs `work` with `locale` as the language of the current API request, so code deep inside a
 * service (errors, text written for the caller) can use it without passing it around.
 */
export function runWithLocale<T>(locale: Locale, work: () => T): T {
	return storage.run(locale, work);
}

/** The language of the API request being handled; English outside a request. */
export function currentLocale(): Locale {
	return storage.getStore() ?? DEFAULT_LOCALE;
}

// Validation texts written while an API request is handled follow that request's language.
setValidationLocaleResolver(currentLocale);
