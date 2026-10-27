import type { Messages } from "../../shape";

export const seriesErrors: Messages["errors"]["series"] = {
	notFound: "Seriya tapılmadı.",
	slugFailed: "Bu seriya üçün veb ünvan yaradıla bilmədi. Fərqli ad sınayın.",
	invalidSlug:
		"Bu ünvan etibarlı deyil. Hərflər, rəqəmlər və tirelərdən istifadə edin.",
	slugTaken: "Bu ünvanla seriya artıq mövcuddur.",
	alreadyInSeries:
		"Bu kitab artıq “{series}” seriyasındadır. Əvvəlcə onu oradan çıxarın.",
	placeTaken:
		"{position}-ci yeri “{book}” tutub. Digər kitabları aşağı çəkin və ya başqa yer seçin.",
	bookNotInSeries: "Bu kitab bu seriyada deyil.",
	reorderMissing: "Yeni sıraya seriyadakı bütün kitablar daxil olmalıdır.",
	reorderForeign: "Yeni sıraya bu seriyada olmayan kitab daxildir.",
	reorderDuplicate: "Yeni sırada təkrarlanan kitablar var.",
};
