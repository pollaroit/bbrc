import { createServerTranslator, type Messages } from "@bbrc/i18n";
import { ORPCError } from "@orpc/server";
import { currentLocale } from "./request-locale";

type Leaves<T, P extends string = ""> = T extends string
	? P
	: {
			[K in keyof T & string]: Leaves<T[K], P extends "" ? K : `${P}.${K}`>;
		}[keyof T & string];

/** Every error text there is, as `"area.key"` (checked by the compiler, e.g. `"book.notFound"`). */
export type ErrorKey = Leaves<Messages["errors"]>;

export type ErrorParams = Record<string, string | number | boolean | Date>;

type ORPCErrorCode = ConstructorParameters<typeof ORPCError>[0];

/**
 * Throws are built with this instead of `new ORPCError(code, { message: "..." })`:
 *
 *   throw appError("NOT_FOUND", "book.notFound", { params: { slug }, data: { slug } });
 *
 * The `message` is the text in the language of the request (the web app sends it; anything
 * else gets English), and `data.i18n` carries the stable key and the parameters, so any client
 * can translate it again or react to the key.
 */
export function appError(
	code: ORPCErrorCode,
	key: ErrorKey,
	options: { params?: ErrorParams; data?: Record<string, unknown> } = {},
) {
	const translate = createServerTranslator(currentLocale(), "errors") as (
		key: string,
		values?: ErrorParams,
	) => string;
	return new ORPCError(code, {
		message: translate(key, options.params),
		data: { ...options.data, i18n: { key, params: options.params ?? {} } },
	});
}
