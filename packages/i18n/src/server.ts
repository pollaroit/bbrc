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
