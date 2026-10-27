import type { Messages } from "../../shape";

export const bookErrors: Messages["errors"]["book"] = {
	notFound: "Kitab tapılmadı.",
	signInToFilterReads:
		"Öz oxuduqlarınıza görə süzgəcdən keçirmək üçün daxil olun.",
	noBookMatchesFilters: "Bu süzgəclərə uyğun kitab yoxdur.",
	authorGone: "Müəlliflərdən biri artıq mövcud deyil. Onu yenidən seçin.",
	alreadyInCatalog: "Bu Open Library ID-si ilə kitab artıq kataloqdadır.",
	removeOnlyWishlist:
		"Yalnız istək siyahısındakı kitablar silinə bilər. Statusu dəyişin və ya kitabı kataloqda saxlayın.",
	slugFailed: "Bu kitab üçün veb ünvan yaradıla bilmədi. Fərqli ad sınayın.",
	coverNotUploaded: "Bu üz qabığı burada yüklənməyib. Onu yenidən yükləyin.",
	coverIdFailed: "Üz qabığı yadda saxlanmadı. Yenidən cəhd edin.",
	notOnBlockList: "Bu əsər bloklama siyahısında deyil.",
	aiNotAvailable: "Süni intellekt təklifləri hazırda əlçatan deyil.",
	aiFailed: "Təklif hazırlana bilmədi. Bir az sonra yenidən cəhd edin.",
	readAfterDuplicates: "“Əvvəl oxunmalı” kitablar təkrarlanmamalıdır.",
	readAfterNotFound:
		"“Əvvəl oxunmalı” kitablardan biri və ya bir neçəsi kataloqda tapılmadı.",
	readAfterSelf: "Kitab özünü əvvəlcədən oxunmalı kimi tələb edə bilməz.",
	readAfterCycle:
		"Bu oxuma ardıcıllığı dövrə yaradardı. Seriyadakı əvvəlki kitabları yoxlayın.",
	eligibility: {
		cannotFavorite: "Bu kitabı hazırda sevimlilərə əlavə edə bilməzsiniz.",
		markRead:
			"Bu kitabı səhifəsində oxunmuş kimi qeyd edin və ya bu kitabı seçən oturumda bitirin.",
		markCompleted:
			"Həmin oturumun səhifəsində özünüzü tamamlamış kimi qeyd edin və ya kitabı səhifəsində oxunmuş kimi qeyd edin.",
	},
};
