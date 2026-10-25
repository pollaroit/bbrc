import { Button } from "@bbrc/ui/components/button";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export function AddBookPageHeader() {
	return (
		<header className="flex flex-col gap-3 border-border border-b pb-5">
			<Button
				render={<Link href={"/books" as Route} />}
				nativeButton={false}
				variant="ghost"
				size="sm"
				className="-ml-2 w-fit gap-1.5 text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				Back to books
			</Button>
			<div className="space-y-1">
				<h1 className="font-bold text-2xl tracking-tight">Add a book</h1>
				<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
					Search by title, or paste an Open Library link, a Goodreads link or an
					ISBN. Pick a book, check the details and save. Press{" "}
					<kbd className="border border-border bg-muted px-1 font-mono text-2xs">
						?
					</kbd>{" "}
					for keyboard shortcuts.
				</p>
			</div>
		</header>
	);
}
