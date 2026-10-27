import type { Messages } from "../shape";

export const validation: Messages["validation"] = {
	readDates: {
		dayNeedsMonth: "Gündən əlavə ayı da seçin.",
		invalidDay: "Bu gün həmin ayda mövcud deyil.",
		endBeforeStart: "Bitmə tarixi başlama tarixindən əvvəl ola bilməz.",
	},
	readFinish: {
		monthAndYearTogether: "Bitirmə ayını və ilini birlikdə seçin.",
	},
	rating: {
		halfSteps: "Reytinqi 0-dan 5-dək yarım ulduz addımları ilə seçin.",
	},
	ratingDefinition: {
		empty: "Nəsə yazın və ya susmaya görə olana qaytarın.",
		tooLong: "{max} simvoldan çox olmasın.",
	},
	profile: {
		websiteUrl: "https:// ilə başlayan sayt ünvanı daxil edin.",
		bioTooLong: "Bioqrafiya ən çox {max} simvol ola bilər.",
		unknownGenre: "Belə janr yoxdur.",
		unknownSubgenre: "Belə alt janr yoxdur.",
		subgenreNeedsGenre: "Alt janrları seçməzdən əvvəl janr seçin.",
		unknownSocialSite: "Bu sayt dəstəklənmir.",
		socialAlreadyAdded: "{site} artıq əlavə olunub.",
		socialInvalidUrl:
			"Etibarlı {site} profil ünvanı daxil edin, məsələn: {example}.",
	},
	goal: {
		scopeFiltersWithAllBooks:
			"Məqsəd bütün kitabları əhatə edirsə, filtrləri silin.",
		authorsOrCountries: "Müəllifləri və ya ölkələri seçin, hər ikisini yox.",
		selectAuthor: "Ən azı bir müəllif seçin.",
		invalidAuthor: "Seçilmiş müəlliflərdən biri etibarsızdır.",
		selectCountry: "Ən azı bir ölkə seçin.",
		yearOnly: "Məqsəd yalnız {min} və ya {max} üçün qoyula bilər.",
	},
	edition: {
		invalidIsbn: "Bu, etibarlı ISBN deyil.",
	},
};
