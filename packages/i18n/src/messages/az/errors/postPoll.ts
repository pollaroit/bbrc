import type { Messages } from "../../shape";

export const postPollErrors: Messages["errors"]["postPoll"] = {
	notFound: "Sorğu tapılmadı",
	typeOptionFirst: "Əvvəlcə variantı yazın.",
	pickFirst: "Əvvəlcə bir şey seçin.",
	bookNotFound: "Kitab tapılmadı.",
	seriesNotFound: "Seriya tapılmadı.",
	authorNotFound: "Müəllif tapılmadı.",
	countryNotFound: "Ölkə tapılmadı.",
	memberNotFound: "Üzv tapılmadı.",
	memberNoPolls: "{name} sorğularda istifadə olunmağa icazə vermir.",
	duplicateOptions: "Variantlarınızdan ikisi eynidir.",
	ended: "Bu sorğu başa çatıb.",
	ownerOnlyAddOptions: "Variantları yalnız sorğunun sahibi əlavə edə bilər.",
	limitPerMember: "Ən çox {count} variant əlavə edə bilərsiniz.",
	optionsFull:
		"Üzvlər bu sorğunun icazə verdiyi bütün variantları əlavə ediblər.",
	maxOptions: "Sorğuda ən çox {max} variant ola bilər.",
	optionExists: "Bu variant sorğuda artıq var.",
	optionNotFound: "Variant tapılmadı.",
	optionLocked: "Bu variantı artıq silmək olmaz.",
	minOptions: "Sorğuda ən azı {min} variant olmalıdır.",
	votesLocked: "Bu sorğuda səsləri dəyişmək olmaz.",
	ownerOnlyChange: "Bu sorğunu yalnız sahibi dəyişə bilər.",
	typeLocked:
		"İnsanlar səs verdikdən sonra sorğunun növünü və seçim limitlərini dəyişmək olmaz.",
	deadlineLaterOnly:
		"İnsanlar səs verdikdən sonra son tarix yalnız irəli çəkilə bilər.",
	resultsNeedDeadline:
		"Nəticələri son tarixdən sonra göstərmək üçün son tarix olmalıdır.",
	privacyOnlyStricter:
		"İnsanlar artıq cari məxfilik altında səs veriblər, ona görə də o yalnız daha məxfi ola bilər.",
	problem: {
		pickOnce: "Hər variantı yalnız bir dəfə seçin.",
		optionNotOnPoll: "Həmin variantlardan biri bu sorğuda yoxdur.",
		pickOne: "Bir variant seçin.",
		pickAtLeast: "Ən azı {count} variant seçin.",
		pickAtMost: "Ən çox {count} variant seçin.",
		rankAtLeast: "Ən azı {count} variantı sıralayın.",
		rankAtMost: "Ən çox {count} variantı sıralayın.",
		addMinOptions: "Ən azı {min} variant əlavə edin.",
		tooManyOptions: "Sorğuda ən çox {max} variant ola bilər.",
		choicesOrder: "Ən az seçim ən çox seçimdən böyük ola bilməz.",
		choicesOverOptions: "Üzvlər sorğudakından çox variant seçə bilməz.",
		resultsNeedDeadline:
			"Nəticələri son tarixdən sonra göstərmək üçün son tarix olmalıdır.",
		deadlineTooSoon: "Son tarix ən azı {min} dəqiqə sonra olmalıdır.",
		deadlineTooFar: "Son tarix ən çox {max} gün sonra ola bilər.",
		memberLimitsMissing:
			"Hər üzvün və hamının birlikdə neçə variant əlavə edə biləcəyini təyin edin.",
		memberLimitOverTotal: "Hər üzvün limiti ümumi limitdən yüksək ola bilməz.",
		optionsOverLimit:
			"Sizin variantlarınız və üzvlərin əlavə edə biləcəyi variantlar birlikdə {max} limitini keçə bilməz.",
	},
};
