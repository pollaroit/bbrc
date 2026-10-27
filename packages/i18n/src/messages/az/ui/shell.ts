import type { Messages } from "../../shape";

export const shell: Messages["shell"] = {
	header: {
		nav: {
			library: "Kitabxana",
			sittings: "Oxuma sessiyaları",
			leaderboard: "Reytinq cədvəli",
		},
		signIn: "Daxil ol",
		getStarted: "Başla",
		read: "Oxu",
		signOut: "Çıx",
		signOutFailed: "Çıxış alınmadı",
	},
	userMenu: {
		title: "Siz",
		yourActivity: "Fəaliyyətiniz",
		account: "Hesab",
		profile: "Profil",
		myReads: "Oxuduqlarım",
		myPosts: "Paylaşımlarım",
		myFeedbacks: "Rəylərim",
		myShelves: "Rəflərim",
		myGoals: "Məqsədlərim",
		myStats: "Statistikam",
		settings: "Parametrlər",
		blockedWorks: "Bloklanmış əsərlər",
		dashboard: "İdarə paneli",
		factReplays: "Fakt təkrarlarım",
	},
	browse: {
		title: "Kəşf et",
		later: "Tezliklə",
		sections: {
			catalog: "Kataloq",
			club: "Klub",
		},
		items: {
			authors: {
				label: "Müəlliflər",
				description: "Klub kataloqundakı yazıçılar",
			},
			series: {
				label: "Seriyalar",
				description: "Çoxcildli oxuma ardıcıllığı",
			},
			shelves: {
				label: "Rəflər",
				description: "Üzvlərin hazırladığı siyahılar",
			},
			people: {
				label: "İnsanlar",
				description: "Klubdakı hər kəs",
			},
			achievements: {
				label: "Nailiyyətlər",
				description: "Qazana biləcəyiniz nişanlar",
			},
			sittings: {
				label: "Oxuma sessiyaları",
				description: "Klubun oxuma mərhələləri",
			},
			leaderboard: {
				label: "Reytinq cədvəli",
				description: "XP, oxunanlar və sıralama",
			},
			reels: {
				label: "Lentlər",
				description: "Klubdan qısa fakt təkrarları",
			},
		},
		placeholders: {
			clubStats: {
				label: "Klub statistikası",
				description: "Tezliklə",
			},
		},
	},
	create: {
		title: "Yarat",
		items: {
			post: {
				label: "Paylaşım yarat",
				description: "Klub lentində paylaşın",
			},
			shelf: {
				label: "Rəf yarat",
				description: "Açıq siyahı hazırlayın",
			},
			goal: {
				label: "Məqsəd əlavə et",
				description: "Oxuma hədəfini izləyin",
			},
			book: {
				label: "Kitab əlavə et",
				description: "Open Library-dən",
			},
			author: {
				label: "Müəllif əlavə et",
				description: "Admin kataloqu",
			},
			series: {
				label: "Seriya əlavə et",
				description: "Admin kataloqu",
			},
			requestBook: {
				label: "Kitab sorğusu",
				description: "Kitabxana üçün təklif edin",
			},
			sitting: {
				label: "Sessiya başlat",
				description: "Yeni oxuma mərhələsi açın",
			},
		},
	},
};
