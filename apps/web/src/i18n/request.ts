import { getMessages } from "@bbrc/i18n";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/** Server components read the whole catalog; the browser is sent only the namespaces a page asks for. */
export default getRequestConfig(async ({ requestLocale }) => {
	const requested = await requestLocale;
	const locale = hasLocale(routing.locales, requested)
		? requested
		: routing.defaultLocale;
	return { locale, messages: getMessages(locale) };
});
