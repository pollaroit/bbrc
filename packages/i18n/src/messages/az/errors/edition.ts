import type { Messages } from "../../shape";

export const editionErrors: Messages["errors"]["edition"] = {
	notFound: "Nəşr tapılmadı.",
	alreadyListed: "Bu nəşr (eyni ISBN) artıq siyahıdadır.",
	dailyLimit:
		"Gündə {count, plural, one {# nəşr} other {# nəşr}} əlavə edə bilərsiniz. Sabah yenidən cəhd edin.",
	onlyOwnerOrAdminEdit:
		"Bunu yalnız əlavə edən üzv və ya admin redaktə edə bilər.",
	onlyOwnerOrAdminDelete: "Bunu yalnız əlavə edən üzv və ya admin silə bilər.",
	inUseAdminOnlyDelete:
		"Üzvlər bu nəşrdən istifadə edir, ona görə yalnız admin silə bilər.",
	pickTwoDifferent: "İki fərqli nəşr seçin.",
	differentBooks: "Bu nəşrlər fərqli kitablara aiddir.",
	openLibraryEditionNotFound: "Bu Open Library nəşri bu kitab üçün tapılmadı.",
	openLibraryEditionLinked:
		"Başqa üzv nəşri artıq həmin Open Library nəşrinə bağlıdır.",
};
