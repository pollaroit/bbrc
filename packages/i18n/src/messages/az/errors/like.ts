import type { Messages } from "../../shape";

export const likeErrors: Messages["errors"]["like"] = {
	postNotFound: "Paylaşım tapılmadı",
	commentNotFound: "Şərh tapılmadı",
	reviewNotFound: "Rəy tapılmadı",
	likesOff: "Bu paylaşım üçün bəyənmələr söndürülüb.",
	targetRequired: "Paylaşım, şərh və ya rəy göstərin",
};
