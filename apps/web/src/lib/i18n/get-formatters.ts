import { createFormatters, type Formatters, toLocale } from "@bbrc/i18n";
import { getLocale } from "next-intl/server";

/** The same formatters for server components and server code (`await getFormatters()`). */
export async function getFormatters(): Promise<Formatters> {
	return createFormatters(toLocale(await getLocale()));
}
