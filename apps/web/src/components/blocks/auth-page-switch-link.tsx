"use client";

import { Button } from "@bbrc/ui/components/button";
import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authPageHref, safeCallbackUrl } from "@/lib/auth-callback-url";

type AuthPageSwitchLinkProps = {
	target: "/sign-in" | "/sign-up";
	label: string;
};

export function AuthPageSwitchLink({ target, label }: AuthPageSwitchLinkProps) {
	const searchParams = useSearchParams();
	const callbackUrl = safeCallbackUrl(searchParams.get("callback_url"));
	const href = authPageHref(target, callbackUrl === "/" ? null : callbackUrl);

	return (
		<Button
			variant="link"
			className="px-1"
			render={<Link href={href as Route} />}
			nativeButton={false}
		>
			{label}
		</Button>
	);
}
