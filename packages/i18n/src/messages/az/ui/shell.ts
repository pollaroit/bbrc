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
	mobile: {
		home: "Ana səhifə",
		mainNav: "Əsas",
		browseAria: "Klub bölmələrinə bax",
		accountAria: "Hesab menyusu",
		you: "Siz",
	},
	notifications: {
		title: "Bildirişlər",
		titleWithUnread: "Bildirişlər, {count} oxunmamış",
		overNine: "9+",
		markAllRead: "Hamısını oxunmuş et",
		loading: "Yüklənir…",
		empty: "Hələ bildiriş yoxdur.",
		settings: "Bildiriş parametrləri",
	},
	pwa: {
		offline:
			"Oflaynsınız — saxlanmış məzmun göstərilir. Şəbəkə tələb edən əməliyyatlar əlçatmazdır.",
		installLabel: "BBRC-ni quraşdır",
		installTitle: "BBRC-ni ana ekrana əlavə edin",
		installIos:
			"<share></share> Paylaş düyməsinə toxunun, sonra tam ekranlı tətbiq üçün “Ana ekrana əlavə et” seçin.",
		installOther:
			"Daha sürətli giriş, yeniləmək üçün çəkmə və sabit nişan paneli üçün quraşdırın.",
		install: "Quraşdır",
		notNow: "İndi yox",
		dismissForever: "Quraşdırma təklifini həmişəlik bağla",
		updateReady: "Yeniləmə hazırdır",
		updateDescription:
			"Ən son versiyadan istifadə üçün səhifəni yenidən yükləyin.",
		reload: "Yenidən yüklə",
		systemAlert:
			"{count, plural, one {Zəng menyusunda yeni bildirişiniz var.} other {Zəng menyusunda # oxunmamış bildirişiniz var.}}",
	},
	search: {
		title: "Klubda axtar",
		description:
			"Kitab, üzv, paylaşım və daha çoxunu tapın və ya səhifəyə keçin",
		placeholder: "Axtarın və ya əmr yazın…",
		triggerMobile: "Axtar",
		triggerDesktop: "Klubda axtar",
		goTo: "Keç",
		results: "Nəticələr",
		recent: "Son baxılanlar",
		clear: "Təmizlə",
		signInToUse: "Bunun üçün daxil olun",
		moreHidden: "daha {count} nəticə, daraltmaq üçün yazmağa davam edin",
		openPage: "Konkret səhifəni aç",
		pagesChip: "səhifələr",
		membersHint: "Yalnız üzvləri axtarmaq üçün ad və ya istifadəçi adı yazın.",
		searching: "Axtarılır",
		noMatches: "Uyğun nəticə yoxdur",
		noMatchesBody:
			"<hl>“{query}”</hl> üçün heç nə tapılmadı. Kitab adı, müəllif və ya @istifadəçi adı yoxlayın.",
		noCommand: "Əmr tapılmadı",
		noCommandBody:
			"Sizin üçün <hl>“{query}”</hl> ilə başlayan əmr yoxdur. Hər şeyi axtarmaq üçün <code>{symbol}</code> işarəsini silin.",
		footerWithQuery: "Bütün klubdan əmrlər və nəticələr",
		footerIdle: "Klub üzrə axtarış",
		keys: {
			move: "hərəkət",
			pages: "səhifələr",
			open: "aç",
			close: "bağla",
		},
		idle: {
			commands:
				"Yoxlayın: <code>{settings}</code>, <code>{create}</code> və ya <code>{admin}</code>",
			symbols:
				"<code>{at}</code> üzvləri axtarır, <code>{gt}</code> yalnız əmrləri göstərir",
			random:
				"<code>{example}</code> oxumadığınız, 400 səhifədən az bir kitab seçir",
		},
		toasts: {
			signInToFilter: "Oxuduqlarınıza görə filtr üçün daxil olun (ir / nr).",
			picking: "Kitab seçilir…",
			pickedOf: "{title} (1 / {matched})",
			couldNotPick: "Kitab seçilmədi.",
		},
		types: {
			book: "Kitab",
			user: "Üzv",
			post: "Paylaşım",
			feedback: "Rəy",
			comment: "Şərh",
			shelf: "Rəf",
			document: "Sənəd",
			author: "Müəllif",
			goal: "Məqsəd",
			series: "Seriya",
		},
		pages: {
			book: {
				about: "Haqqında",
				editions: "Nəşrlər",
				documents: "Sənədlər",
				shelves: "Rəflər",
				reviews: "Rəylər",
				reads: "Oxunanlar",
				sittings: "Oxuma sessiyaları",
				stats: "Statistika",
				favorites: "Sevimlilər",
				quizzes: "Viktorinalar",
				more: "Daha çox oxumaq üçün",
				insights: "Təhlillər",
			},
			user: {
				sittings: "Oxuma sessiyaları",
				reads: "Oxunanlar",
				quizzes: "Viktorinalar",
				posts: "Lent",
				feedbacks: "Rəylər",
				shelves: "Rəflər",
				goals: "Məqsədlər",
				mentions: "Qeydlər",
				achievements: "Nailiyyətlər",
				stats: "Statistika",
				xp: "XP",
				rp: "RP",
			},
			author: {
				books: "Kitablar",
				about: "Haqqında",
				more: "Oxşar müəlliflər",
				reads: "Oxunanlar",
				reviews: "Rəylər",
				posts: "Paylaşımlar",
				sittings: "Oxuma sessiyaları",
				favorites: "Sevimlilər",
				shelves: "Rəflər",
				series: "Seriyalar",
				followers: "İzləyicilər",
				stats: "Statistika",
			},
		},
		commands: {
			profile: {
				label: "Profilim",
				description: "Profilinizi açın",
			},
			read: {
				label: "Oxu",
				description: "Oxuduğunuz oxuma sessiyasına keçin",
			},
			random: {
				label: "Təsadüfi kitab",
				description: "Mənim üçün kitab seç. Filtrlər əlavə edin: :nr:p<400",
			},
			settings: {
				label: "Parametrlər",
				description: "Hesab parametrləriniz",
			},
			authors: {
				label: "Müəlliflər",
				description: "Klub kataloqundakı yazıçılar",
			},
			books: {
				label: "Kitablar",
				description: "Klub kitabxanası. Filtrlər əlavə edin: :p<300:a[orwell]",
			},
			shelves: {
				label: "Rəflər",
				description: "Üzvlərin hazırladığı siyahılar",
			},
			series: {
				label: "Seriyalar",
				description: "Çoxcildli oxuma ardıcıllığı",
			},
			people: {
				label: "İnsanlar",
				description: "Klubdakı hər kəs",
			},
			sittings: {
				label: "Oxuma sessiyaları",
				description: "Klubun oxuma mərhələləri",
			},
			achievements: {
				label: "Nailiyyətlər",
				description: "Qazana biləcəyiniz nişanlar",
			},
			reels: {
				label: "Lentlər",
				description: "Klubdan qısa fakt təkrarları",
			},
			goals: {
				label: "Məqsədlərim",
				description: "Oxuma məqsədləriniz",
			},
			leaderboard: {
				label: "Reytinq cədvəli",
				description: "XP, oxunanlar və sıralama",
			},
			createPost: {
				label: "Paylaşım yarat",
				description: "Yeni paylaşım yazın",
			},
			createShelf: {
				label: "Rəf yarat",
				description: "Yeni rəf başladın",
			},
			createGoal: {
				label: "Məqsəd yarat",
				description: "Oxuma məqsədi təyin edin",
			},
			createSitting: {
				label: "Sessiya yarat",
				description: "Yeni oxuma mərhələsi başladın",
			},
			add: {
				label: "Kitab əlavə et",
				description: "Kitabxanaya kitab əlavə edin",
			},
			request: {
				label: "Kitab sorğusu",
				description: "Adminlərdən kitab əlavə etməsini istəyin",
			},
			theme: {
				label: "Mövzunu dəyiş",
				description: "Açıq və tünd rejimi dəyişin",
			},
			signout: {
				label: "Çıx",
				description: "Hesabınızdan çıxın",
			},
			signin: {
				label: "Daxil ol",
				description: "Hesabınıza daxil olun",
			},
			signup: {
				label: "Qeydiyyat",
				description: "Hesab yaradın",
			},
		},
		profileTabs: {
			sittings: {
				label: "Sessiyalarım",
				description: "Sessiyalar bölməsini açın",
			},
			reads: {
				label: "Oxuduqlarım",
				description: "Oxuduqlar bölməsini açın",
			},
			quizzes: {
				label: "Viktorinalarım",
				description: "Viktorinalar bölməsini açın",
			},
			posts: {
				label: "Lentim",
				description: "Lent bölməsini açın",
			},
			feedbacks: {
				label: "Rəylərim",
				description: "Rəylər bölməsini açın",
			},
			shelves: {
				label: "Rəflərim",
				description: "Rəflər bölməsini açın",
			},
			goals: {
				label: "Məqsədlərim",
				description: "Məqsədlər bölməsini açın",
			},
			achievements: {
				label: "Nailiyyətlərim",
				description: "Nailiyyətlər bölməsini açın",
			},
			stats: {
				label: "Statistikam",
				description: "Statistika bölməsini açın",
			},
			xp: {
				label: "XP tarixçəm",
				description: "XP tarixçəsi bölməsini açın",
			},
			rp: {
				label: "RP tarixçəm",
				description: "RP tarixçəsi bölməsini açın",
			},
		},
		boards: {
			xp: {
				label: "Reytinq cədvəli · XP",
				description: "XP üzrə ən yaxşı üzvlər",
			},
			rp: {
				label: "Reytinq cədvəli · Oxuma xalları",
				description: "Oxuma xalları üzrə ən yaxşı üzvlər",
			},
			reads: {
				label: "Reytinq cədvəli · Oxunanlar",
				description: "Oxunanlar üzrə ən yaxşı üzvlər",
			},
			posts: {
				label: "Reytinq cədvəli · Paylaşımlar",
				description: "Paylaşımlar üzrə ən yaxşı üzvlər",
			},
			participations: {
				label: "Reytinq cədvəli · İştiraklar",
				description: "İştiraklar üzrə ən yaxşı üzvlər",
			},
		},
		settingsPages: {
			profile: {
				label: "Profil parametrləri",
				description: "Ad, bioqrafiya, şəkil və keçidlər",
			},
			preferences: {
				label: "Üstünlüklər",
				description:
					"Görünüş, mətn ölçüsü, qoşulmalar, dəvətlər və başqalarının sizinlə edə biləcəkləri",
			},
			notifications: {
				label: "Bildiriş parametrləri",
				description: "Nə haqqında xəbər alırsınız",
			},
			sessions: {
				label: "Sessiya parametrləri",
				description: "Harada daxil olmusunuz",
			},
			accounts: {
				label: "Hesab parametrləri",
				description: "Bağlı hesablar",
			},
		},
		filters: {
			booksRead: "oxuduğum kitablar",
			booksUnread: "oxumadığım kitablar",
			any: "istənilən kitab",
			by: "müəllif: {authors}",
			or: "{a} və ya {b}",
			rangeBetween: "{min}–{max} {unit}",
			rangeMin: "{min}+ {unit}",
			rangeMax: "{max}-ə qədər {unit}",
			units: {
				pages: "səhifə",
				reads: "oxunma",
				reviews: "rəy",
				clubRating: "klub reytinqi",
			},
			publishedSame: "{year} nəşri",
			publishedBetween: "nəşr: {min}–{max}",
			publishedFrom: "{min} və ya sonra nəşr olunub",
			publishedUntil: "{max} və ya əvvəl nəşr olunub",
		},
	},
	error: {
		title: "Bu səhifədə nəsə səhv getdi",
		description:
			"Əməliyyatınız tamamlanmış ola bilər. Yoxlamaq üçün bölməni yenidən yükləyin.",
		retry: "Yenidən cəhd et",
	},
	offline: {
		title: "Bağlantı yoxdur",
		body: "Əvvəl açdığınız səhifələr hələ də işləyə bilər. Yeni hər şey şəbəkə tələb edir.",
		tryAgain: "Yenidən cəhd et",
		goHome: "Ana səhifəyə get",
	},
	home: {
		meta: {
			title: "Lent",
			description: "Klubun fəaliyyəti və hazırkı oxuma sessiyası bir baxışda.",
		},
		title: "Lent",
		subtitle: "Klubun fəaliyyəti və hazırkı oxuma sessiyası bir baxışda.",
	},
	ongoing: {
		pollCloses: "Səsvermə bitir",
		readingDeadline: "Oxuma son tarixi",
		participants: "İştirakçılar",
		voteInPoll: "Səsvermədə iştirak et",
		openSitting: "Oxuma sessiyasını aç",
		openSittingAria: "Oxuma sessiyasını aç: {title}",
		sittingInProgress: "Oxuma sessiyası davam edir",
		seeParticipants:
			"{count, plural, one {# iştirakçıya bax} other {# iştirakçıya bax}}",
	},
	trending: {
		title: "Bu həftə ən çox baxılanlar",
		views: "{count, plural, one {# baxış} other {# baxış}}",
	},
	theme: {
		toggle: "Açıq və tünd mövzunu dəyiş",
		tooltip: "Mövzunu dəyiş",
	},
	ui: {
		infiniteScroll: {
			emptyTitle: "Hələ burada heç nə yoxdur",
			errorTitle: "Nəsə səhv getdi",
			errorFallback: "Məzmun yüklənmədi.",
			retry: "Yenidən cəhd et",
		},
		dateSelector: {
			selectDate: "Tarix seçin",
			apply: "Tətbiq et",
			cancel: "Ləğv et",
			clear: "Təmizlə",
			today: "Bu gün",
			is: "dəqiq",
			before: "əvvəl",
			after: "sonra",
			between: "arasında",
			day: "Gün",
			month: "Ay",
			quarter: "Rüb",
			halfYear: "Yarımil",
			year: "İl",
			quarterShort: "{n}-ci rüb",
			halfYearShort: "{n}-ci yarımil",
			placeholder: "Tarix seçin...",
			rangePlaceholder: "Tarix aralığı seçin...",
		},
		labels: {
			close: "Bağla",
			loading: "Yüklənir",
			toggleSidebar: "Yan paneli aç/bağla",
			scrollToEnd: "Sona qədər sürüşdür",
			scrollToStart: "Başlanğıca qədər sürüşdür",
		},
		queryError: {
			prefix: "Xəta: {message}",
			retry: "yenidən cəhd et",
		},
	},
};
