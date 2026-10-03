import { Button } from "@bbrc/ui/components/button";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

type CreateShelfPageHeaderProps = {
	username: string;
};

export function CreateShelfPageHeader({
	username,
}: CreateShelfPageHeaderProps) {
	return (
		<header className="flex flex-col gap-4 border-border border-b pb-6">
			<Button
				render={<Link href={`/users/${username}/shelves` as Route} />}
				nativeButton={false}
				variant="ghost"
				size="sm"
				className="-ml-2 w-fit gap-1.5 text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				Back to shelves
			</Button>
			<div className="space-y-1.5">
				<h1 className="font-bold text-2xl tracking-tight">New shelf</h1>
				<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
					Name your list, choose whether it is public, and pick how books
					appear. You can add up to 50 books from any library page.
				</p>
			</div>
		</header>
	);
}
