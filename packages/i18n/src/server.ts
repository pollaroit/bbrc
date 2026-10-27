import type { AbstractIntlMessages } from "use-intl/core";
import { createTranslator } from "use-intl/core";
import type { Locale } from "./locales";
import { getMessages, type Messages, type Namespace } from "./messages";

/**
 * A translator for code that runs outside React (API services, jobs, push messages):
 * `const t = createServerTranslator("az", "language"); t("title")`.
 */
export function createServerTranslator<N extends Namespace>(
	locale: Locale,
	namespace: N,
) {
	return createTranslator({
		locale,
		messages: getMessages(locale) as Messages,
		namespace,
	});
}

/**
 * Like `createServerTranslator`, but the namespace is a dotted path chosen at run time (for
 * example `notifications.messages.pollVoteFirst`) and values are plain objects. For texts picked
 * by a stored id, where the compiler cannot know the key.
 */
export function createLooseTranslator(
	locale: Locale,
	namespace: string,
	options: { timeZone?: string } = {},
) {
	return createTranslator({
		locale,
		messages: getMessages(locale) as unknown as AbstractIntlMessages,
		namespace,
		timeZone: options.timeZone,
	}) as unknown as (key: string, values?: Record<string, unknown>) => string;
}
