import { Button } from "@bbrc/ui/components/button";
import Link from "next/link";
import { authPageHref } from "@/lib/auth-callback-url";

/**
 * What a signed-out visitor (or a link-preview crawler) sees at an invitation
 * link. It says nothing about the sitting: the details are shown after sign-in.
 */
export function SittingInviteSignIn({ token }: { token: string }) {
	const back = `/sittings/join/${token}`;

	return (
		<div className="flex max-w-2xl flex-col gap-6">
			<header className="flex flex-col gap-1">
				<h1 className="font-semibold text-2xl tracking-tight">
					You are invited to a reading sitting
				</h1>
				<p className="text-muted-foreground text-sm">
					Sign in to see the sitting and join the club's reading.
				</p>
			</header>
			<div className="flex flex-col gap-2 sm:flex-row">
				<Button
					render={<Link href={authPageHref("/sign-in", back)} />}
					nativeButton={false}
					className="w-full sm:w-auto"
				>
					Sign in
				</Button>
				<Button
					render={<Link href={authPageHref("/sign-up", back)} />}
					nativeButton={false}
					variant="outline"
					className="w-full sm:w-auto"
				>
					Create an account
				</Button>
			</div>
		</div>
	);
}
