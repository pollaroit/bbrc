/** Optional hook supplied by the Next.js app to purge ISR caches after mutations. */
export type IsrRevalidator = {
	revalidateBook: (slug: string) => void;
	revalidateSitting: (slug: string) => void;
	revalidatePost: (slug: string) => void;
	revalidateUser: (username: string) => void;
	revalidateUserShelves: (username: string, shelfSlug?: string) => void;
	revalidateHome: () => void;
	revalidateFeeds: () => void;
	revalidateSeries: (slug: string) => void;
	revalidateBooksCatalog: () => void;
};
