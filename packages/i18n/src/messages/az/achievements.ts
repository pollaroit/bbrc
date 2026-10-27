import type { Messages } from "../shape";

export const achievements: Messages["achievements"] = {
	categories: {
		reading: "Oxuma",
		sittings: "Oxuma sessiyaları",
		community: "İcma",
		library: "Kitabxana",
		goals: "Məqsədlər",
		club: "Klub",
	},
	tiers: {
		bronze: "Bürünc",
		silver: "Gümüş",
		gold: "Qızıl",
		platinum: "Platin",
		diamond: "Almaz",
		fallback: "Pillə {n}",
	},
	items: {
		bookworm: {
			name: "Kitab qurdu",
			description: "{n, number} kitabı oxunmuş kimi qeyd edin.",
		},
		page_turner: {
			name: "Vərəqləyici",
			description: "Bütün kitablarınızda cəmi {n, number} səhifə oxuyun.",
		},
		world_reader: {
			name: "Dünya oxucusu",
			description: "{n, number} fərqli ölkənin kitablarını oxuyun.",
		},
		author_explorer: {
			name: "Müəllif tədqiqatçısı",
			description: "{n, number} fərqli müəllifin kitabını oxuyun.",
		},
		loyal_fan: {
			name: "Sadiq pərəstişkar",
			description: "Eyni müəllifin {n, number} kitabını oxuyun.",
		},
		series_finisher: {
			name: "Seriya sonlandıran",
			description: "{n, number} seriyanın bütün kitablarını oxuyun.",
		},
		classic_collector: {
			name: "Klassika kollektoru",
			description: "1950-ci ildən əvvəl nəşr olunmuş {n, number} kitab oxuyun.",
		},
		doorstopper: {
			name: "Qalın kitab",
			description:
				"800 və ya daha çox səhifəli {n, number} kitabı oxuyub bitirin.",
		},
		short_and_sweet: {
			name: "Qısa və şirin",
			description:
				"150 və ya daha az səhifəli {n, number} kitabı oxuyub bitirin.",
		},
		time_traveler: {
			name: "Zaman səyyahı",
			description: "{n, number} fərqli onillikdən kitablar oxuyun.",
		},
		steady_pace: {
			name: "Sabit templə",
			description:
				"Eyni ilin {n, number} fərqli ayında bir kitabı oxuyub bitirin.",
		},
		busy_year: {
			name: "Məşğul il",
			description: "Bir il ərzində {n, number} kitab oxuyun.",
		},
		trailblazer: {
			name: "Yolaçan",
			description:
				"{n, number} kitabı klubda oxunmuş kimi ilk qeyd edən üzv olun.",
		},
		club_regular: {
			name: "Klubun daimi üzvü",
			description: "{n, number} oxuma sessiyasını bitirin.",
		},
		on_a_roll: {
			name: "Seriyada",
			description: "Ardıcıl {n, number} oxuma sessiyasını bitirin.",
		},
		perfect_attendance: {
			name: "Mükəmməl iştirak",
			description:
				"İlin bütün oxuma sessiyalarını (ən azı {n, number}) bir dəfə də yarımçıq qoymadan bitirin. İl bitdikdən sonra verilir.",
		},
		ahead_of_schedule: {
			name: "Qrafikdən öndə",
			description:
				"{n, number} oxuma sessiyasını son tarixdən ən azı üç gün əvvəl bitirin.",
		},
		active_voter: {
			name: "Fəal səsverən",
			description: "{n, number} kitab səsverməsində iştirak edin.",
		},
		kingmaker: {
			name: "Qalibi seçən",
			description: "Səsvermədə qalib gələn kitaba {n, number} dəfə səs verin.",
		},
		critic: {
			name: "Tənqidçi",
			description: "{n, number} kitab rəyi yazın.",
		},
		long_form_critic: {
			name: "Ətraflı tənqidçi",
			description: "300 və ya daha çox simvollu {n, number} rəy yazın.",
		},
		crowd_pleaser: {
			name: "Hamının sevdiyi",
			description: "Bir rəyinizə {n, number} bəyənmə alın.",
		},
		well_loved: {
			name: "Çox sevilən",
			description:
				"Paylaşımlarınıza, şərhlərinizə və rəylərinizə cəmi {n, number} bəyənmə alın.",
		},
		voice_of_the_club: {
			name: "Klubun səsi",
			description: "Klubla {n, number} paylaşım edin.",
		},
		conversation_starter: {
			name: "Söhbəti başladan",
			description: "Bir paylaşımınıza {n, number} şərh alın.",
		},
		chatterbox: {
			name: "Danışqan",
			description: "{n, number} şərh yazın.",
		},
		librarians_helper: {
			name: "Kitabxanaçının köməkçisi",
			description: "Adminlərin təsdiq etdiyi {n, number} sənəd paylaşın.",
		},
		book_scout: {
			name: "Kitab axtarıcısı",
			description: "Kitabxanaya əlavə olunmuş {n, number} kitab tələb edin.",
		},
		curator: {
			name: "Kurator",
			description: "{n, number} ictimai rəf yaradın.",
		},
		big_shelf: {
			name: "Böyük rəf",
			description: "Bir rəfə {n, number} kitab əlavə edin.",
		},
		all_time_favorites: {
			name: "Həmişəlik sevimlilər",
			description: "Sevimli kitab yerlərinin hamısını ({n, number}) doldurun.",
		},
		quiz_taker: {
			name: "Viktorina iştirakçısı",
			description: "{n, number} kitab viktorinasını tamamlayın.",
		},
		quiz_ace: {
			name: "Viktorina ustası",
			description: "{n, number} viktorinadan maksimum bal toplayın.",
		},
		goal_setter: {
			name: "Məqsəd qoyan",
			description: "{n, number} oxuma məqsədi təyin edin.",
		},
		goal_getter: {
			name: "Məqsədə çatan",
			description: "{n, number} oxuma məqsədini tamamlayın.",
		},
		all_about_me: {
			name: "Mənim haqqımda",
			description:
				"Profilinizi tamamlayın: şəkil, bio, yaşayış yeri və sevimli janrlar.",
		},
		founding_member: {
			name: "Təsisçi üzv",
			description: "Klubun ilk üzvlərindən biri olun.",
		},
		still_here: {
			name: "Hələ də buradadır",
			description: "{n, number} il klubun üzvü olun.",
		},
		seen: {
			name: "Görünən",
			description:
				"Paylaşımlarınızdan biri digər üzvlər tərəfindən {n, number} dəfə açılsın.",
		},
		well_read_review: {
			name: "Çox oxunan rəy",
			description: "Rəylərinizdən biri {n, number} dəfə açılsın.",
		},
		face_in_the_crowd: {
			name: "Kütlədə tanınan üz",
			description: "Profiliniz {n, number} dəfə açılsın.",
		},
		pace_setter: {
			name: "Tempi müəyyən edən",
			description:
				"Oxuma sessiyasının son tarixinə uyğun izlədiyiniz kitabı {n, number} dəfə bitirin.",
		},
		page_by_page: {
			name: "Səhifə-səhifə",
			description: "Oxuma irəliləyişinizi ardıcıl {n, number} gün qeyd edin.",
		},
		wishlist_keeper: {
			name: "İstək siyahısının qoruyucusu",
			description: "İstək siyahınızda {n, number} kitab saxlayın.",
		},
		night_owl: {
			name: "Gecə quşu",
			description:
				"Gecə yarısı ilə səhər saat 4 arasında {n, number} dəfə paylaşım, şərh və ya rəy yazın.",
		},
		binge_day: {
			name: "Kitab günü",
			description: "Eyni gündə {n, number} kitabı oxunmuş kimi qeyd edin.",
		},
		redemption_arc: {
			name: "Düzəliş qövsü",
			description:
				"Yarımçıq qalmış sessiyadan dərhal sonra növbəti oxuma sessiyasını bitirin.",
		},
		photo_finish: {
			name: "Fotofinişdə",
			description:
				"Oxuma sessiyasını son tarixə üç saat qalmış bitirin, {n, number} dəfə.",
		},
		leap_day: {
			name: "Uzun il günü",
			description: "Fevralın 29-da fəal olun.",
		},
	},
};
