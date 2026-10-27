import type { Messages } from "../shape";

export const notifications: Messages["notifications"] = {
	kinds: {
		member_posted: "Klubda yeni paylaşım",
		comment_on_your_post: "Paylaşımınıza şərh",
		reply_to_your_comment: "Şərhinizə cavab",
		reaction_on_your_post: "Paylaşımınıza reaksiya",
		member_feedback_on_book: "Kitab haqqında rəy",
		book_added_to_library: "Kitabxanaya kitab əlavə edildi",
		sitting_poll_started: "Oxuma sessiyası səsverməsi başladı",
		sitting_poll_closed: "Oxuma sessiyası səsverməsi bağlandı",
		participant_finished_book: "İştirakçı oxumanı bitirdi",
		sitting_finished: "Oxuma sessiyası bitdi",
		book_requested: "Kitab istəndi",
		document_submitted: "Sənəd göndərildi",
		document_approved: "Sənəd təsdiqləndi",
		document_rejected: "Sənəd rədd edildi",
		achievement_earned: "Nailiyyət qazanıldı",
		shelf_invitation: "Rəf dəvəti",
		shelf_collaboration: "Rəf əməkdaşlığı",
		poll_vote: "Sorğunuza səslər",
		poll_ended: "Sorğu bitdi",
		sitting_member_joined: "Kimsə oxuma sessiyanıza qoşuldu",
		sitting_invitation: "Oxuma sessiyası dəvəti",
		sitting_added: "Oxuma sessiyasına əlavə olundunuz",
		sitting_welcome: "Oxuma sessiyasına xoş gəldiniz",
		view_milestone: "Məzmununuz baxış hədəfinə çatdı",
		views_digest: "Həftəlik baxışlarınız",
		reading_behind: "Oxuma tempinizdən geridəsiniz",
		mention: "Kimsə sizi qeyd etdi",
		author_new_book: "İzlədiyiniz müəllifin yeni kitabı",
	},
	groups: {
		club: "Bütün klub üzrə",
		personal: "Sizinlə bağlı",
		sitting: "Qatıldığınız oxuma sessiyaları",
		admin: "Admin",
	},
	groupDescriptions: {
		club: "Bütün oxu klubunu maraqlandıran hadisələr.",
		personal: "Kimsə məzmununuzla qarşılıqlı əlaqəyə girəndə.",
		sitting:
			"İştirak etdiyiniz oxuma sessiyalarının səsvermələri və oxuma irəliləyişi.",
		admin: "Moderasiya və kitabxana sorğuları (yalnız adminlər üçün).",
	},
	messages: {
		memberPosted: {
			title: "Klubda yeni paylaşım",
			body: "{actor} yeni paylaşım etdi.",
		},
		commentOnYourPost: {
			title: "Paylaşımınıza yeni şərh",
			body: "{actor} paylaşımınıza şərh yazdı.",
		},
		replyToYourComment: {
			title: "Şərhinizə cavab",
			body: "{actor} şərhinizə cavab verdi.",
		},
		reactionOnYourPost: {
			title: "Paylaşımınıza reaksiya",
			body: "{actor} paylaşımınızı bəyəndi.",
		},
		memberFeedbackOnBook: {
			title: "Kitab haqqında yeni rəy",
			body: "{actor} “{book}” kitabına rəy yazdı.",
		},
		bookAddedToLibrary: {
			title: "Kitabxanaya kitab əlavə edildi",
			body: "“{book}” klub kitabxanasına əlavə edildi.",
		},
		authorNewBook: {
			title:
				"{count, plural, one {{first} müəllifinin yeni kitabı} =2 {{first} və {second} müəlliflərinin yeni kitabı} other {{first} və digər müəlliflərin yeni kitabı}}",
			body: "“{book}” klub kitabxanasına əlavə edildi.",
		},
		sittingPollStarted: {
			title: "Oxuma sessiyası səsverməsi başladı",
			body: "Son tarixə qədər növbəti klub kitabına səs verin.",
		},
		sittingPollClosed: {
			title: "Səsvermə bağlandı — oxuma başlayır",
			body: "Klub “{book}” kitabını oxuyacaq.",
		},
		sittingFinished: {
			title: "Oxuma sessiyası bitdi",
			body: "Oxuma vaxtı başa çatdı. Kitab haqqında rəyinizi bölüşün.",
		},
		participantFinishedBook: {
			title: "İştirakçı oxumanı bitirdi",
			body: "{actor} sessiyanın kitabını oxuyub bitirdi.",
		},
		achievementEarned: {
			title: "Nailiyyət qazandınız",
			body: "{label}",
		},
		shelfInvitation: {
			title: "Sizi rəfə dəvət etdilər",
			body: "{actor} sizi “{shelf}” rəfində əməkdaşlığa dəvət etdi.",
		},
		shelfInvitationAccepted: {
			title: "Dəvət qəbul edildi",
			body: "{actor} “{shelf}” rəfinə qoşuldu.",
		},
		shelfInvitationDeclined: {
			title: "Dəvət rədd edildi",
			body: "{actor} “{shelf}” rəfində əməkdaşlıqdan imtina etdi.",
		},
		shelfPermissionsChanged: {
			title: "Rəf icazələriniz dəyişdi",
			body: "{actor} “{shelf}” rəfində edə biləcəyiniz əməlləri yenilədi.",
		},
		shelfRemoved: {
			title: "Rəfdən çıxarıldınız",
			body: "{actor} sizi “{shelf}” rəfindən çıxardı.",
		},
		shelfCollaboratorLeft: {
			title: "Əməkdaş rəfinizdən ayrıldı",
			body: "{actor} “{shelf}” rəfindən ayrıldı.",
		},
		shelfOwnershipTransferred: {
			title: "Artıq bir rəfin sahibisiniz",
			body: "{actor} “{shelf}” rəfini sizə təhvil verdi.",
		},
		shelfDeleted: {
			title: "Paylaşılan rəf silindi",
			body: "{hasActor, select, yes {{actor} “{shelf}” rəfini sildi.} other {Kimsə “{shelf}” rəfini sildi.}}",
		},
		pollVoteFirst: {
			title: "Sorğunuz ilk səsi aldı",
			body: "Kimsə sorğunuza indicə səs verdi.",
		},
		pollVoteMany: {
			title: "Sorğunuza {count, number} səs verildi",
			body: "Sorğunuza indiyədək {count, number} üzv səs verib.",
		},
		pollEnded: {
			title: "Sorğu bitdi",
			body: "Səsvermə bağlandı. Nəticəyə baxın.",
		},
		sittingMemberJoined: {
			title: "Kimsə oxuma sessiyanıza qoşuldu",
			body: "{joiner} {sitting} sessiyasına qoşuldu.",
		},
		sittingMembersJoined: {
			title: "{total, number} üzv oxuma sessiyanıza qoşuldu",
			body: "{joiner} və daha {others, plural, one {# nəfər} other {# nəfər}} {sitting} sessiyasına qoşuldu.",
		},
		sittingInvitation: {
			title: "Sizi oxuma sessiyasına dəvət etdilər",
			body: "{hasInviter, select, yes {{inviter} sizi {sitting} sessiyasına dəvət etdi.} other {Təşkilatçı sizi {sitting} sessiyasına dəvət etdi.}}",
		},
		sittingAdded: {
			title: "Oxuma sessiyasına əlavə olundunuz",
			body: "Təşkilatçı sizi {sitting} sessiyasına əlavə etdi.",
		},
		sittingWelcomeReading: {
			title: "{sitting} sessiyasına qoşuldunuz",
			body: "Oxuma {deadlineAt, date, ::dMMM} tarixində bitir. İrəliləyişinizi sessiya səhifəsində qeyd edin.",
		},
		sittingWelcomeVoting: {
			title: "{sitting} sessiyasına qoşuldunuz",
			body: "Səsvermə {deadlineAt, date, ::dMMM} tarixinədək açıqdır. Oxumaq istədiyiniz kitabı seçin.",
		},
		sittingWelcomeVotingOpen: {
			title: "{sitting} sessiyasına qoşuldunuz",
			body: "Səsvermə açıqdır. Oxumaq istədiyiniz kitabı seçin.",
		},
		viewMilestone: {
			title:
				"{resource, select, user {Profiliniz} post {Paylaşımınız} shelf {Rəfiniz} other {Rəyiniz}} {mark, number} baxışa çatdı",
			body: "{resource, select, user {Kimin baxdığını statistikanızda görün.} other {{item} · baxışların haradan gəldiyini görmək üçün statistikasını açın.}}",
		},
		viewsDigest: {
			title: "BBRC-də həftəniz: {total, plural, one {# baxış} other {# baxış}}",
			body: "Ən çox açılan: {top} ({views, number}).",
		},
		readingBehind: {
			title:
				"{hasBook, select, yes {{book} kitabında geridəsiniz} other {Kitabınızda geridəsiniz}}",
			body: "{unit, select, pages {Son tarixə yetişmək üçün gündə təxminən {amount, plural, one {# səhifə} other {# səhifə}} oxumalısınız.} other {Son tarixə yetişmək üçün gündə təxminən {amount, number}% oxumalısınız.}}",
		},
		mention: {
			title: "{actor} sizi qeyd etdi",
			body: "{hasExcerpt, select, yes {{excerpt}} other {Siz qeyd olundunuz.}}",
		},
	},
};
