import type { Messages } from "../../shape";

export const shelfErrors: Messages["errors"]["shelf"] = {
	notFound: "Rəf tapılmadı.",
	slugFailed: "Bu rəf üçün veb ünvan yaradıla bilmədi. Fərqli ad sınayın.",
	restricted:
		"Hesabınız məhdudlaşdırılıb, ona görə rəflərinizi dəyişə bilməzsiniz.",
	noPermission: "Bunu etmək üçün icazəniz yoxdur ({permission}).",
	ownerOnly: "Bunu yalnız rəfin sahibi edə bilər.",
	signInAgain: "Yenidən daxil olun.",
	notCollaborator: "Bu üzv bu rəfin ortaq redaktoru deyil.",
	pickPermission: "Ən azı bir icazə seçin.",
	pickPermissionOrRemove:
		"Ən azı bir icazə seçin və ya ortaq redaktoru çıxarın.",
	grantOnlyOwn: "Yalnız özünüzdə olan icazələri verə bilərsiniz.",
	memberNotFound: "Üzv tapılmadı.",
	cannotInviteSelf: "Özünüzü dəvət edə bilməzsiniz.",
	alreadyOwner: "Bu rəf artıq həmin üzvə məxsusdur.",
	notAcceptingInvites: "{name} rəf dəvətlərini qəbul etmir.",
	alreadyCollaborator: "Bu üzv artıq ortaq redaktordur.",
	alreadyInvited: "Bu üzvün artıq gözləyən dəvəti var.",
	collaboratorLimit:
		"Bir rəfdə ən çox {max, plural, one {# ortaq redaktor} other {# ortaq redaktor}} ola bilər.",
	invitationNotFound: "Dəvət tapılmadı.",
	invitationCancelled: "Bu dəvət ləğv edilib.",
	invitationAnswered: "Bu dəvətə artıq cavab vermisiniz.",
	invitationExpired: "Bu dəvətin vaxtı bitib. Yenisini istəyin.",
	cannotChangeOwnPermissions: "Öz icazələrinizi dəyişə bilməzsiniz.",
	outranksChange:
		"Bu üzvün icazələri sizinkindən çoxdur, ona görə onu dəyişə bilməzsiniz.",
	outranksRemove:
		"Bu üzvün icazələri sizinkindən çoxdur, ona görə onu çıxara bilməzsiniz.",
	useLeaveShelf:
		"Özünüzü çıxarmaq üçün “Rəfdən ayrıl” düyməsindən istifadə edin.",
	ownerCannotLeave:
		"Sahib öz rəfindən ayrıla bilməz. Rəfi başqasına verin və ya silin.",
	notYourShelf: "Siz bu rəfin ortaq redaktoru deyilsiniz.",
	activityLogRestricted:
		"Fəaliyyət jurnalını yalnız ortaq redaktorları idarə edənlər görə bilər.",
	wishlistProtected:
		"İstək siyahınız xüsusidir: yalnız təsvirini və kimin görə biləcəyini dəyişə bilərsiniz.",
	wishlistNoCustomCover:
		"İstək siyahınızın öz görünüşü var, ona görə fərdi üz qabığı ola bilməz.",
	wishlistNotShareable: "İstək siyahınız şəxsidir, ona görə paylaşıla bilməz.",
	wishlistNotTransferable: "İstək siyahınız başqasına verilə bilməz.",
	wishlistNotDeletable: "İstək siyahınız silinə bilməz.",
	wishlistAlreadyRead:
		"Bu kitabı artıq oxumusunuz, ona görə istək siyahısı üçün deyil.",
	noDraftRevert:
		"Açıq və ya arxivlənmiş rəf yenidən qaralamaya qaytarıla bilməz.",
	visibilityOwnerOnly:
		"Bu rəfi kimin görə biləcəyini yalnız sahib dəyişə bilər.",
	confirmTitle: "Silməni təsdiqləmək üçün rəfin adını yazın.",
	bookLimit:
		"Bir rəfdə ən çox {max, plural, one {# kitab} other {# kitab}} ola bilər.",
	reorderMissing: "Yeni sıraya rəfdəki bütün kitablar daxil olmalıdır.",
	reorderForeign: "Yeni sıraya bu rəfdə olmayan kitab daxildir.",
	reorderDuplicate: "Yeni sırada təkrarlanan kitablar var.",
	bookNotOnShelf: "Bu kitab bu rəfdə deyil.",
	permissions: {
		add_book: "kitab əlavə etmək",
		remove_book: "kitab çıxarmaq",
		edit_notes: "kitab qeydlərini redaktə etmək",
		edit_title: "adı dəyişmək",
		edit_description: "təsviri dəyişmək",
		edit_cover: "üz qabığı şəklini dəyişmək",
		edit_type: "sıralı və sadə rəf arasında keçid etmək",
		edit_status: "görünməni dəyişmək",
		edit_ordering_on_simple: "sadə siyahının sırasını dəyişmək",
		edit_ordering_on_ranked: "sıralı siyahının sırasını dəyişmək",
		view_non_public: "rəfi qaralama və ya arxiv olduqda görmək",
		delete_shelf: "rəfi silmək",
		add_collaborator: "ortaq redaktorları dəvət etmək",
		remove_collaborator: "ortaq redaktorları çıxarmaq",
		edit_permissions: "ortaq redaktorların icazələrini dəyişmək",
	},
};
