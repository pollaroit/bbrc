type ListCallValue =
	| string
	| number
	| boolean
	| Date
	| readonly string[]
	| null
	| undefined;

export function buildListCallInput<
	const T extends Record<string, ListCallValue>,
>(params: T): Partial<T> {
	const result: Partial<T> = {};

	for (const key of Object.keys(params) as (keyof T)[]) {
		const value = params[key];

		if (value === null || value === undefined) {
			continue;
		}

		if (typeof value === "string" && value.trim() === "") {
			continue;
		}

		if (Array.isArray(value) && value.length === 0) {
			continue;
		}

		result[key] = value as T[keyof T];
	}

	return result;
}
