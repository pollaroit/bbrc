import { Button } from "@bbrc/ui/components/button";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

export function AddBookPageHeader() {
	return (
		<header className="flex flex-col gap-4 border-border border-b pb-6">
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
			<div className="space-y-1.5">
				<h1 className="font-bold text-2xl tracking-tight">Add book</h1>
				<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
					Search Open Library for a work, then fill in club-specific details
					(pages and optional rating). Cover and bibliographic fields come from
					Open Library.
				</p>
			</div>
		</header>
	);
}
