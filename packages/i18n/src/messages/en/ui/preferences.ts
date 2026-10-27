import { defineMessages } from "../../types";

/** Preferences screen. */
export const preferences = defineMessages({
	page: {
		metaTitle: "Preferences",
		metaDescription:
			"Theme, fonts, text size, reading and display options for BBRC.",
		title: "Preferences",
		intro:
			"Make BBRC look and read the way you like: colours, fonts, text size, motion and how dates are shown.",
	},
	common: {
		saveFailed: "Could not save that setting.",
		signInToChange: "Sign in to change this one.",
	},
	signedOutNotice:
		"You are not signed in, so these settings stay on this device. Sign in to keep them everywhere.",
	sectionsLabel: "Preference sections",
	sections: {
		appearance: "Appearance",
		language: "Language",
		accessibility: "Accessibility",
		reading: "Reading",
		"reading-privacy": "Wishlist",
		ratings: "Ratings",
		shelves: "Shelves",
		polls: "Polls",
		mentions: "Mentions",
		compare: "Comparing",
		posts: "Posts",
		sittings: "Sittings",
		time: "Time and format",
		search: "Search",
		sync: "Sync and reset",
	},
	appearance: {
		title: "Appearance",
		description: "Pick how the club looks. Changes apply instantly.",
		mode: "Mode",
		modeHint: "Follow your device, or always use light or dark.",
		modeLocked:
			"The {palette} palette only works in {mode} mode. Pick another palette to choose.",
		modeSystem: "System",
		modeLight: "Light",
		modeDark: "Dark",
		palette: "Palette",
		paletteHint:
			"The colours used across the site. Most come in light and dark.",
		paletteLabel: "{name} palette",
		lightOnly: "light only",
		darkOnly: "dark only",
		searchPalettes: "Search palettes…",
		searchPalettesLabel: "Search palettes",
		noPaletteMatches: "No palette matches “{query}”.",
		paletteCredit:
			"Most palettes are presets from <link>tweakcn</link>, lightly adjusted so text stays easy to read.",
		bodyFont: "Body font",
		bodyFontHint:
			"Used for most text. The default, Geist Mono, is the club's own look.",
		headingFont: "Heading font",
		headingFontHint: "Titles and section headings.",
		readingFont: "Reading font",
		readingFontHint:
			"Reviews, posts, comments and bios, where you read longer text.",
		sameAsBody: "Same as body",
		sameAsBodyLabel: "Same as body font",
		followsBody: "Follows your body font",
		latinOnly: "Latin only",
		fontNotes: {
			"geist-mono": "The club's own look",
			geist: "Clean sans-serif",
			inter: "Neutral and familiar",
			"plex-sans": "Technical, friendly",
			atkinson: "Made for easy reading",
			literata: "A serif made for books",
			"source-serif": "Classic, sturdy serif",
			"space-grotesk": "Geometric with character",
			bricolage: "Chunky and playful",
			fraunces: "Soft, old-style serif",
			playfair: "Elegant, high contrast",
			"system-sans": "Your device's own font",
			"system-serif": "Your device's own serif",
		},
		textSize: "Text size",
		textSizeHint: "Makes text bigger or smaller everywhere. Layout stays put.",
		textSizes: {
			sm: "Small",
			md: "Default",
			lg: "Large",
			xl: "Extra large",
		},
		lineSpacing: "Line spacing",
		lineSpacingHint:
			"More space between lines can make long text easier to follow.",
		lineSpacings: {
			compact: "Compact",
			normal: "Default",
			relaxed: "Relaxed",
		},
		corners: "Corners",
		cornersHint:
			"How round boxes, buttons and inputs are. None is the club's sharp look.",
		cornersOption: "{size} corners",
		radii: {
			none: "None",
			xs: "XS",
			sm: "SM",
			md: "MD",
			lg: "LG",
			xl: "XL",
		},
		livePreview: "Live preview",
		previewTitle: "Beloved, by Toni Morrison",
		previewText:
			"“Definitions belonged to the definers, not the defined.” A story about memory, freedom and what we carry. Tap a palette or font above and this card changes with you.",
		previewMarkRead: "Mark as read",
		previewAddToShelf: "Add to shelf",
		previewCompleted: "Completed",
		previewReading: "Reading",
		previewWishlist: "Wishlist",
		previewLiked: "Liked",
		previewMuted:
			"Muted text looks like this. {rating} out of 5 stars · {pages, plural, one {# page} other {# pages}} · {reads, plural, one {# read} other {# reads}}.",
	},
	accessibility: {
		title: "Accessibility",
		description: "Make the site calmer and easier to read.",
		motion: "Motion",
		motionHint: "Animations like the like heart and sliding panels.",
		motionSystem: "Match my device",
		motionReduce: "Reduce",
		motionFull: "Full",
		contrast: "High contrast",
		contrastHint: "Stronger borders and darker secondary text, in any palette.",
		easyReading: "Easy-reading preset",
		easyReadingHint:
			"Atkinson Hyperlegible font, larger text and roomier lines.",
		easyReadingApplied: "Easy-reading preset applied",
		applyPreset: "Apply preset",
	},
	reading: {
		title: "Reading",
		description: "How reviews, spoilers and reads behave for you.",
		spoilers: "Spoilers",
		spoilersHint: "Reviews, posts and comments marked as spoilers.",
		spoilersHide: "Hide until I tap",
		spoilersShow: "Always show",
		defaultDate: "Fill in today's date when I mark a book as read",
		defaultDateHint: "You can still change the month and year each time.",
	},
	privacy: {
		title: "Wishlist and what I'm reading",
		description:
			"Who can see your wishlist and the books you are reading right now.",
		wishlistPrivate: "Keep my wishlist private",
		wishlistPrivateHint:
			"On: only you can open your wishlist. Others only see how many members want a book, never who. Off: anyone can open it.",
		showReading: "Show what I'm reading",
		showReadingHint:
			"Members can see your current books on your profile and on each book's Reading page. Off: you still count in the totals, without your name.",
		showProgress: "Show my reading progress",
		showProgressHint:
			"On: others see how far along you are. Off: they only see that you are reading the book.",
	},
	shelves: {
		title: "Shelves",
		description: "How other members can work with you on shelves.",
		allowInvites: "Allow people to invite me to collaborate on shelves",
		allowInvitesHint:
			"When this is off, nobody can invite you. Shelves you already collaborate on are not affected.",
	},
	polls: {
		title: "Polls",
		description: "How other members can include you in their polls.",
		allowOption: "Allow people to use me as an option in polls",
		allowOptionHint:
			"When this is off, nobody can pick you as a poll option. Polls that already include you stay as they are.",
	},
	mentions: {
		title: "Mentions",
		description:
			"Whether other members can mention you with @ in posts, comments and reviews.",
		allow: "Allow others to mention me",
		allowHint:
			"Turn off to stop appearing when people type @. Mentions that already exist stay.",
	},
	compare: {
		title: "Comparing",
		description: "Whether other members can compare their reading with yours.",
		allow: "Allow others to compare with me",
		allowHint:
			"Other members can compare their reading with yours. Admins can always compare.",
	},
	posts: {
		title: "Posts",
		description: "How other members can mention you in their posts.",
		allowAttach: "Allow people to attach me to their posts",
		allowAttachHint:
			"When this is off, nobody can attach your profile to a post. Posts that already include you stay as they are.",
	},
	sittings: {
		title: "Sittings",
		description: "How organisers can bring you into a sitting.",
		allowAutoAdd: "Allow organisers to add me to sittings",
		allowAutoAddHint:
			"When this is off, organisers cannot add you directly. They can invite you instead, and you choose whether to accept. You can still join on your own.",
		allowInvites: "Allow organisers to invite me to sittings",
		allowInvitesHint:
			"When this is off, organisers cannot send you invitations either. You can still join with an invitation link or the Join button.",
	},
	time: {
		title: "Time and format",
		description: "How deadlines and dates are written.",
		zone: "Time zone",
		zoneHint:
			"Deadlines are set in club time ({zone}). Choose to see them in your device's time instead.",
		zoneClub: "Club time",
		zoneDevice: "My device's time",
		clock: "Clock",
		clockAuto: "Match my device",
		clock12: "12-hour",
		clock24: "24-hour",
		example: "Example: voting closes <date></date>",
	},
	search: {
		title: "Search",
		description:
			"Search remembers the last few things you opened on this device.",
		clear: "Clear recent searches",
		cleared: "Recent searches cleared",
		none: "Nothing saved right now.",
		saved:
			"{count, plural, one {# saved on this device.} other {# saved on this device.}}",
	},
	sync: {
		title: "Sync and reset",
		description: "Your choices are saved on this device straight away.",
		deviceOnly: "Keep these on this device only",
		deviceOnlyOn: "Other devices keep their own settings.",
		deviceOnlyOff: "Your settings follow you to every device you sign in on.",
		deviceOnlySignedOut:
			"Sign in to have your settings follow you to other devices.",
		reset: "Reset to defaults",
		confirmReset: "Yes, reset everything",
		keep: "Keep my settings",
		resetDone: "Preferences reset to the defaults",
	},
	ratingsEditor: {
		saveFailed: "Could not save that. Try again.",
		title: "Rating definitions",
		descriptionSignedIn:
			"What each rating means to you. These are shown when you rate, so you can judge every book by the same yardstick. Change any of them, or reset one to the default.",
		descriptionSignedOut:
			"What each rating means. Sign in to write your own wording for any of them.",
		dialogTitle: "{rating} stars: {label}",
		dialogDescription:
			"Write what this rating means to you. You will see it when you rate, so your ratings stay consistent.",
		textareaLabel: "What {rating} stars means to you",
		resetToDefault: "Reset to default",
		cancel: "Cancel",
		save: "Save",
		yourWording: "Your wording",
		edit: "Edit",
		reset: "Reset",
		resetLabel: "Reset {rating} stars to the default",
	},
});
