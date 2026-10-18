export function formatFavoriteSlots(used: number, max: number): string {
	const label = max === 1 ? "fav" : "favs";
	return `${used} out of ${max} ${label}`;
}
