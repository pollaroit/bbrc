import { parse, TYPE } from "@formatjs/icu-messageformat-parser";
import { LOCALE_INTL_TAGS, LOCALES, type Locale } from "./locales";
import { getMessages } from "./messages";

type Flat = Record<string, string>;

/** `{ a: { b: "x" } }` to `{ "a.b": "x" }`. */
export function flattenMessages(tree: unknown, prefix = ""): Flat {
	const out: Flat = {};
	if (typeof tree === "string") {
		out[prefix] = tree;
		return out;
	}
	if (tree && typeof tree === "object") {
		for (const [key, value] of Object.entries(tree)) {
			Object.assign(
				out,
				flattenMessages(value, prefix ? `${prefix}.${key}` : key),
			);
		}
	}
	return out;
}

/** What a message needs from its caller: argument names with their kind, and plural forms. */
export type MessageShape = {
	args: Record<
		string,
		"value" | "number" | "date" | "time" | "plural" | "select" | "tag"
	>;
	pluralForms: Record<string, string[]>;
};

export function describeMessage(message: string): MessageShape {
	const shape: MessageShape = { args: {}, pluralForms: {} };
	const visit = (nodes: ReturnType<typeof parse>) => {
		for (const node of nodes) {
			switch (node.type) {
				case TYPE.argument:
					shape.args[node.value] ??= "value";
					break;
				case TYPE.number:
					shape.args[node.value] = "number";
					break;
				case TYPE.date:
					shape.args[node.value] = "date";
					break;
				case TYPE.time:
					shape.args[node.value] = "time";
					break;
				case TYPE.tag:
					shape.args[node.value] = "tag";
					visit(node.children);
					break;
				case TYPE.plural:
					shape.args[node.value] = "plural";
					shape.pluralForms[node.value] = Object.keys(node.options).sort();
					for (const option of Object.values(node.options)) visit(option.value);
					break;
				case TYPE.select:
					shape.args[node.value] = "select";
					for (const option of Object.values(node.options)) visit(option.value);
					break;
				default:
					break;
			}
		}
	};
	visit(parse(message));
	return shape;
}

/** The plural categories a language uses (CLDR), e.g. `one` and `other` for Azerbaijani. */
export function pluralCategories(locale: Locale): string[] {
	return [
		...new Intl.PluralRules(LOCALE_INTL_TAGS[locale]).resolvedOptions()
			.pluralCategories,
	].sort();
}

/**
 * Compares every language with English and returns what is wrong, one line each: a missing or
 * extra key, a message that cannot be parsed, different arguments, or a plural without the
 * forms the language needs (it must have `other`, and may only use the language's categories
 * or an exact `=N` match).
 */
export function findProblems(
	catalog: (locale: Locale) => unknown = getMessages,
): string[] {
	const problems: string[] = [];
	const source = flattenMessages(catalog("en"));

	for (const locale of LOCALES) {
		const flat = locale === "en" ? source : flattenMessages(catalog(locale));
		const allowed = new Set(pluralCategories(locale));

		for (const key of Object.keys(source)) {
			if (!(key in flat)) problems.push(`${locale}: missing key "${key}"`);
		}
		for (const key of Object.keys(flat)) {
			if (!(key in source))
				problems.push(`${locale}: extra key "${key}" (not in English)`);
		}

		for (const [key, text] of Object.entries(flat)) {
			let shape: MessageShape;
			try {
				shape = describeMessage(text);
			} catch (error) {
				problems.push(
					`${locale}: "${key}" is not a valid message (${(error as Error).message})`,
				);
				continue;
			}

			for (const [name, forms] of Object.entries(shape.pluralForms)) {
				if (!forms.includes("other"))
					problems.push(
						`${locale}: "${key}" plural {${name}} needs an "other" form`,
					);
				for (const form of forms) {
					if (!form.startsWith("=") && !allowed.has(form)) {
						problems.push(
							`${locale}: "${key}" plural {${name}} uses "${form}", which ${locale} does not have`,
						);
					}
				}
			}

			const english = source[key];
			if (locale === "en" || english === undefined) continue;
			let englishShape: MessageShape;
			try {
				englishShape = describeMessage(english);
			} catch {
				continue;
			}
			const mine = Object.keys(shape.args).sort().join(",");
			const theirs = Object.keys(englishShape.args).sort().join(",");
			if (mine !== theirs) {
				problems.push(
					`${locale}: "${key}" takes {${mine}} but English takes {${theirs}}`,
				);
			}
		}
	}
	return problems;
}
