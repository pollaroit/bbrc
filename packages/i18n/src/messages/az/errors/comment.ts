import type { Messages } from "../../shape";

export const commentErrors: Messages["errors"]["comment"] = {
	notFound: "Şərh tapılmadı",
	onlyAuthor: "Bu şərhi yalnız müəllifi dəyişə bilər",
	postNotFound: "Paylaşım tapılmadı",
	reviewNotFound: "Rəy tapılmadı",
	commentsOff: "Bu paylaşım üçün şərhlər söndürülüb.",
	replyTargetInvalid: "Cavab bu müzakirədəki bir şərhə verilməlidir",
	replyTooDeep: "Cavablar {levels} səviyyədən dərin ola bilməz",
	slugFailed: "Şərh üçün ünvan yaradıla bilmədi",
};
