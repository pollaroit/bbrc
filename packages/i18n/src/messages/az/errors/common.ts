import type { Messages } from "../../shape";

export const commonErrors: Messages["errors"]["common"] = {
	notSignedIn: "Bunu etmək üçün hesabınıza daxil olmalısınız.",
	statusNotAllowed: "Hesabınızın statusu buna icazə vermir.",
	adminOnly: "Bunu yalnız adminlər edə bilər.",
	contentEmpty: "Mətn ən azı bir simvoldan ibarət olmalıdır.",
	contentInvalid: "Bu mətn düzgün deyil.",
	contentTooLong: "Mətn ən çoxu {max} simvol ola bilər.",
	reviewInvalid: "Bu rəy düzgün deyil.",
	reviewTooLong: "Rəy ən çoxu {max} simvol ola bilər.",
	invalidBookPages: "Kitabın ən azı 1 səhifəsi olmalıdır.",
	apiUnreachable: "API-yə qoşulmaq mümkün olmadı.",
};
