import type { Messages } from "../../shape";

export const commonErrors: Messages["errors"]["common"] = {
	notSignedIn: "Bunu etmək üçün hesabınıza daxil olmalısınız.",
	statusNotAllowed: "Hesabınızın statusu buna icazə vermir.",
	adminOnly: "Bunu yalnız adminlər edə bilər.",
};
