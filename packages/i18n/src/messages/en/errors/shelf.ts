import { defineMessages } from "../../types";

/** Errors of shelves, their collaborators and invitations. */
export const shelfErrors = defineMessages({
	notFound: "Shelf not found.",
	slugFailed:
		"Could not create a web address for this shelf. Try a different title.",
	restricted: "Your account is restricted, so you cannot change your shelves.",
	noPermission: "You do not have permission to do that ({permission}).",
	ownerOnly: "Only the owner of the shelf can do that.",
	signInAgain: "Sign in again.",
	notCollaborator: "That member is not a collaborator on this shelf.",
	pickPermission: "Choose at least one permission.",
	pickPermissionOrRemove:
		"Choose at least one permission, or remove the collaborator.",
	grantOnlyOwn: "You can only give permissions that you have yourself.",
	memberNotFound: "Member not found.",
	cannotInviteSelf: "You cannot invite yourself.",
	alreadyOwner: "That member already owns this shelf.",
	notAcceptingInvites: "{name} is not accepting shelf invitations.",
	alreadyCollaborator: "That member is already a collaborator.",
	alreadyInvited: "That member already has a pending invitation.",
	collaboratorLimit:
		"A shelf can have at most {max, plural, one {# collaborator} other {# collaborators}}.",
	invitationNotFound: "Invitation not found.",
	invitationCancelled: "This invitation was cancelled.",
	invitationAnswered: "You already answered this invitation.",
	invitationExpired: "This invitation has expired. Ask for a new one.",
	cannotChangeOwnPermissions: "You cannot change your own permissions.",
	outranksChange:
		"That member can do more than you, so you cannot change them.",
	outranksRemove:
		"That member can do more than you, so you cannot remove them.",
	useLeaveShelf: "Use “Leave shelf” to remove yourself.",
	ownerCannotLeave:
		"Owners cannot leave their own shelf. Transfer it or delete it.",
	notYourShelf: "You are not a collaborator on this shelf.",
	activityLogRestricted:
		"Only people who manage collaborators can see the activity log.",
	wishlistProtected:
		"Your Wishlist is special: you can only change its description and who can see it.",
	wishlistNotShareable: "Your Wishlist is personal, so it cannot be shared.",
	wishlistNotTransferable:
		"Your Wishlist cannot be handed over to someone else.",
	wishlistNotDeletable: "Your Wishlist cannot be deleted.",
	wishlistAlreadyRead:
		"You have already read this book, so it is not for the Wishlist.",
	noDraftRevert:
		"A shelf that has been public or archived cannot be moved back to draft.",
	visibilityOwnerOnly: "Only the owner can change who can see this shelf.",
	confirmTitle: "Type the shelf title to confirm deletion.",
	bookLimit:
		"A shelf can hold at most {max, plural, one {# book} other {# books}}.",
	reorderMissing: "The new order must include every book on the shelf.",
	reorderForeign: "The new order includes a book that is not on this shelf.",
	reorderDuplicate: "The new order contains duplicate books.",
	bookNotOnShelf: "That book is not on this shelf.",
	/** What a collaborator may do, as a phrase for "you do not have permission to … ". */
	permissions: {
		add_book: "add books",
		remove_book: "remove books",
		edit_notes: "edit book notes",
		edit_title: "change the title",
		edit_description: "change the description",
		edit_cover: "change the cover image",
		edit_type: "switch between ranked and simple",
		edit_status: "change visibility",
		edit_ordering_on_simple: "reorder a simple list",
		edit_ordering_on_ranked: "reorder a ranked list",
		view_non_public: "see the shelf while it is a draft or archived",
		delete_shelf: "delete the shelf",
		add_collaborator: "invite collaborators",
		remove_collaborator: "remove collaborators",
		edit_permissions: "change collaborators' permissions",
	},
});
