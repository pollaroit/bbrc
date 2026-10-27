import type { Messages } from "../../shape";

export const readErrors: Messages["errors"]["read"] = {
	bookNotFound: "Kitab tapılmadı",
	editionOfAnotherBook: "Bu nəşr başqa kitaba aiddir.",
	finishDateIncomplete: "Bitirmə ayı və ili birlikdə göstərilməlidir",
	memberNotFound: "Üzv tapılmadı",
	notFound: "Oxunma qeydi tapılmadı",
	signInForMutualReads: "Ortaq oxunuşlara görə süzmək üçün daxil olun.",
};
