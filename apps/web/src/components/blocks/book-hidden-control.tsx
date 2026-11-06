"use client";

import { hasRoleAtLeast } from "@bbrc/shared";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Eye, EyeOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useBookHidden } from "@/lib/books/use-book-hidden";

/**
 * Admins only: keep a book out of sittings, or offer it to them again. A book a sitting
 * has already claimed cannot be hidden; the server says why and it is shown as a toast.
 */
export function BookHiddenControl({
	slug,
	hidden,
}: {
	slug: string;
	hidden: boolean;
}) {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const { setHidden, isPending } = useBookHidden();

	if (sessionPending || !hasRoleAtLeast(session?.user, "admin")) {
		return null;
	}

	return (
		<LoadingButton
			type="button"
			variant="outline"
			size="sm"
			loading={isPending}
			onClick={() => setHidden(slug, !hidden)}
			className="w-fit"
		>
			{hidden ? (
				<Eye className="size-4" aria-hidden />
			) : (
				<EyeOff className="size-4" aria-hidden />
			)}
			{hidden ? "Offer to sittings again" : "Hide from sittings"}
		</LoadingButton>
	);
}
