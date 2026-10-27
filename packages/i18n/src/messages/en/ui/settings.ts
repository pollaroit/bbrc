import { defineMessages } from "../../types";

/** Settings screens. */
export const settings = defineMessages({
	back: "Settings",
	index: {
		metaTitle: "Settings",
		metaDescription: "Manage your BBRC account preferences.",
		title: "Settings",
		intro: "Preferences for your account.",
		links: {
			preferences: {
				title: "Preferences",
				description: "Theme, fonts, text size, reading and display options.",
			},
			profile: {
				title: "Profile",
				description: "Birthday, bio, favorite genres, links and reading speed.",
			},
			following: {
				title: "Following",
				description: "Authors you follow and new-book alerts.",
			},
			sessions: {
				title: "Sessions",
				description: "See where you're signed in and log out of devices.",
			},
			notifications: {
				title: "Notifications",
				description: "Bell alerts and one-time ntfy phone setup.",
			},
		},
		usernameHeading: "Username",
		nameHeading: "Your name",
	},
	profile: {
		metaTitle: "Profile",
		metaDescription: "Edit your public BBRC profile.",
		title: "Profile",
		intro:
			"Tell other readers about yourself. Nothing is saved until you press Save changes.",
	},
	following: {
		metaTitle: "Following",
		metaDescription: "The authors you follow on BBRC.",
		title: "Following",
		intro:
			"Authors you follow. When the library adds a book by one of them you get a notification; switch that on or off in <link>Notifications</link>.",
		authorsTitle: "Authors",
		authorsDescription: "You are told when the library adds a book by them.",
		authorsEmpty: "You are not following any authors yet.",
		browseAuthors: "Browse authors",
		loadFailed: "Could not load what you follow.",
		tryAgain: "Try again",
		unfollowFailed: "Could not unfollow.",
		unfollowed: "Unfollowed {name}.",
		undo: "Undo",
		unfollow: "Unfollow",
		unfollowLabel: "Unfollow {name}",
		bookCount: "{count, plural, one {# book} other {# books}}",
	},
	notifications: {
		metaTitle: "Notification settings",
		metaDescription: "Choose in-app and push notifications for BBRC.",
		title: "Notifications",
		intro:
			"Choose what appears in the bell on the site and what is sent to your phone through ntfy. Set up phone push once using your personal topic below.",
	},
	sessions: {
		metaTitle: "Sessions",
		metaDescription: "Manage your active sessions.",
		title: "Sessions",
		intro:
			"Devices where you are signed in. Log out of any you don't recognize.",
		unknownDevice: "Unknown device",
		browserOnOs: "{browser} on {os}",
		browser: "Browser",
		thisDevice: "This device",
		signedIn: "Signed in {date}",
		signedInWithIp: "{ip} · Signed in {date}",
		logOut: "Log out",
		logOutOthers: "Log out of all other sessions",
		logOutAll: "Log out of all sessions",
		signedOutOne: "Session signed out",
		signedOutOthers: "Signed out of other sessions",
		signedOutAll: "Signed out everywhere",
		error: "Something went wrong",
	},
	avatar: {
		label: "Profile photo",
		description:
			"Replaces your current avatar. JPEG is stored at a fixed path; PNG and WebP are accepted on upload.",
	},
	name: {
		label: "Name",
		save: "Save name",
		updated: "Name updated",
		updateFailed: "Could not update name",
		invalid: "Enter a valid name.",
	},
	username: {
		label: "Username",
		save: "Save username",
		updated: "Username updated",
		updateFailed: "Could not update username",
		invalid: "Enter a valid username (letters, numbers, underscores).",
		loading: "Loading username settings…",
		loadFailed: "Could not load username settings.",
		cooldown:
			"You can change your username once every {days, plural, one {# day} other {# days}}.",
		neverChanged:
			"{cooldown} You have not changed it since signup, so you can update it now. Profile links use your username.",
		canUpdate: "{cooldown} Last changed {lastChanged}. You can update it now.",
		mustWait:
			"{cooldown} Last changed {lastChanged}. You can change it again in {remaining} ({nextAt}).",
		later: "later",
		aWhile: "a while",
		now: "now",
		remainingDays: "{count, plural, one {# day} other {# days}}",
		remainingHours: "{count, plural, one {# hour} other {# hours}}",
		remainingMinutes: "{count, plural, one {# minute} other {# minutes}}",
	},
	profileForm: {
		ageRange: "You must be between {min} and {max} years old.",
		websiteInvalid: "Enter a valid URL that starts with https://",
		bioTooLong:
			"Bio can be at most {max, plural, one {# character} other {# characters}}.",
		socialChooseSite: "Choose a site, or remove this link.",
		socialEnterUrl: "Enter your {site} URL, or remove this link.",
		socialWrongUrl: "Use a {site} profile URL, like {example}",
		saved: "Profile saved",
		saveFailed: "Could not save profile",
		fixFields: "Fix the highlighted fields to save.",
		aboutYou: "About you",
		dateOfBirth: "Date of birth",
		pickDate: "Pick a date",
		gender: "Gender",
		genders: {
			male: "Male",
			female: "Female",
			not_specified: "Prefer not to say",
		},
		location: "Location",
		locationPlaceholder: "City, Country",
		bio: "Bio",
		write: "Write",
		preview: "Preview",
		bioPlaceholder: "Tell other readers a little about yourself…",
		nothingToPreview: "Nothing to preview yet.",
		favoriteGenres: "Favorite genres",
		favoriteGenresHelp:
			"Pick the genres you love, then narrow them down with subgenres.",
		links: "Links",
		website: "Website",
		socialLinks: "Social links",
		readingSpeed: "Reading speed",
		readingSpeedHelp: "Used to estimate how long a book takes you to finish.",
		wordsPerMinute: "words per minute",
		setWpm: "Set new WPM",
		noChanges: "No unsaved changes",
		unsavedChanges: "You have unsaved changes",
		discard: "Discard",
		saveChanges: "Save changes",
		loading: "Loading profile…",
		loadFailed: "Could not load your profile.",
		socialSiteLabel: "Social site",
		chooseSite: "Choose site",
		chooseSiteFirst: "Choose a site first",
		siteProfileUrl: "{site} profile URL",
		profileUrl: "Profile URL",
		removeSocialLink: "Remove social link",
		addSocialLink: "Add social link",
		previousMonth: "Previous month",
		nextMonth: "Next month",
	},
	wpm: {
		title: "Measure your reading speed",
		textLanguage: "Text language",
		description:
			"Pick a language, start the timer, then read the passage at your normal pace. Press Finished when you reach the end.",
		idleHint: "The text appears when you start the timer.",
		result:
			"words per minute · {words, plural, one {# word} other {# words}} in {time}",
		start: "Start timer",
		finished: "Finished",
		tryAgain: "Try again",
		use: "Use {wpm} WPM",
	},
	pwaAlerts: {
		unsupported: "This browser does not support system alerts.",
		turnedOn: "System alerts turned on",
		denied: "Allow notifications in browser settings to use this.",
		title: "App-style alerts",
		installedTitle: "Installed app",
		installedDescription:
			"Sounds and system banners while BBRC runs from your home screen. For phone push when the app is fully closed, use ntfy below.",
		description:
			"Optional feedback when new bell alerts arrive while this tab is open or in the background. Install BBRC for the full experience.",
		sound: "Play a short sound for new bell alerts",
		banner: "Show a system banner when the app is in the background",
		allow: "Allow system alerts",
		note: "These use the same bell feed as the site. They do not replace ntfy push when BBRC is closed. Web Push in the service worker is planned for a later release.",
	},
	notificationsForm: {
		saved: "Notification preferences saved.",
		loading: "Loading preferences…",
		loadFailed: "Could not load notification preferences.",
		copied: "{label} copied",
		copyFailed: "Could not copy to clipboard",
		copyTopic: "Copy topic",
		ntfyTitle: "Phone push (ntfy)",
		ntfyDescription:
			"Push alerts go through <link>ntfy.sh</link>. You set this up once; sitting updates use the same personal topic—no new link each sitting.",
		stepInstall:
			"Install the <b>ntfy</b> app on your phone (App Store, Google Play, or F-Droid).",
		stepTurnOn:
			"Below, turn on <b>Phone</b> for the events you want, then click <b>Save preferences</b>.",
		stepSubscribe:
			"Copy <b>Your personal topic</b> and subscribe in ntfy: open the app → add subscription → paste the topic on your phone.",
		stepAdmin:
			"Admins: also subscribe to <b>Admin alerts</b> for request notifications.",
		personalTopic: "Your personal topic",
		personalTopicHelp:
			"All phone pushes for your account (including sitting polls and finishes) are delivered here. Subscribe once.",
		adminTopic: "Admin alerts",
		adminTopicHelp:
			"Book requests and other admin-only pushes. Subscribe in addition to your personal topic.",
		togglesTitle: "What the toggles mean",
		toggleBell:
			"<b>Bell</b> — show in the notification menu on BBRC when you are signed in.",
		togglePhone:
			"<b>Phone</b> — send a push to your personal ntfy topic (only if you subscribed in the ntfy app and saved Phone as on here).",
		bell: "Bell",
		phone: "Phone",
		save: "Save preferences",
	},
});
