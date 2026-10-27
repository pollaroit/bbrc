import type { Messages } from "../../shape";

export const quizErrors: Messages["errors"]["quiz"] = {
	aiNotConfigured: "Gemini konfiqurasiya olunmayıb.",
	alreadyClosed: "Bu viktorina artıq bağlanıb.",
	alreadySubmitted: "Bu viktorinanı artıq təqdim etmisiniz.",
	bookNotFound: "Kitab tapılmadı",
	clearOnlyUnavailable: "Yalnız əlçatmaz viktorinalar təmizlənə bilər.",
	hasAttempts:
		"Bu viktorinada artıq cəhdlər var, ona görə silinə və ya yenidən yaradıla bilməz.",
	markReadFirst:
		"Viktorinanı həll etmək üçün bu kitabı oxunmuş kimi qeyd edin.",
	modelDeclined: "Model bu kitab üçün viktorina yazmaqdan imtina etdi.",
	noSubmission: "Təqdim edilmiş viktorina tapılmadı.",
	openBeforeSubmit: "Təqdim etməzdən əvvəl viktorinanı açın.",
	ownAnswersOnly: "Cavablarınıza yalnız siz baxa bilərsiniz.",
	questionNotFound: "Sual tapılmadı",
	quizNotFound: "Viktorina tapılmadı",
	reportTakersOnly: "Suala yalnız viktorinanı həll edənlər şikayət edə bilər.",
	signInToTake: "Viktorinanı həll etmək üçün daxil olun.",
	submitToSeeResults: "Nəticələri görmək üçün viktorinanı təqdim edin.",
	takeToSeeResults: "Nəticələri görmək üçün viktorinanı həll edin.",
	unavailable: "Viktorinalar hazırda əlçatan deyil.",
};
