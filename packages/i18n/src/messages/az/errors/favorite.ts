import type { Messages } from "../../shape";

export const favoriteErrors: Messages["errors"]["favorite"] = {
	memberNotFound: "Üzv tapılmadı.",
	limitReached:
		"Ən çox {max, plural, one {# sevimli} other {# sevimli}} saxlaya bilərsiniz. Əvəz etmək üçün birini seçin.",
	slotNotYours: "Bu sevimli yeri sizə aid deyil.",
	addFailed: "Bu sevimli əlavə edilə bilmədi. Yenidən cəhd edin.",
};
