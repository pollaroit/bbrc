import { defineMessages } from "../types";

/**
 * Notification texts. `kinds` and `groups` name things in the settings screen; `messages` are
 * the title and body of each notification (the stored row keeps only the message id and its
 * values, so every reader sees it in their own language).
 */
export const notifications = defineMessages({
	kinds: {
		member_posted: "New club post",
		comment_on_your_post: "Comment on your post",
		reply_to_your_comment: "Reply to your comment",
		reaction_on_your_post: "Reaction on your post",
		member_feedback_on_book: "Book feedback",
		book_added_to_library: "Book added to library",
		sitting_poll_started: "Sitting poll started",
		sitting_poll_closed: "Sitting poll closed",
		participant_finished_book: "Participant finished reading",
		sitting_finished: "Sitting finished",
		book_requested: "Book requested",
		document_submitted: "Document submitted",
		document_approved: "Document approved",
		document_rejected: "Document rejected",
		achievement_earned: "Achievement earned",
		shelf_invitation: "Shelf invitation",
		shelf_collaboration: "Shelf collaboration",
		poll_vote: "Votes on your poll",
		poll_ended: "Poll ended",
		sitting_member_joined: "Someone joined your sitting",
		sitting_invitation: "Sitting invitation",
		sitting_added: "Added to a sitting",
		sitting_welcome: "Welcome to a sitting",
		view_milestone: "Your content reached a views milestone",
		views_digest: "Your weekly views",
		reading_behind: "You are behind your reading pace",
		mention: "Someone mentioned you",
		author_new_book: "A new book by an author you follow",
	},
	groups: {
		club: "Club-wide",
		personal: "About you",
		sitting: "Sittings you join",
		admin: "Admin",
	},
	groupDescriptions: {
		club: "Events that concern the whole reading club.",
		personal: "When someone interacts with your content.",
		sitting: "Polls and reading progress for sittings you participate in.",
		admin: "Moderation and library requests (admins only).",
	},
	messages: {
		memberPosted: {
			title: "New club post",
			body: "{actor} shared a new post.",
		},
		commentOnYourPost: {
			title: "New comment on your post",
			body: "{actor} commented on your post.",
		},
		replyToYourComment: {
			title: "Reply to your comment",
			body: "{actor} replied to your comment.",
		},
		reactionOnYourPost: {
			title: "Reaction on your post",
			body: "{actor} liked your post.",
		},
		memberFeedbackOnBook: {
			title: "New book feedback",
			body: "{actor} reviewed “{book}”.",
		},
		bookAddedToLibrary: {
			title: "Book added to library",
			body: "“{book}” was added to the club library.",
		},
		authorNewBook: {
			title:
				"{count, plural, one {A new book by {first}} =2 {A new book by {first} and {second}} other {A new book by {first} and others}}",
			body: "“{book}” was added to the club library.",
		},
		sittingPollStarted: {
			title: "Sitting poll started",
			body: "Vote for the next club read before the deadline.",
		},
		sittingPollClosed: {
			title: "Poll closed — reading starts",
			body: "The club will read “{book}”.",
		},
		sittingFinished: {
			title: "Sitting finished",
			body: "Reading time is over. Share your feedback on the book.",
		},
		participantFinishedBook: {
			title: "Participant finished reading",
			body: "{actor} finished the sitting book.",
		},
		achievementEarned: {
			title: "Achievement unlocked",
			body: "{label}",
		},
		shelfInvitation: {
			title: "You were invited to a shelf",
			body: "{actor} invited you to help with “{shelf}”.",
		},
		shelfInvitationAccepted: {
			title: "Invitation accepted",
			body: "{actor} joined “{shelf}”.",
		},
		shelfInvitationDeclined: {
			title: "Invitation declined",
			body: "{actor} declined to help with “{shelf}”.",
		},
		shelfPermissionsChanged: {
			title: "Your shelf permissions changed",
			body: "{actor} updated what you can do on “{shelf}”.",
		},
		shelfRemoved: {
			title: "Removed from a shelf",
			body: "{actor} removed you from “{shelf}”.",
		},
		shelfCollaboratorLeft: {
			title: "A collaborator left your shelf",
			body: "{actor} left “{shelf}”.",
		},
		shelfOwnershipTransferred: {
			title: "You now own a shelf",
			body: "{actor} handed “{shelf}” over to you.",
		},
		shelfDeleted: {
			title: "A shared shelf was deleted",
			body: "{hasActor, select, yes {{actor} deleted “{shelf}”.} other {Someone deleted “{shelf}”.}}",
		},
		pollVoteFirst: {
			title: "Your poll got its first vote",
			body: "Someone just voted on your poll.",
		},
		pollVoteMany: {
			title: "{count, number} votes on your poll",
			body: "{count, number} members have voted on your poll so far.",
		},
		pollEnded: {
			title: "A poll has ended",
			body: "Voting is closed. Take a look at how it turned out.",
		},
		sittingMemberJoined: {
			title: "Someone joined your sitting",
			body: "{joiner} joined {sitting}.",
		},
		sittingMembersJoined: {
			title: "{total, number} members joined your sitting",
			body: "{joiner} and {others, plural, one {# other} other {# others}} joined {sitting}.",
		},
		sittingInvitation: {
			title: "You were invited to a sitting",
			body: "{hasInviter, select, yes {{inviter} invited you to join {sitting}.} other {An organiser invited you to join {sitting}.}}",
		},
		sittingAdded: {
			title: "You were added to a sitting",
			body: "An organiser added you to {sitting}.",
		},
		sittingWelcomeReading: {
			title: "You joined {sitting}",
			body: "Reading ends {deadlineAt, date, ::dMMM}. Mark your progress on the sitting page as you go.",
		},
		sittingWelcomeVoting: {
			title: "You joined {sitting}",
			body: "Voting is open until {deadlineAt, date, ::dMMM}. Pick the book you want to read.",
		},
		sittingWelcomeVotingOpen: {
			title: "You joined {sitting}",
			body: "Voting is open. Pick the book you want to read.",
		},
		viewMilestone: {
			title:
				"{resource, select, user {Your profile} post {Your post} shelf {Your shelf} other {Your review}} reached {mark, number} views",
			body: "{resource, select, user {See who is looking in your insights.} other {{item} · open its insights to see where views come from.}}",
		},
		viewsDigest: {
			title: "Your week on BBRC: {total, plural, one {# view} other {# views}}",
			body: "Most opened: {top} ({views, number}).",
		},
		readingBehind: {
			title:
				"{hasBook, select, yes {You are behind on {book}} other {You are behind on your book}}",
			body: "{unit, select, pages {You need about {amount, plural, one {# page} other {# pages}} a day to finish by the deadline.} other {You need about {amount, number}% a day to finish by the deadline.}}",
		},
		mention: {
			title: "{actor} mentioned you",
			body: "{hasExcerpt, select, yes {{excerpt}} other {You were mentioned.}}",
		},
	},
});
