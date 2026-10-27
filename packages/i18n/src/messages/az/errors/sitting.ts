import type { Messages } from "../../shape";

export const sittingErrors: Messages["errors"]["sitting"] = {
	addNotAllowedMany:
		"{count, plural, one {{names} oxuma sessiyalarına əlavə olunmağa icazə vermir. Bunun əvəzinə, sessiya yaradıldıqdan sonra dəvət göndərin.} other {{names} oxuma sessiyalarına əlavə olunmağa icazə vermir. Bunun əvəzinə, sessiya yaradıldıqdan sonra dəvət göndərin.}}",
	addNotAllowedOne:
		"{name} oxuma sessiyalarına əlavə olunmağa icazə vermir. Bunun əvəzinə dəvət göndərin.",
	alreadyOngoing: "Artıq davam edən bir oxuma sessiyası var",
	alreadyParticipant: "Üzv artıq bu oxuma sessiyasındadır",
	bookNotFound: "Kitab tapılmadı",
	finishNeedsReading:
		"Yalnız oxuma mərhələsindəki sessiyalar bitmiş kimi qeyd edilə bilər",
	finished: "Bu oxuma sessiyası bitib.",
	invitation: {
		alreadyIn: "{name} artıq bu oxuma sessiyasındadır.",
		alreadyInvited: "{name} üçün artıq dəvət var.",
		notAccepted: "{name} oxuma sessiyası dəvətlərini qəbul etmir.",
		notFound: "Dəvət tapılmadı.",
		wasRemoved:
			"{name} bu oxuma sessiyasından çıxarılıb. Bunun əvəzinə onu birbaşa yenidən əlavə edin.",
	},
	join: {
		accountUnavailable: "Bu əməliyyat hesabınız üçün əlçatan deyil.",
		alreadyIn: "Siz artıq bu oxuma sessiyasındasınız.",
		banned: "Bloklanmış üzvlər oxuma sessiyasına qoşula bilməz.",
		lastPerson:
			"Bu oxuma sessiyasında sonuncu şəxssiniz, ona görə ayrıla bilməzsiniz.",
		leaveOnlyWhileVoting:
			"Yalnız səsvermə açıq olduqda ayrıla bilərsiniz. Oxuma başladıqdan sonra iştirak edən hər kəs qalır.",
		notInSitting: "Siz bu oxuma sessiyasında deyilsiniz.",
		privateOrganisersOnly:
			"Bu oxuma sessiyası şəxsidir. İnsanları yalnız təşkilatçılar əlavə edə bilər.",
		removedByOrganiser:
			"Təşkilatçı sizi bu oxuma sessiyasından çıxarıb, ona görə sizi yalnız təşkilatçı yenidən əlavə edə bilər.",
		settingsFixed:
			"Bu oxuma sessiyası bitib, ona görə qoşulma ayarları dəyişdirilə bilməz.",
		signIn: "Qoşulmaq üçün daxil olun.",
		viaLinkOnly: "Bu oxuma sessiyasına dəvət linki ilə qoşulmaq olar.",
		window: {
			finished:
				"Bu oxuma sessiyası bitib, ona görə artıq heç kim qoşula bilməz.",
			passed: "Bu oxuma sessiyasına qoşulma vaxtı keçib.",
			readingClosed: "Bu oxuma sessiyası oxunarkən qoşulma açıq deyil.",
			votingClosed:
				"Bu oxuma sessiyası üçün səsvermə zamanı qoşulma açıq deyil.",
		},
	},
	link: {
		expiryInPast: "Bitmə vaxtı gələcəkdə olmalıdır.",
		invitationLinkNotFound: "Dəvət linki tapılmadı",
		maxLifetime: "Link ən çox bir il etibarlı ola bilər.",
		notFound: "Link tapılmadı",
		privateNoLinks:
			"Şəxsi oxuma sessiyalarında dəvət linkləri olmur. Əvvəlcə onu «Siyahıda olmayan» və ya «Açıq» edin.",
		state: {
			active: "Bu link işləyir.",
			exhausted: "Bu dəvət linki icazə verilən sayda istifadə olunub.",
			expired: "Bu dəvət linkinin vaxtı bitib.",
			revoked: "Bu dəvət linki təşkilatçı tərəfindən ləğv edilib.",
		},
		tooMany:
			"Bir oxuma sessiyasında ən çox {max} link ola bilər. Əvvəlcə birini ləğv edin.",
	},
	memberNotFound: "Üzv tapılmadı.",
	noPoll: "Bu oxuma sessiyasında səsvermə yoxdur",
	noPollDeadline:
		"Bu oxuma sessiyasında yenilənəcək səsvermə son tarixi yoxdur",
	noPollToClose: "Bu oxuma sessiyasında bağlanacaq səsvermə yoxdur",
	noSelectedBookToComplete:
		"Bu oxuma sessiyasında tamamlanacaq seçilmiş kitab yoxdur",
	notAcceptingVotes: "Bu oxuma sessiyası səs qəbul etmir",
	notFound: "Oxuma sessiyası tapılmadı",
	notFoundAfterFinish: "Bitirmədən sonra oxuma sessiyası tapılmadı",
	organisersOnly: "Bunu yalnız oxuma sessiyasının təşkilatçıları edə bilər.",
	participantNotFound: "İştirakçı bu oxuma sessiyasında tapılmadı",
	participantsLocked:
		"İştirakçılar yalnız səsvermə və ya oxuma zamanı dəyişdirilə bilər",
	poll: {
		duplicateLocked: "Təkrarlanan kilidlənmiş kitablara icazə verilmir",
		duplicateOptions: "Səsvermə variantlarında təkrarlanan kitablar ola bilməz",
		lockedNotInOptions: "Kilidlənmiş kitab cari variant siyahısında yoxdur",
		noBooksMatch: "Səsvermə filtrlərinə uyğun istək siyahısı kitabı yoxdur",
		noReplacementAvailable:
			"Bu əvəzləmə üçün başqa uyğun istək siyahısı kitabı yoxdur",
		notEnoughBooks:
			"Səsvermə filtrlərinə kifayət qədər istək siyahısı kitabı uyğun gəlmir (ən azı {take} lazımdır)",
		optionBooksMissing: "Bir və ya bir neçə səsvermə variantı kitabı tapılmadı",
		optionCountMismatch: "{take} cari səsvermə variantı gözlənilirdi",
		optionsNotEligible:
			"Bir və ya bir neçə səsvermə variantı bu ayarlar üçün uyğun istək siyahısı kitabı deyil",
		participantsMissing:
			"Seçilmiş iştirakçılardan bir və ya bir neçəsi mövcud deyil",
		replaceNotInOptions: "Əvəz ediləcək kitab cari variant siyahısında yoxdur",
		replacementLoadFailed: "Əvəzedici kitab yüklənmədi",
		selectedNotInPoll: "Seçilmiş kitab bu səsvermənin tərkibində deyil",
		slugFailed: "Unikal səsvermə slug-u yaradıla bilmədi",
		wrongOptionCount: "Səsvermədə dəqiq {expected} variant olmalıdır",
	},
	pollNotFound: "Bu oxuma sessiyası üçün səsvermə tapılmadı",
	pollOptionNotFound: "Səsvermə variantı tapılmadı",
	progress: {
		changeNotAllowed:
			"İrəliləyişi {current, select, not_started {başlanmayıb} in_progress {oxunur} completed {tamamlanıb} dnf {bitirilməyib} other {{current}}} vəziyyətindən {next, select, not_started {başlanmayıb} in_progress {oxunur} completed {tamamlanıb} dnf {bitirilməyib} other {{next}}} vəziyyətinə dəyişmək olmaz",
		dnfAutomatic:
			"«Bitirilməyib» statusu oxuma sessiyası bitəndə avtomatik tətbiq olunur",
	},
	progressOnlyWhileReading:
		"İrəliləyiş yalnız oxuma mərhələsində yenilənə bilər",
	progressParticipantsOnly:
		"İrəliləyişi yalnız oxuma sessiyasının iştirakçıları yeniləyə bilər",
	readerListsParticipantsOnly:
		"Oxucu siyahılarına yalnız oxuma sessiyasının iştirakçıları baxa bilər",
	removeFinished: "Kitabı artıq bitirmiş üzvü çıxarmaq olmaz",
	removeLast: "Sonuncu iştirakçını çıxarmaq olmaz",
	selectedBookNotFound: "Seçilmiş kitab tapılmadı",
	signInToFilter: "Oxuma sessiyalarınıza görə süzmək üçün daxil olun.",
	slugFailed: "Unikal oxuma sessiyası slug-u yaradıla bilmədi",
	startReadingNeedsVoting:
		"Yalnız səsvermə mərhələsindəki sessiyalar oxumaya başlaya bilər",
	vote: {
		duplicate: "Təkrarlanan səsvermə variantlarına icazə verilmir",
		goldenNotAllowed: "Bu səsvermədə Qızıl jetondan istifadə edə bilməzsiniz",
		invalidPoints: "Səs xalları yanlışdır",
		oneGoldenMax: "Ən çox bir Qızıl jeton istifadə edə bilərsiniz",
		oneSilverMax: "Ən çox bir Gümüş jeton istifadə edə bilərsiniz",
		optionNotOnPoll:
			"Seçilmiş variantlardan bir və ya bir neçəsi bu səsvermədə yoxdur",
		selectAtLeast: "Ən azı {min, plural, one {# kitab} other {# kitab}} seçin",
		selectAtMost: "Ən çoxu {max, plural, one {# kitab} other {# kitab}} seçin",
		silverNotAllowed: "Bu səsvermədə Gümüş jetondan istifadə edə bilməzsiniz",
	},
	voteParticipantsOnly:
		"Yalnız oxuma sessiyasının iştirakçıları səs verə bilər",
};
