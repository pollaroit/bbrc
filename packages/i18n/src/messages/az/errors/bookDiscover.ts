import type { Messages } from "../../shape";

export const bookDiscoverErrors: Messages["errors"]["bookDiscover"] = {
	aiDailyLimit:
		"Gündə {count, plural, one {# dəfə} other {# dəfə}} süni intellektdən soruşa bilərsiniz. Sabah yenidən cəhd edin.",
	aiFailed: "Təklif hazırlana bilmədi. Bir az sonra yenidən cəhd edin.",
	laneNotForYou: "Bu bölmə sizin üçün deyil.",
};
