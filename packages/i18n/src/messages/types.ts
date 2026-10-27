/** Turns every string literal in a message tree into `string`, keeping the shape. */
export type DeepString<T> = T extends string
	? string
	: { [K in keyof T]: DeepString<T[K]> };

/**
 * Identity helper for a language's messages. The English file defines the shape; every other
 * language is annotated with `Messages`, so a key that one has and the other lacks (in either
 * direction) is a type error.
 */
export const defineMessages = <const T extends Record<string, unknown>>(
	messages: T,
): T => messages;
