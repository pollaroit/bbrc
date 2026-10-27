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
	mobile: {
		home: "Home",
		mainNav: "Main",
		browseAria: "Browse club sections",
		accountAria: "Account menu",
		you: "You",
	},
	notifications: {
		title: "Notifications",
		titleWithUnread: "Notifications, {count} unread",
		overNine: "9+",
		markAllRead: "Mark all read",
		loading: "Loading…",
		empty: "No notifications yet.",
		settings: "Notification settings",
	},
	pwa: {
		offline:
			"You’re offline — showing saved content. Actions that need the network are unavailable.",
		installLabel: "Install BBRC",
		installTitle: "Add BBRC to your home screen",
		installIos:
			"Tap <share></share> Share, then choose Add to Home Screen for a full-screen app.",
		installOther:
			"Install for faster access, pull to refresh, and a stable tab bar.",
		install: "Install",
		notNow: "Not now",
		dismissForever: "Dismiss install hint permanently",
		updateReady: "Update ready",
		updateDescription: "Reload to use the latest version.",
		reload: "Reload",
		systemAlert:
			"{count, plural, one {You have a new alert in the bell menu.} other {You have # unread alerts in the bell menu.}}",
	},
	search: {
		title: "Search the club",
		description: "Find books, members, posts and more, or jump to a page",
		placeholder: "Search or type a command…",
		triggerMobile: "Search",
		triggerDesktop: "Search the club",
		goTo: "Go to",
		results: "Results",
		recent: "Recent",
		clear: "Clear",
		signInToUse: "Sign in to use this",
		moreHidden: "{count} more, keep typing to narrow",
		openPage: "Open a specific page",
		pagesChip: "pages",
		membersHint: "Type a name or username to search members only.",
		searching: "Searching",
		noMatches: "No matches",
		noMatchesBody:
			"Nothing matched <hl>“{query}”</hl>. Try a book title, author, or @username.",
		noCommand: "No command found",
		noCommandBody:
			"No command starts with <hl>“{query}”</hl> for you. Delete the <code>{symbol}</code> to search everything.",
		footerWithQuery: "Commands and results from across the club",
		footerIdle: "Club-wide search",
		keys: {
			move: "move",
			pages: "pages",
			open: "open",
			close: "close",
		},
		idle: {
			commands:
				"Try <code>{settings}</code>, <code>{create}</code> or <code>{admin}</code>",
			symbols:
				"<code>{at}</code> searches members, <code>{gt}</code> shows commands only",
			random:
				"<code>{example}</code> picks a book you have not read, under 400 pages",
		},
		toasts: {
			signInToFilter: "Sign in to filter by what you have read (ir / nr).",
			picking: "Picking a book…",
			pickedOf: "{title} (1 of {matched})",
			couldNotPick: "Could not pick a book.",
		},
		types: {
			book: "Book",
			user: "Member",
			post: "Post",
			feedback: "Review",
			comment: "Comment",
			shelf: "Shelf",
			document: "Document",
			author: "Author",
			goal: "Goal",
			series: "Series",
		},
		pages: {
			book: {
				about: "About",
				editions: "Editions",
				documents: "Documents",
				shelves: "Shelves",
				reviews: "Reviews",
				reads: "Reads",
				sittings: "Sittings",
				stats: "Stats",
				favorites: "Favorites",
				quizzes: "Quizzes",
				more: "More to read",
				insights: "Insights",
			},
			user: {
				sittings: "Sittings",
				reads: "Reads",
				quizzes: "Quizzes",
				posts: "Feed",
				feedbacks: "Feedbacks",
				shelves: "Shelves",
				goals: "Goals",
				mentions: "Mentions",
				achievements: "Achievements",
				stats: "Stats",
				xp: "XP",
				rp: "RP",
			},
			author: {
				books: "Books",
				about: "About",
				more: "Similar authors",
				reads: "Reads",
				reviews: "Reviews",
				posts: "Posts",
				sittings: "Sittings",
				favorites: "Favorites",
				shelves: "Shelves",
				series: "Series",
				followers: "Followers",
				stats: "Stats",
			},
		},
		commands: {
			profile: {
				label: "My profile",
				description: "Open your profile",
			},
			read: {
				label: "Read",
				description: "Go to the sitting you are reading",
			},
			random: {
				label: "Random book",
				description: "Pick a book for me. Add filters like :nr:p<400",
			},
			settings: {
				label: "Settings",
				description: "Your account settings",
			},
			authors: {
				label: "Authors",
				description: "Writers in the club catalog",
			},
			books: {
				label: "Books",
				description: "The club library. Add filters like :p<300:a[orwell]",
			},
			shelves: {
				label: "Shelves",
				description: "Member-curated lists",
			},
			series: {
				label: "Series",
				description: "Multi-volume reading order",
			},
			people: {
				label: "People",
				description: "Everyone in the club",
			},
			sittings: {
				label: "Sittings",
				description: "Club reading rounds",
			},
			achievements: {
				label: "Achievements",
				description: "Badges you can earn",
			},
			reels: {
				label: "Reels",
				description: "Short fact replays from the club",
			},
			goals: {
				label: "My goals",
				description: "Your reading goals",
			},
			leaderboard: {
				label: "Leaderboard",
				description: "XP, reads, and rankings",
			},
			createPost: {
				label: "Create post",
				description: "Write a new post",
			},
			createShelf: {
				label: "Create shelf",
				description: "Start a new shelf",
			},
			createGoal: {
				label: "Create goal",
				description: "Set a reading goal",
			},
			createSitting: {
				label: "Create sitting",
				description: "Start a new reading round",
			},
			add: {
				label: "Add a book",
				description: "Add a book to the library",
			},
			request: {
				label: "Request a book",
				description: "Ask admins to add a book",
			},
			theme: {
				label: "Switch theme",
				description: "Toggle light and dark mode",
			},
			signout: {
				label: "Sign out",
				description: "Sign out of your account",
			},
			signin: {
				label: "Sign in",
				description: "Sign in to your account",
			},
			signup: {
				label: "Sign up",
				description: "Create an account",
			},
		},
		profileTabs: {
			sittings: {
				label: "My sittings",
				description: "Open your sittings tab",
			},
			reads: {
				label: "My reads",
				description: "Open your reads tab",
			},
			quizzes: {
				label: "My quizzes",
				description: "Open your quizzes tab",
			},
			posts: {
				label: "My feed",
				description: "Open your feed tab",
			},
			feedbacks: {
				label: "My feedbacks",
				description: "Open your feedbacks tab",
			},
			shelves: {
				label: "My shelves",
				description: "Open your shelves tab",
			},
			goals: {
				label: "My goals",
				description: "Open your goals tab",
			},
			achievements: {
				label: "My achievements",
				description: "Open your achievements tab",
			},
			stats: {
				label: "My stats",
				description: "Open your stats tab",
			},
			xp: {
				label: "My xp history",
				description: "Open your xp history tab",
			},
			rp: {
				label: "My rp history",
				description: "Open your rp history tab",
			},
		},
		boards: {
			xp: {
				label: "Leaderboard · XP",
				description: "Top members by xp",
			},
			rp: {
				label: "Leaderboard · Reading points",
				description: "Top members by reading points",
			},
			reads: {
				label: "Leaderboard · Reads",
				description: "Top members by reads",
			},
			posts: {
				label: "Leaderboard · Posts",
				description: "Top members by posts",
			},
			participations: {
				label: "Leaderboard · Participations",
				description: "Top members by participations",
			},
		},
		settingsPages: {
			profile: {
				label: "Profile settings",
				description: "Name, bio, photo and links",
			},
			preferences: {
				label: "Preferences",
				description:
					"Look, text size, joins, invites and what others can do with you",
			},
			notifications: {
				label: "Notification settings",
				description: "What you hear about",
			},
			sessions: {
				label: "Session settings",
				description: "Where you are signed in",
			},
			accounts: {
				label: "Account settings",
				description: "Connected accounts",
			},
		},
		filters: {
			booksRead: "books I read",
			booksUnread: "books I have not read",
			any: "any book",
			by: "by {authors}",
			or: "{a} or {b}",
			rangeBetween: "{min}–{max} {unit}",
			rangeMin: "{min}+ {unit}",
			rangeMax: "up to {max} {unit}",
			units: {
				pages: "pages",
				reads: "reads",
				reviews: "reviews",
				clubRating: "club rating",
			},
			publishedSame: "published {year}",
			publishedBetween: "published {min}–{max}",
			publishedFrom: "published {min} or later",
			publishedUntil: "published {max} or earlier",
		},
	},
	error: {
		title: "Something went wrong on this page",
		description:
			"Your action may have gone through. Reload the section to check.",
		retry: "Try again",
	},
	offline: {
		title: "No connection",
		body: "Pages you already opened may still work. Anything new needs the network.",
		tryAgain: "Try again",
		goHome: "Go to home",
	},
	home: {
		meta: {
			title: "Feed",
			description: "Club activity and the current reading sitting at a glance.",
		},
		title: "Feed",
		subtitle: "Club activity and the current sitting at a glance.",
	},
	ongoing: {
		pollCloses: "Poll closes",
		readingDeadline: "Reading deadline",
		participants: "Participants",
		voteInPoll: "Vote in poll",
		openSitting: "Open sitting",
		openSittingAria: "Open sitting: {title}",
		sittingInProgress: "Sitting in progress",
		seeParticipants:
			"{count, plural, one {See the # participant} other {See the # participants}}",
	},
	trending: {
		title: "Most viewed this week",
		views: "{count, plural, one {# view} other {# views}}",
	},
	theme: {
		toggle: "Toggle light and dark theme",
		tooltip: "Toggle theme",
	},
	ui: {
		infiniteScroll: {
			emptyTitle: "Nothing here yet",
			errorTitle: "Something went wrong",
			errorFallback: "Failed to load content.",
			retry: "Try again",
		},
		dateSelector: {
			selectDate: "Select date",
			apply: "Apply",
			cancel: "Cancel",
			clear: "Clear",
			today: "Today",
			is: "is",
			before: "before",
			after: "after",
			between: "between",
			day: "Day",
			month: "Month",
			quarter: "Quarter",
			halfYear: "Half-year",
			year: "Year",
			quarterShort: "Q{n}",
			halfYearShort: "H{n}",
			placeholder: "Select date...",
			rangePlaceholder: "Select date range...",
		},
		labels: {
			close: "Close",
			loading: "Loading",
			toggleSidebar: "Toggle Sidebar",
			scrollToEnd: "Scroll to end",
			scrollToStart: "Scroll to start",
		},
		queryError: {
			prefix: "Error: {message}",
			retry: "retry",
		},
	},
});
