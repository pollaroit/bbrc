import { defineMessages } from "../../types";

/** Interface texts of the `shell` area. */
export const shell = defineMessages({
	header: {
		nav: {
			library: "Library",
			sittings: "Sittings",
			leaderboard: "Leaderboard",
		},
		signIn: "Sign in",
		getStarted: "Get Started",
		read: "Read",
		signOut: "Sign out",
		signOutFailed: "Failed to sign out",
	},
	userMenu: {
		title: "You",
		yourActivity: "Your activity",
		account: "Account",
		profile: "Profile",
		myReads: "My reads",
		myPosts: "My posts",
		myFeedbacks: "My feedbacks",
		myShelves: "My shelves",
		myGoals: "My goals",
		myStats: "My stats",
		settings: "Settings",
		blockedWorks: "Blocked works",
		dashboard: "Dashboard",
		factReplays: "My fact replays",
	},
	browse: {
		title: "Browse",
		later: "Later",
		sections: {
			catalog: "Catalog",
			club: "Club",
		},
		items: {
			authors: {
				label: "Authors",
				description: "Writers in the club catalog",
			},
			series: {
				label: "Series",
				description: "Multi-volume reading order",
			},
			shelves: {
				label: "Shelves",
				description: "Member-curated lists",
			},
			people: {
				label: "People",
				description: "Everyone in the club",
			},
			achievements: {
				label: "Achievements",
				description: "Badges you can earn",
			},
			sittings: {
				label: "Sittings",
				description: "Club reading rounds",
			},
			leaderboard: {
				label: "Leaderboard",
				description: "XP, reads, and rankings",
			},
			reels: {
				label: "Reels",
				description: "Short fact replays from the club",
			},
		},
		placeholders: {
			clubStats: {
				label: "Club stats",
				description: "Coming soon",
			},
		},
	},
	create: {
		title: "Create",
		items: {
			post: {
				label: "Create post",
				description: "Share with the club feed",
			},
			shelf: {
				label: "Create shelf",
				description: "Curate a public list",
			},
			goal: {
				label: "Add goal",
				description: "Track a reading target",
			},
			book: {
				label: "Add book",
				description: "From Open Library",
			},
			author: {
				label: "Add author",
				description: "Admin catalog",
			},
			series: {
				label: "Add series",
				description: "Admin catalog",
			},
			requestBook: {
				label: "Request book",
				description: "Suggest for the library",
			},
			sitting: {
				label: "Start sitting",
				description: "Open a new reading round",
			},
		},
	},
});
