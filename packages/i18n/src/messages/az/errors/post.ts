import type { Messages } from "../../shape";

export const postErrors: Messages["errors"]["post"] = {
	notFound: "Paylaşım tapılmadı",
	onlyAuthor: "Bu paylaşımı yalnız müəllifi dəyişə bilər",
	pollNoAttachment: "Sorğusu olan paylaşıma başqa əlavə qoşmaq olmaz.",
	slugFailed: "Paylaşım üçün ünvan yaradıla bilmədi",
	bookNotFound: "Kitab tapılmadı",
	shelfNotFound: "Rəf tapılmadı",
	sittingNotFound: "Oturum tapılmadı",
	memberNotFound: "Üzv tapılmadı",
	reviewNotFound: "Rəy tapılmadı",
	commentNotFound: "Şərh tapılmadı",
	authorNotFound: "Müəllif tapılmadı",
	privateShelf:
		"Gizli rəfi paylaşıma əlavə etmək olmaz. Əvvəlcə onu açıq edin.",
	memberNoAttach: "{name} paylaşımlara əlavə olunmağa icazə vermir.",
	sharingOff: "Bu paylaşım üçün paylaşma söndürülüb.",
};
