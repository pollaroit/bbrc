// Social sites
//
// `slug` is used to retrieve the platform icon.
// `website` is the platform's canonical base URL.
// `regex` validates the user's public profile URL.
// `example` demonstrates an accepted URL format.
//
// Note: Regex validation checks URL shape only. It does not
// verify that a profile exists or is publicly accessible.

type SocialSite = {
	name: string;
	description?: string;
	slug: string;
	website: string;
	regex: RegExp;
	example: string;
};

export const socialSites = [
	{
		name: "Instagram",
		slug: "instagram",
		description:
			"Share your Instagram profile to let others discover your photos, videos, and stories.",
		website: "https://www.instagram.com/",
		regex: /^https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._]{1,30}\/?$/i,
		example: "https://www.instagram.com/john_doe",
	},
	{
		name: "X (Twitter)",
		slug: "twitter",
		description:
			"Connect your X profile to share your posts, opinions, and conversations.",
		website: "https://x.com/",
		regex:
			/^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[a-zA-Z0-9_]{1,15}\/?$/i,
		example: "https://x.com/john_doe",
	},
	{
		name: "LinkedIn",
		slug: "linkedin",
		description:
			"Share your professional profile, career experience, and work-related achievements.",
		website: "https://www.linkedin.com/",
		regex:
			/^https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[a-zA-Z0-9_%.-]+\/?$/i,
		example: "https://www.linkedin.com/in/john-doe",
	},
	{
		name: "Facebook",
		slug: "facebook",
		description:
			"Connect your Facebook profile so others can find you and your public posts.",
		website: "https://www.facebook.com/",
		regex:
			/^https?:\/\/(?:www\.|m\.)?facebook\.com\/(?:profile\.php\?id=\d+|[a-zA-Z0-9.]+)\/?$/i,
		example: "https://www.facebook.com/john.doe",
	},
	{
		name: "Tumblr",
		slug: "tumblr",
		description:
			"Share your Tumblr blog, writing, artwork, and other creative posts.",
		website: "https://www.tumblr.com/",
		regex:
			/^https?:\/\/(?:www\.)?(?:[a-zA-Z0-9-]+\.tumblr\.com|tumblr\.com\/[a-zA-Z0-9_-]+)\/?$/i,
		example: "https://john-doe.tumblr.com",
	},
	{
		name: "Pinterest",
		slug: "pinterest",
		description:
			"Show your Pinterest profile, including your collections, interests, and inspiration boards.",
		website: "https://www.pinterest.com/",
		regex:
			/^https?:\/\/(?:www\.)?pinterest\.(?:com|[a-z]{2})\/[a-zA-Z0-9_-]+\/?$/i,
		example: "https://www.pinterest.com/john_doe",
	},
	{
		name: "YouTube",
		slug: "youtube",
		description:
			"Share your YouTube channel so others can discover your videos and subscriptions.",
		website: "https://www.youtube.com/",
		regex:
			/^https?:\/\/(?:www\.)?youtube\.com\/(?:@[a-zA-Z0-9._-]{3,30}|channel\/UC[a-zA-Z0-9_-]{22}|c\/[a-zA-Z0-9._-]+|user\/[a-zA-Z0-9._-]+)\/?$/i,
		example: "https://www.youtube.com/@johndoe",
	},
	{
		name: "Discord",
		slug: "discord",
		description:
			"Share your Discord user profile link so others can find you on Discord.",
		website: "https://discord.com/",
		regex: /^https?:\/\/(?:www\.)?discord\.com\/users\/\d{17,20}\/?$/i,
		example: "https://discord.com/users/123456789012345678",
	},
	{
		name: "GitHub",
		slug: "github",
		description:
			"Show your GitHub profile, repositories, open-source contributions, and development projects.",
		website: "https://github.com/",
		regex:
			/^https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?\/?$/i,
		example: "https://github.com/johndoe",
	},
	{
		name: "Goodreads",
		slug: "goodreads",
		description:
			"Connect your Goodreads profile to share your reading history, ratings, reviews, and bookshelves.",
		website: "https://www.goodreads.com/",
		regex:
			/^https?:\/\/(?:www\.)?goodreads\.com\/user\/show\/\d+(?:-[a-zA-Z0-9_-]+)?\/?$/i,
		example: "https://www.goodreads.com/user/show/12345678-john-doe",
	},
	{
		name: "Open Library",
		slug: "openlibrary",
		description:
			"Share your Open Library reader profile and public reading lists.",
		website: "https://openlibrary.org/",
		regex: /^https?:\/\/openlibrary\.org\/people\/[a-zA-Z0-9_-]+\/?$/i,
		example: "https://openlibrary.org/people/john_doe",
	},
	{
		name: "The StoryGraph",
		slug: "storygraph",
		description:
			"Share your StoryGraph profile, reading statistics, reviews, and personalized book recommendations.",
		website: "https://app.thestorygraph.com/",
		regex: /^https?:\/\/app\.thestorygraph\.com\/profile\/[a-zA-Z0-9_-]+\/?$/i,
		example: "https://app.thestorygraph.com/profile/john_doe",
	},
	{
		name: "Hardcover",
		slug: "hardcover",
		description:
			"Connect your Hardcover reader profile to share your library, reading progress, ratings, and book lists.",
		website: "https://hardcover.app/",
		regex: /^https?:\/\/(?:www\.)?hardcover\.app\/@?[a-zA-Z0-9_-]+\/?$/i,
		example: "https://hardcover.app/@johndoe",
	},
] as const satisfies readonly SocialSite[];
