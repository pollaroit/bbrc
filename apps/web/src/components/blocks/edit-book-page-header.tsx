import type { TGetBookBySlugOutputSchema } from "@bbrc/api/modules/book/book.schema";
import { Button } from "@bbrc/ui/components/button";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import { Link } from "@/i18n/navigation";

type EditBookPageHeaderProps = {
	book: Pick<TGetBookBySlugOutputSchema, "title" | "slug">;
};

export function EditBookPageHeader({ book }: EditBookPageHeaderProps) {
	return (
		<header className="flex flex-col gap-4 border-border border-b pb-6">
			<Button
				render={<Link href={`/books/${book.slug}` as Route} />}
				nativeButton={false}
				variant="ghost"
				size="sm"
				className="-ml-2 w-fit gap-1.5 text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				Back to book
			</Button>
			<div className="space-y-1.5">
				<h1 className="font-bold text-2xl tracking-tight">Edit book</h1>
				<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
					Update library metadata for{" "}
					<span className="font-medium text-foreground">{book.title}</span>.
				</p>
			</div>
		</header>
	);
}
