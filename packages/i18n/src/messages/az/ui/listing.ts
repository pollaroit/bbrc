import type { Messages } from "../../shape";

export const listing: Messages["listing"] = {
	filters: {
		clear: "Süzgəcləri təmizlə",
		clearAll: "Bütün süzgəcləri təmizlə",
		description: "Nəticələri süzgəc və aralıqlarla daralt.",
		title: "Süzgəclər",
	},
	multi: {
		authors: {
			aria: "Siyahıda müəllif axtar",
			clear: "Müəllifləri təmizlə",
			legend: "Müəlliflər",
			noneFilters: "Cari süzgəclərə uyğun müəllif yoxdur.",
			noneSearch: "Axtarışınıza uyğun müəllif yoxdur.",
			placeholder: "Müəllif axtar…",
		},
		books: {
			aria: "Siyahıda kitab axtar",
			clear: "Kitabları təmizlə ({count})",
			legend: "Kitablar",
			none: "Uyğun tamamlanmış kitab yoxdur.",
			placeholder: "Tamamlanmış kitab axtar…",
			search: "Kitab axtar",
		},
		clearAll: "Hamısını təmizlə",
		countries: {
			clear: "Ölkələri təmizlə",
			legend: "Ədəbi mənşə",
			noneCatalog: "Cari kataloq süzgəclərinə uyğun ölkə yoxdur.",
			placeholder: "Ölkə axtar…",
			search: "Ölkə axtar",
		},
		feedbacks: {
			aria: "Siyahıda rəy axtar",
			legend: "Rəylər",
			none: "Uyğun rəy yoxdur. Kitab adı, rəy mətni və ya @istifadəçi adı ilə cəhd edin.",
			placeholder: "Rəy, kitab, müəllif və ya ünvana görə axtar…",
		},
		members: {
			aria: "Siyahıda üzv axtar",
			legend: "Üzvlər",
			placeholder: "Ad və ya istifadəçi adına görə axtar…",
		},
		nationality: {
			legend: "Vətəndaşlıq",
			noneFilters: "Cari müəllif süzgəclərinə uyğun ölkə yoxdur.",
		},
		posts: {
			aria: "Siyahıda paylaşım axtar",
			legend: "Paylaşımlar",
			none: "Uyğun paylaşım yoxdur. Mətn və ya @istifadəçi adı ilə cəhd edin.",
			placeholder: "Mətn, ünvan və ya müəllifə görə axtar…",
		},
		selected: "{legend} ({count} seçilib)",
	},
	range: {
		anyTime: "İstənilən vaxt",
		apply: "Tətbiq et",
		cancel: "Ləğv et",
		dateRange: "Tarix aralığı",
		field: "Sahə",
		max: "Maks",
		maximum: "Maksimum",
		min: "Min",
		minimum: "Minimum",
	},
	ratingSlider: {
		any: "İstənilən qiymət",
		between: "{low} ilə {high} ulduz arası",
		single: "{rating} ulduz",
	},
	search: {
		placeholder: "Axtar…",
	},
	sort: {
		asc: "Artan",
		by: "Sırala",
		desc: "Azalan",
		list: "Siyahını sırala",
	},
};
