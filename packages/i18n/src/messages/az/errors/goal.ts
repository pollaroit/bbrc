import type { Messages } from "../../shape";

export const goalErrors: Messages["errors"]["goal"] = {
	duplicate:
		"Bu il üçün eyni əhatə dairəsi ilə artıq məqsədiniz var. Əhatə dairəsini dəyişin və ya başqa il seçin.",
	expiredYearLocked: "Vaxtı keçmiş məqsədin ili dəyişdirilə bilməz.",
	notFound: "Məqsəd tapılmadı",
	yearOutOfRange:
		"Məqsədlər üçün yalnız {min} və ya {max} ili istifadə oluna bilər.",
};
