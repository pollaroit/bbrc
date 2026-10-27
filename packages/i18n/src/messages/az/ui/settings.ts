import type { Messages } from "../../shape";

export const settings: Messages["settings"] = {
	back: "Parametrlər",
	index: {
		metaTitle: "Parametrlər",
		metaDescription: "BBRC hesabınızın parametrlərini idarə edin.",
		title: "Parametrlər",
		intro: "Hesabınızın parametrləri.",
		links: {
			preferences: {
				title: "Üstünlüklər",
				description:
					"Mövzu, şriftlər, mətn ölçüsü, oxuma və görünüş seçimləri.",
			},
			profile: {
				title: "Profil",
				description:
					"Ad günü, haqqınızda, sevimli janrlar, keçidlər və oxuma sürəti.",
			},
			following: {
				title: "İzlədiklərim",
				description: "İzlədiyiniz müəlliflər və yeni kitab bildirişləri.",
			},
			sessions: {
				title: "Sessiyalar",
				description: "Harada daxil olduğunuzu görün və cihazlardan çıxın.",
			},
			notifications: {
				title: "Bildirişlər",
				description:
					"Zəng bildirişləri və ntfy ilə telefon üçün birdəfəlik quraşdırma.",
			},
		},
		usernameHeading: "İstifadəçi adı",
		nameHeading: "Adınız",
	},
	profile: {
		metaTitle: "Profil",
		metaDescription: "Açıq BBRC profilinizi redaktə edin.",
		title: "Profil",
		intro:
			"Digər oxuculara özünüz haqqında danışın. Yadda saxla düyməsinə basmadan heç nə saxlanmır.",
	},
	following: {
		metaTitle: "İzlədiklərim",
		metaDescription: "BBRC-də izlədiyiniz müəlliflər.",
		title: "İzlədiklərim",
		intro:
			"İzlədiyiniz müəlliflər. Kitabxanaya onlardan birinin kitabı əlavə olunanda bildiriş alırsınız; bunu <link>Bildirişlər</link> bölməsində aça və ya bağlaya bilərsiniz.",
		authorsTitle: "Müəlliflər",
		authorsDescription:
			"Kitabxanaya onların kitabı əlavə olunanda sizə bildirilir.",
		authorsEmpty: "Hələ heç bir müəllifi izləmirsiniz.",
		browseAuthors: "Müəlliflərə bax",
		loadFailed: "İzlədiklərinizi yükləmək mümkün olmadı.",
		tryAgain: "Yenidən cəhd edin",
		unfollowFailed: "İzləməni dayandırmaq mümkün olmadı.",
		unfollowed: "{name} artıq izlənmir.",
		undo: "Geri qaytar",
		unfollow: "İzləmə",
		unfollowLabel: "{name} müəllifini izləməyi dayandır",
		bookCount: "{count, plural, one {# kitab} other {# kitab}}",
	},
	notifications: {
		metaTitle: "Bildiriş parametrləri",
		metaDescription: "BBRC üçün tətbiqdaxili və push bildirişlərini seçin.",
		title: "Bildirişlər",
		intro:
			"Saytdakı zəngdə nələrin görünəcəyini və ntfy vasitəsilə telefonunuza nələrin göndəriləcəyini seçin. Telefon üçün push-u aşağıdakı şəxsi mövzunuzla bir dəfə quraşdırın.",
	},
	sessions: {
		metaTitle: "Sessiyalar",
		metaDescription: "Aktiv sessiyalarınızı idarə edin.",
		title: "Sessiyalar",
		intro: "Daxil olduğunuz cihazlar. Tanımadığınız cihazlardan çıxın.",
		unknownDevice: "Naməlum cihaz",
		browserOnOs: "{os} üzərində {browser}",
		browser: "Brauzer",
		thisDevice: "Bu cihaz",
		signedIn: "Daxil olunub: {date}",
		signedInWithIp: "{ip} · Daxil olunub: {date}",
		logOut: "Çıx",
		logOutOthers: "Bütün digər sessiyalardan çıx",
		logOutAll: "Bütün sessiyalardan çıx",
		signedOutOne: "Sessiyadan çıxıldı",
		signedOutOthers: "Digər sessiyalardan çıxıldı",
		signedOutAll: "Hər yerdən çıxıldı",
		error: "Nəsə səhv getdi",
	},
	avatar: {
		label: "Profil şəkli",
		description:
			"Hazırkı avatarınızı əvəz edir. JPEG sabit yolda saxlanır; yükləmədə PNG və WebP də qəbul edilir.",
	},
	name: {
		label: "Ad",
		save: "Adı yadda saxla",
		updated: "Ad yeniləndi",
		updateFailed: "Adı yeniləmək mümkün olmadı",
		invalid: "Düzgün ad daxil edin.",
	},
	username: {
		label: "İstifadəçi adı",
		save: "İstifadəçi adını yadda saxla",
		updated: "İstifadəçi adı yeniləndi",
		updateFailed: "İstifadəçi adını yeniləmək mümkün olmadı",
		invalid: "Düzgün istifadəçi adı daxil edin (hərflər, rəqəmlər, alt xətt).",
		loading: "İstifadəçi adı parametrləri yüklənir…",
		loadFailed: "İstifadəçi adı parametrlərini yükləmək mümkün olmadı.",
		cooldown:
			"İstifadəçi adınızı {days, plural, one {# gündə} other {# gündə}} bir dəfə dəyişə bilərsiniz.",
		neverChanged:
			"{cooldown} Qeydiyyatdan bəri dəyişməmisiniz, ona görə indi yeniləyə bilərsiniz. Profil keçidləri istifadəçi adınızdan istifadə edir.",
		canUpdate:
			"{cooldown} Son dəyişiklik: {lastChanged}. İndi yeniləyə bilərsiniz.",
		mustWait:
			"{cooldown} Son dəyişiklik: {lastChanged}. Yenidən {remaining} sonra ({nextAt}) dəyişə bilərsiniz.",
		later: "sonra",
		aWhile: "bir müddət",
		now: "indi",
		remainingDays: "{count, plural, one {# gün} other {# gün}}",
		remainingHours: "{count, plural, one {# saat} other {# saat}}",
		remainingMinutes: "{count, plural, one {# dəqiqə} other {# dəqiqə}}",
	},
	profileForm: {
		ageRange: "Yaşınız {min} ilə {max} arasında olmalıdır.",
		websiteInvalid: "https:// ilə başlayan düzgün URL daxil edin.",
		bioTooLong:
			"Haqqınızda mətni ən çox {max, plural, one {# simvol} other {# simvol}} ola bilər.",
		socialChooseSite: "Sayt seçin və ya bu keçidi silin.",
		socialEnterUrl: "{site} URL-nizi daxil edin və ya bu keçidi silin.",
		socialWrongUrl: "{site} profil URL-i istifadə edin, məsələn: {example}",
		saved: "Profil yadda saxlanıldı",
		saveFailed: "Profili yadda saxlamaq mümkün olmadı",
		fixFields: "Yadda saxlamaq üçün vurğulanmış sahələri düzəldin.",
		aboutYou: "Haqqınızda",
		dateOfBirth: "Doğum tarixi",
		pickDate: "Tarix seçin",
		gender: "Cins",
		genders: {
			male: "Kişi",
			female: "Qadın",
			not_specified: "Demək istəmirəm",
		},
		location: "Yer",
		locationPlaceholder: "Şəhər, ölkə",
		bio: "Haqqınızda",
		write: "Yaz",
		preview: "Önbaxış",
		bioPlaceholder: "Digər oxuculara özünüz haqqında bir az danışın…",
		nothingToPreview: "Hələ önbaxış üçün heç nə yoxdur.",
		favoriteGenres: "Sevimli janrlar",
		favoriteGenresHelp:
			"Sevdiyiniz janrları seçin, sonra alt janrlarla dəqiqləşdirin.",
		links: "Keçidlər",
		website: "Veb sayt",
		socialLinks: "Sosial şəbəkə keçidləri",
		readingSpeed: "Oxuma sürəti",
		readingSpeedHelp:
			"Bir kitabı nə qədər vaxta bitirəcəyinizi təxmin etmək üçün istifadə olunur.",
		wordsPerMinute: "dəqiqədə söz",
		setWpm: "Yeni sürət təyin et",
		noChanges: "Yadda saxlanmamış dəyişiklik yoxdur",
		unsavedChanges: "Yadda saxlanmamış dəyişikliklər var",
		discard: "Ləğv et",
		saveChanges: "Dəyişiklikləri yadda saxla",
		loading: "Profil yüklənir…",
		loadFailed: "Profilinizi yükləmək mümkün olmadı.",
		socialSiteLabel: "Sosial şəbəkə",
		chooseSite: "Sayt seçin",
		chooseSiteFirst: "Əvvəlcə sayt seçin",
		siteProfileUrl: "{site} profil URL-i",
		profileUrl: "Profil URL-i",
		removeSocialLink: "Sosial şəbəkə keçidini sil",
		addSocialLink: "Sosial şəbəkə keçidi əlavə et",
		previousMonth: "Əvvəlki ay",
		nextMonth: "Növbəti ay",
	},
	wpm: {
		title: "Oxuma sürətinizi ölçün",
		textLanguage: "Mətnin dili",
		description:
			"Dil seçin, taymeri işə salın, sonra parçanı adi tempinizlə oxuyun. Sona çatanda Bitdi düyməsinə basın.",
		idleHint: "Mətn taymeri işə saldığınız zaman görünəcək.",
		result:
			"dəqiqədə söz · {time} ərzində {words, plural, one {# söz} other {# söz}}",
		start: "Taymeri başlat",
		finished: "Bitdi",
		tryAgain: "Yenidən cəhd et",
		use: "{wpm} söz/dəq istifadə et",
	},
	pwaAlerts: {
		unsupported: "Bu brauzer sistem bildirişlərini dəstəkləmir.",
		turnedOn: "Sistem bildirişləri aktiv edildi",
		denied:
			"Bundan istifadə etmək üçün brauzer parametrlərində bildirişlərə icazə verin.",
		title: "Tətbiq tipli bildirişlər",
		installedTitle: "Quraşdırılmış tətbiq",
		installedDescription:
			"BBRC ana ekranınızdan işləyərkən səslər və sistem bannerləri. Tətbiq tam bağlı olanda telefona push üçün aşağıdakı ntfy-dən istifadə edin.",
		description:
			"Bu səhifə açıq və ya arxa planda olanda yeni zəng bildirişləri gələndə istəyə bağlı geri bildirim. Tam təcrübə üçün BBRC-ni quraşdırın.",
		sound: "Yeni zəng bildirişləri üçün qısa səs çal",
		banner: "Tətbiq arxa planda olanda sistem bannerini göstər",
		allow: "Sistem bildirişlərinə icazə ver",
		note: "Bunlar saytla eyni zəng bildirişlərindən istifadə edir. BBRC bağlı olanda ntfy push-u əvəz etmir. Xidmət işçisində Web Push sonrakı buraxılışda planlaşdırılır.",
	},
	notificationsForm: {
		saved: "Bildiriş üstünlükləri yadda saxlanıldı.",
		loading: "Üstünlüklər yüklənir…",
		loadFailed: "Bildiriş üstünlüklərini yükləmək mümkün olmadı.",
		copied: "{label} kopyalandı",
		copyFailed: "Buferə kopyalamaq mümkün olmadı",
		copyTopic: "Mövzunu kopyala",
		ntfyTitle: "Telefona push (ntfy)",
		ntfyDescription:
			"Push bildirişləri <link>ntfy.sh</link> vasitəsilə gedir. Bunu bir dəfə quraşdırırsınız; oxuma sessiyası yeniləmələri eyni şəxsi mövzudan istifadə edir — hər sessiya üçün yeni keçid yoxdur.",
		stepInstall:
			"Telefonunuza <b>ntfy</b> tətbiqini quraşdırın (App Store, Google Play və ya F-Droid).",
		stepTurnOn:
			"Aşağıda istədiyiniz hadisələr üçün <b>Telefon</b> seçimini aktiv edin, sonra <b>Üstünlükləri yadda saxla</b> düyməsinə basın.",
		stepSubscribe:
			"<b>Şəxsi mövzunuzu</b> kopyalayın və ntfy-də abunə olun: tətbiqi açın → abunə əlavə et → mövzunu telefonunuzda yapışdırın.",
		stepAdmin:
			"Adminlər: sorğu bildirişləri üçün <b>Admin bildirişlərinə</b> də abunə olun.",
		personalTopic: "Şəxsi mövzunuz",
		personalTopicHelp:
			"Hesabınız üçün bütün telefon push-ları (oxuma sessiyası səsvermələri və bitmələri daxil) buraya çatdırılır. Bir dəfə abunə olun.",
		adminTopic: "Admin bildirişləri",
		adminTopicHelp:
			"Kitab sorğuları və yalnız adminlər üçün digər push-lar. Şəxsi mövzunuza əlavə olaraq abunə olun.",
		togglesTitle: "Düymələr nə deməkdir",
		toggleBell:
			"<b>Zəng</b> — daxil olduğunuz zaman BBRC-dəki bildiriş menyusunda göstər.",
		togglePhone:
			"<b>Telefon</b> — şəxsi ntfy mövzunuza push göndər (yalnız ntfy tətbiqində abunə olmusunuzsa və burada Telefonu aktiv saxlamısınızsa).",
		bell: "Zəng",
		phone: "Telefon",
		save: "Üstünlükləri yadda saxla",
	},
};
