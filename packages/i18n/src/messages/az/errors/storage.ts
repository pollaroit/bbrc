import type { Messages } from "../../shape";

export const storageErrors: Messages["errors"]["storage"] = {
	notConfigured: "Fayl yaddaşı qurulmayıb.",
	invalidKey: "Fayl ünvanı düzgün deyil.",
	forbiddenKey: "Bu fayla giriş icazəniz yoxdur.",
	fileTooLarge: "Fayl çox böyükdür.",
	uploadNotFound: "Yükləmə tapılmadı. Əvvəlcə faylı yükləməyi tamamlayın.",
	sizeMismatch: "Yüklənən faylın ölçüsü uyğun gəlmir.",
	typeMismatch: "Yüklənən faylın növü uyğun gəlmir.",
	bookCoverAdminOnly: "Kitab üz qabıqlarını yalnız adminlər yükləyə bilər.",
	coverUploadBlocked: "Hesabınız üz qabığı yükləyə bilməz.",
	authorPhotoAdminOnly: "Müəllif şəkillərini yalnız adminlər yükləyə bilər.",
	postHasPoll: "Sorğusu olan paylaşıma şəkil əlavə etmək olmaz.",
	postNotFound: "Paylaşım tapılmadı.",
	postImageAuthorOnly: "Paylaşımın şəklini yalnız müəllifi dəyişə bilər.",
	reviewNotFound: "Rəy tapılmadı.",
	reviewImageAuthorOnly: "Rəyin şəklini yalnız müəllifi dəyişə bilər.",
	commentNotFound: "Şərh tapılmadı.",
	commentImageAuthorOnly: "Şərhin şəklini yalnız müəllifi dəyişə bilər.",
};
