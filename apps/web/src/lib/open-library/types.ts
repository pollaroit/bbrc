export type OpenLibrarySearchWork = {
	workKey: string;
	title: string;
	authors: string[];
	coverId: number | null;
	publishedIn: number | null;
	description: string | null;
};

export type OpenLibrarySearchResponse = {
	works: OpenLibrarySearchWork[];
};
