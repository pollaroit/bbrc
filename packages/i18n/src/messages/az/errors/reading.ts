import type { Messages } from "../../shape";

export const readingErrors: Messages["errors"]["reading"] = {
	alreadyFinished: "Bu kitab artıq bitib.",
	alreadyRead: "Bu kitabı artıq oxumusunuz.",
	bookNotFound: "Kitab tapılmadı",
	editionOfAnotherBook: "Bu nəşr başqa kitaba aiddir.",
	finishedCannotBeDropped: "Bitmiş kitabdan imtina etmək olmaz.",
	memberNotFound: "Üzv tapılmadı",
	notFound: "Oxuma tapılmadı",
	pagesNeeded: "Səhifə üzrə izləmək üçün səhifə sayını əlavə edin.",
	sittingNotFound: "Oxuma sessiyası tapılmadı",
	tooManyActive:
		"Eyni anda {max} kitab oxuya bilərsiniz. Əvvəlcə birini bitirin və ya buraxın.",
	wishlistFull: "İstək siyahınıza ən çox {max} kitab əlavə edilə bilər.",
};
