"use client";

import { Button } from "@bbrc/ui/components/button";
import type { Route } from "next";
import { BodyPortal } from "@/components/blocks/body-portal";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function ReelsEntryFab({ className }: { className?: string }) {
	const { data: session, isPending } = authClient.useSession();

	if (isPending || !session?.user) {
		return null;
	}

	return (
		<BodyPortal>
			<Button
				nativeButton={false}
				render={<Link href={"/reels" as Route} />}
				size="icon-lg"
				className={cn(
					"fixed right-4 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] z-40 size-12 shadow-lg md:right-6 md:bottom-24",
					className,
				)}
				aria-label="Fact reels"
			>
				<span className="font-serif text-lg leading-none" aria-hidden>
					?
				</span>
			</Button>
		</BodyPortal>
	);
}
