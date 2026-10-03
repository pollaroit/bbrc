import { openLibraryWorkPageUrl } from "@bbrc/shared";

type OpenLibraryWorkTitleLinkProps = {
	olid: string;
	title: string;
	className?: string;
};

export function OpenLibraryWorkTitleLink({
	olid,
	title,
	className = "font-medium text-sm leading-snug underline-offset-2 hover:underline",
}: OpenLibraryWorkTitleLinkProps) {
	const href = openLibraryWorkPageUrl(olid);

	if (!href) {
		return <p className={className}>{title}</p>;
	}

	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className={className}
		>
			{title}
		</a>
	);
}
