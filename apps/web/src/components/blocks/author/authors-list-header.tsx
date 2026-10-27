"use client";

import { Button } from "@bbrc/ui/components/button";
import { ShieldCheck, UserPlus } from "lucide-react";
import type { Route } from "next";
import { AuthorsListToolbar } from "@/components/blocks/author/authors-list-toolbar";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

export function AuthorsListHeader() {
	const { data: session } = authClient.useSession();
	const isAdmin = session?.user.isAdmin === true;

	return (
		<section className="flex flex-col border border-border bg-card">
			<div className="flex flex-col gap-5 border-border border-b px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
				<div className="flex max-w-2xl flex-col gap-2">
					<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
						Authors
					</h1>
					<p className="text-muted-foreground text-sm leading-relaxed">
						The writers behind the club's books. Follow an author to hear when a
						new book of theirs is added.
					</p>
				</div>
				{isAdmin ? (
					<div className="flex flex-wrap gap-2 lg:shrink-0">
						<Button
							render={<Link href={"/authors/new" as Route} />}
							nativeButton={false}
							size="sm"
						>
							<UserPlus data-icon="inline-start" />
							Add author
						</Button>
						<Button
							render={<Link href={"/admin/authors" as Route} />}
							nativeButton={false}
							variant="outline"
							size="sm"
						>
							<ShieldCheck data-icon="inline-start" />
							Manage authors
						</Button>
					</div>
				) : null}
			</div>
			<div className="bg-muted/20 px-4 py-5 sm:px-6">
				<AuthorsListToolbar />
			</div>
		</section>
	);
}
