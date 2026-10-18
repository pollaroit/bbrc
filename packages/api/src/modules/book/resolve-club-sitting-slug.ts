type ClubSittingPick = {
	slug: string;
	status: "reading" | "finished" | "voting";
};

export function resolveClubSittingSlug(
	bookStatus: "wishlist" | "reading" | "completed",
	sittings: ClubSittingPick[],
): string | null {
	if (bookStatus === "wishlist") {
		return null;
	}

	const targetStatus = bookStatus === "reading" ? "reading" : "finished";
	return sittings.find((row) => row.status === targetStatus)?.slug ?? null;
}
