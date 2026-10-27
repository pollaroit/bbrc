import { Button } from "@bbrc/ui/components/button";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import { Link } from "@/i18n/navigation";

export function RequestBookPageHeader() {
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
				<h1 className="font-bold text-2xl tracking-tight">Request a book</h1>
				<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
					Find a title the club does not have yet and ask admins to add it. See
					what others want, say “me too”, or look at suggestions made for you.
					Press{" "}
					<kbd className="border border-border bg-muted px-1 font-mono text-2xs">
						?
					</kbd>{" "}
					for keyboard shortcuts.
				</p>
			</div>
		</header>
	);
}
