import { ComposePostProvider } from "@/components/blocks/compose-post-provider";

/** Reading Mode has no site navigation, but sharing a session still opens the post composer. */
export default function ReadingLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <ComposePostProvider>{children}</ComposePostProvider>;
}
