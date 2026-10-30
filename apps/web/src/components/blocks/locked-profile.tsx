import { Lock } from "lucide-react";

/** What a stranger sees of a private profile, below the name, photo and bio. */
export function LockedProfile({ name }: { name: string }) {
	return (
		<section
			aria-label="Private profile"
			className="flex flex-col items-center gap-3 border border-border border-dashed px-6 py-14 text-center"
		>
			<Lock className="size-6 text-muted-foreground" aria-hidden />
			<h2 className="font-semibold text-lg tracking-tight">
				This profile is private
			</h2>
			<p className="max-w-md text-muted-foreground text-sm leading-relaxed">
				Only {name}'s friends can see what they read, review and post. Send a
				friend request to ask.
			</p>
		</section>
	);
}
