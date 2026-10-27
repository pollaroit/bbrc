import { notFound } from "next/navigation";
import { db } from "@/services";
import { StoryDevPreview } from "./story-dev-preview";

export const dynamic = "force-dynamic";

export default async function StoryDevPage() {
	if (process.env.NODE_ENV === "production") {
		notFound();
	}

	const book = await db.book.findFirst({
		orderBy: { createdAt: "desc" },
		select: { slug: true },
	});

	return <StoryDevPreview defaultBookSlug={book?.slug ?? ""} />;
}
