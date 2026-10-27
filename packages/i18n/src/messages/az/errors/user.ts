import type { Messages } from "../../shape";

export const userErrors: Messages["errors"]["user"] = {
	notFound: "Üzv tapılmadı.",
	notFoundByUsername:
		"{username} istifadəçi adı ilə üzv tapılmadı. İstifadəçi adını yoxlayıb yenidən cəhd edin.",
	actionUnavailable: "Bu əməliyyat hesabınız üçün əlçatan deyil.",
	mutualFilterNeedsSignIn: "Ortaq oturumlara görə filtrləmək üçün daxil olun.",
	invalidStatsPeriod: "Bu statistika dövrü düzgün deyil.",
	nameUnchanged: "Hazırkı adınızdan fərqli bir ad seçin.",
	usernameAccountBlocked: "Hesabınız hazırda istifadəçi adını dəyişə bilməz.",
	usernameUnchanged:
		"Hazırkı istifadəçi adınızdan fərqli bir istifadəçi adı seçin.",
	usernameCooldown:
		"İstifadəçi adınızı gözləmə müddəti bitdikdən sonra yenidən dəyişə bilərsiniz.",
	usernameTaken: "Bu istifadəçi adı artıq tutulub.",
	usernameUpdateFailed:
		"İstifadəçi adının yenilənməsi tamamlanmadı. Yenidən cəhd edin.",
};
