import type { Messages } from "../../shape";

export const feedbackErrors: Messages["errors"]["feedback"] = {
	bookNotFound: "Kitab tapılmadı",
	notFound: "Rəy tapılmadı",
	userNotFound: "İstifadəçi tapılmadı",
	signInForMutual: "Qarşılıqlı rəylərə görə süzmək üçün daxil olun.",
	alreadyReviewed: "Bu kitaba artıq rəy yazmısınız",
	markReadFirst:
		"Rəy yazmazdan əvvəl kitabı oturum səhifəsində oxunmuş kimi işarələyin",
	noReviewForBook: "Bu kitaba rəy yazmamısınız",
	slugFailed: "Rəy üçün ünvan yaradıla bilmədi",
};
