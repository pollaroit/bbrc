/** Best-effort title for notifications; returns null when Open Library is unreachable. */
export async function fetchOpenLibraryWorkTitle(
	olid: string,
): Promise<string | null> {
	const response = await fetch(`https://openlibrary.org/works/${olid}.json`, {
		headers: { Accept: "application/json" },
	});

	if (!response.ok) {
		return null;
	}

	const payload = (await response.json()) as { title?: unknown };
	return typeof payload.title === "string" && payload.title.trim()
		? payload.title.trim()
		: null;
}
