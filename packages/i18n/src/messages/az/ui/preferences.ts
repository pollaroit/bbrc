import type { Messages } from "../../shape";

export const preferences: Messages["preferences"] = {
	page: {
		metaTitle: "Üstünlüklər",
		metaDescription:
			"BBRC üçün mövzu, şriftlər, mətn ölçüsü, oxuma və görünüş seçimləri.",
		title: "Üstünlüklər",
		intro:
			"BBRC-nin görünüşünü və oxunuşunu özünüzə uyğunlaşdırın: rənglər, şriftlər, mətn ölçüsü, hərəkət və tarixlərin göstərilməsi.",
	},
	common: {
		saveFailed: "Bu parametri yadda saxlamaq mümkün olmadı.",
		signInToChange: "Bunu dəyişmək üçün daxil olun.",
	},
	signedOutNotice:
		"Daxil olmamısınız, ona görə bu parametrlər bu cihazda qalır. Hər yerdə saxlamaq üçün daxil olun.",
	sectionsLabel: "Üstünlük bölmələri",
	sections: {
		appearance: "Görünüş",
		language: "Dil",
		accessibility: "Əlçatanlıq",
		reading: "Oxuma",
		"reading-privacy": "İstək siyahısı",
		ratings: "Qiymətlər",
		shelves: "Rəflər",
		polls: "Səsvermələr",
		mentions: "Qeydlər",
		compare: "Müqayisə",
		posts: "Paylaşımlar",
		sittings: "Oxuma sessiyaları",
		time: "Vaxt və format",
		search: "Axtarış",
		sync: "Sinxronlaşdırma və sıfırlama",
	},
	appearance: {
		title: "Görünüş",
		description:
			"Klubun necə görünəcəyini seçin. Dəyişikliklər dərhal tətbiq olunur.",
		mode: "Rejim",
		modeHint: "Cihazınıza uyğun olsun və ya həmişə açıq ya da tünd olsun.",
		modeLocked:
			"{palette} palitrası yalnız {mode} rejimdə işləyir. Seçmək üçün başqa palitra seçin.",
		modeSystem: "Sistem",
		modeLight: "Açıq",
		modeDark: "Tünd",
		palette: "Palitra",
		paletteHint:
			"Saytda istifadə olunan rənglər. Çoxu açıq və tünd rejimdə gəlir.",
		paletteLabel: "{name} palitrası",
		lightOnly: "yalnız açıq",
		darkOnly: "yalnız tünd",
		searchPalettes: "Palitraları axtar…",
		searchPalettesLabel: "Palitraları axtar",
		noPaletteMatches: "“{query}” üçün palitra tapılmadı.",
		paletteCredit:
			"Palitraların çoxu <link>tweakcn</link> hazır şablonlarıdır, mətnin rahat oxunması üçün yüngülcə dəyişdirilib.",
		bodyFont: "Əsas şrift",
		bodyFontHint:
			"Mətnin çox hissəsi üçün istifadə olunur. Standart Geist Mono klubun öz görünüşüdür.",
		headingFont: "Başlıq şrifti",
		headingFontHint: "Başlıqlar və bölmə başlıqları.",
		readingFont: "Oxu şrifti",
		readingFontHint:
			"Rəylər, paylaşımlar, şərhlər və bioqrafiyalar, yəni uzun mətn oxuduğunuz yerlər.",
		sameAsBody: "Əsas şriftlə eyni",
		sameAsBodyLabel: "Əsas şriftlə eyni",
		followsBody: "Əsas şrifti izləyir",
		latinOnly: "yalnız latın",
		fontNotes: {
			"geist-mono": "Klubun öz görünüşü",
			geist: "Təmiz sansserif",
			inter: "Neytral və tanış",
			"plex-sans": "Texniki, dostcasına",
			atkinson: "Rahat oxu üçün hazırlanıb",
			literata: "Kitablar üçün hazırlanmış serif",
			"source-serif": "Klassik, möhkəm serif",
			"space-grotesk": "Xarakterli həndəsi şrift",
			bricolage: "Yoğun və oynaq",
			fraunces: "Yumşaq, köhnə üslublu serif",
			playfair: "Zərif, yüksək kontrastlı",
			"system-sans": "Cihazınızın öz şrifti",
			"system-serif": "Cihazınızın öz serif şrifti",
		},
		textSize: "Mətn ölçüsü",
		textSizeHint:
			"Hər yerdə mətni böyüdür və ya kiçildir. Yerləşdirmə dəyişmir.",
		textSizes: {
			sm: "Kiçik",
			md: "Standart",
			lg: "Böyük",
			xl: "Çox böyük",
		},
		lineSpacing: "Sətir aralığı",
		lineSpacingHint:
			"Sətirlər arasında daha çox boşluq uzun mətni izləməyi asanlaşdıra bilər.",
		lineSpacings: {
			compact: "Sıx",
			normal: "Standart",
			relaxed: "Geniş",
		},
		corners: "Künclər",
		cornersHint:
			"Qutuların, düymələrin və sahələrin nə qədər yumru olduğu. Yoxdur klubun iti görünüşüdür.",
		cornersOption: "{size} künclər",
		radii: {
			none: "Yoxdur",
			xs: "XS",
			sm: "SM",
			md: "MD",
			lg: "LG",
			xl: "XL",
		},
		livePreview: "Canlı önbaxış",
		previewTitle: "Beloved, Toni Morrison",
		previewText:
			"“Definitions belonged to the definers, not the defined.” Yaddaş, azadlıq və daşıdıqlarımız haqqında hekayə. Yuxarıda palitra və ya şrifti seçin, bu kart sizinlə birlikdə dəyişəcək.",
		previewMarkRead: "Oxunmuş kimi işarələ",
		previewAddToShelf: "Rəfə əlavə et",
		previewCompleted: "Tamamlanıb",
		previewReading: "Oxunur",
		previewWishlist: "İstək siyahısı",
		previewLiked: "Bəyənilib",
		previewMuted:
			"Sönük mətn belə görünür. 5 ulduzdan {rating} · {pages, plural, one {# səhifə} other {# səhifə}} · {reads, plural, one {# oxuma} other {# oxuma}}.",
	},
	accessibility: {
		title: "Əlçatanlıq",
		description: "Saytı daha sakit və oxumaq üçün rahat edin.",
		motion: "Hərəkət",
		motionHint: "Bəyənmə ürəyi və sürüşən panellər kimi animasiyalar.",
		motionSystem: "Cihazıma uyğun",
		motionReduce: "Azalt",
		motionFull: "Tam",
		contrast: "Yüksək kontrast",
		contrastHint:
			"Hər palitrada daha güclü sərhədlər və daha tünd ikinci dərəcəli mətn.",
		easyReading: "Rahat oxu şablonu",
		easyReadingHint:
			"Atkinson Hyperlegible şrifti, daha böyük mətn və daha geniş sətirlər.",
		easyReadingApplied: "Rahat oxu şablonu tətbiq olundu",
		applyPreset: "Şablonu tətbiq et",
	},
	reading: {
		title: "Oxuma",
		description:
			"Rəylərin, spoylerlərin və oxumaların sizin üçün necə işlədiyi.",
		spoilers: "Spoylerlər",
		spoilersHint: "Spoyler kimi işarələnmiş rəylər, paylaşımlar və şərhlər.",
		spoilersHide: "Toxunana qədər gizlət",
		spoilersShow: "Həmişə göstər",
		defaultDate: "Kitabı oxunmuş kimi işarələyəndə bu günün tarixini yaz",
		defaultDateHint: "Hər dəfə ay və ili yenə də dəyişə bilərsiniz.",
	},
	privacy: {
		title: "İstək siyahısı və oxuduqlarım",
		description:
			"İstək siyahınızı və hazırda oxuduğunuz kitabları kimlərin görə biləcəyi.",
		wishlistPrivate: "İstək siyahımı gizli saxla",
		wishlistPrivateHint:
			"Aktiv: istək siyahınızı yalnız siz aça bilərsiniz. Digərləri yalnız kitabı neçə üzvün istədiyini görür, kimin istədiyini yox. Qeyri-aktiv: hər kəs aça bilər.",
		showReading: "Oxuduqlarımı göstər",
		showReadingHint:
			"Üzvlər cari kitablarınızı profilinizdə və hər kitabın Oxuma səhifəsində görə bilər. Qeyri-aktiv: hələ də cəmlərə daxilsiniz, lakin adınız göstərilmir.",
		showProgress: "Oxuma irəliləyişimi göstər",
		showProgressHint:
			"Aktiv: digərləri nə qədər irəlilədiyinizi görür. Qeyri-aktiv: yalnız kitabı oxuduğunuzu görürlər.",
	},
	shelves: {
		title: "Rəflər",
		description: "Digər üzvlərin rəflərdə sizinlə necə işləyə biləcəyi.",
		allowInvites: "İnsanlara məni rəflərdə əməkdaşlığa dəvət etməyə icazə ver",
		allowInvitesHint:
			"Bu söndürülübsə, heç kim sizi dəvət edə bilməz. Artıq əməkdaşlıq etdiyiniz rəflərə təsir etmir.",
	},
	polls: {
		title: "Səsvermələr",
		description: "Digər üzvlərin sizi səsvermələrinə necə daxil edə biləcəyi.",
		allowOption:
			"İnsanlara məni səsvermələrdə seçim kimi istifadə etməyə icazə ver",
		allowOptionHint:
			"Bu söndürülübsə, heç kim sizi səsvermə seçimi kimi seçə bilməz. Sizi artıq daxil edən səsvermələr olduğu kimi qalır.",
	},
	mentions: {
		title: "Qeydlər",
		description:
			"Digər üzvlərin paylaşımlarda, şərhlərdə və rəylərdə sizi @ ilə qeyd edə bilib-bilməyəcəyi.",
		allow: "Başqalarının məni qeyd etməsinə icazə ver",
		allowHint:
			"İnsanlar @ yazanda görünməməyiniz üçün söndürün. Mövcud qeydlər qalır.",
	},
	compare: {
		title: "Müqayisə",
		description:
			"Digər üzvlərin oxumalarını sizinkilərlə müqayisə edə bilib-bilməyəcəyi.",
		allow: "Başqalarının mənimlə müqayisə etməsinə icazə ver",
		allowHint:
			"Digər üzvlər oxumalarını sizinkilərlə müqayisə edə bilər. Adminlər həmişə müqayisə edə bilər.",
	},
	posts: {
		title: "Paylaşımlar",
		description:
			"Digər üzvlərin sizi öz paylaşımlarında necə qeyd edə biləcəyi.",
		allowAttach: "İnsanlara məni paylaşımlarına əlavə etməyə icazə ver",
		allowAttachHint:
			"Bu söndürülübsə, heç kim profilinizi paylaşıma əlavə edə bilməz. Sizi artıq daxil edən paylaşımlar olduğu kimi qalır.",
	},
	sittings: {
		title: "Oxuma sessiyaları",
		description: "Təşkilatçıların sizi oxuma sessiyasına necə gətirə biləcəyi.",
		allowAutoAdd:
			"Təşkilatçılara məni oxuma sessiyalarına əlavə etməyə icazə ver",
		allowAutoAddHint:
			"Bu söndürülübsə, təşkilatçılar sizi birbaşa əlavə edə bilməz. Əvəzində dəvət edə bilərlər və qəbul edib-etməməyi siz seçirsiniz. Yenə də özünüz qoşula bilərsiniz.",
		allowInvites:
			"Təşkilatçılara məni oxuma sessiyalarına dəvət etməyə icazə ver",
		allowInvitesHint:
			"Bu söndürülübsə, təşkilatçılar sizə dəvət də göndərə bilməz. Yenə də dəvət keçidi və ya Qoşul düyməsi ilə qoşula bilərsiniz.",
	},
	time: {
		title: "Vaxt və format",
		description: "Son tarixlərin və tarixlərin necə yazıldığı.",
		zone: "Saat qurşağı",
		zoneHint:
			"Son tarixlər klub vaxtı ilə ({zone}) təyin olunur. Onları cihazınızın vaxtı ilə görmək üçün seçin.",
		zoneClub: "Klub vaxtı",
		zoneDevice: "Cihazımın vaxtı",
		clock: "Saat",
		clockAuto: "Cihazıma uyğun",
		clock12: "12 saatlıq",
		clock24: "24 saatlıq",
		example: "Nümunə: səsvermə <date></date> bağlanır",
	},
	search: {
		title: "Axtarış",
		description:
			"Axtarış bu cihazda açdığınız son bir neçə şeyi yadda saxlayır.",
		clear: "Son axtarışları təmizlə",
		cleared: "Son axtarışlar təmizləndi",
		none: "Hazırda heç nə saxlanmayıb.",
		saved:
			"{count, plural, one {Bu cihazda # saxlanıb.} other {Bu cihazda # saxlanıb.}}",
	},
	sync: {
		title: "Sinxronlaşdırma və sıfırlama",
		description: "Seçimləriniz dərhal bu cihazda saxlanır.",
		deviceOnly: "Bunları yalnız bu cihazda saxla",
		deviceOnlyOn: "Digər cihazlar öz parametrlərini saxlayır.",
		deviceOnlyOff: "Parametrləriniz daxil olduğunuz hər cihaza sizinlə gedir.",
		deviceOnlySignedOut:
			"Parametrlərinizin digər cihazlara da keçməsi üçün daxil olun.",
		reset: "Standarta sıfırla",
		confirmReset: "Bəli, hamısını sıfırla",
		keep: "Parametrlərimi saxla",
		resetDone: "Üstünlüklər standarta sıfırlandı",
	},
	ratingsEditor: {
		saveFailed: "Yadda saxlamaq mümkün olmadı. Yenidən cəhd edin.",
		title: "Qiymət tərifləri",
		descriptionSignedIn:
			"Hər qiymətin sizin üçün nə demək olduğu. Qiymət verəndə bunlar göstərilir, beləliklə hər kitabı eyni meyarla qiymətləndirə bilərsiniz. İstədiyinizi dəyişin və ya birini standarta qaytarın.",
		descriptionSignedOut:
			"Hər qiymətin nə demək olduğu. İstənilən biri üçün öz ifadənizi yazmaq üçün daxil olun.",
		dialogTitle: "{rating} ulduz: {label}",
		dialogDescription:
			"Bu qiymətin sizin üçün nə demək olduğunu yazın. Qiymət verəndə bunu görəcəksiniz, beləliklə qiymətləriniz ardıcıl qalır.",
		textareaLabel: "{rating} ulduz sizin üçün nə deməkdir",
		resetToDefault: "Standarta qaytar",
		cancel: "Ləğv et",
		save: "Yadda saxla",
		yourWording: "Sizin ifadəniz",
		edit: "Redaktə et",
		reset: "Sıfırla",
		resetLabel: "{rating} ulduzu standarta qaytar",
	},
};
