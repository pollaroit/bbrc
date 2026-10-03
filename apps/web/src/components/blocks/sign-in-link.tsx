"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { authPageHref, currentPageCallbackUrl } from "@/lib/auth-callback-url";

type SignInLinkProps = {
	className?: string;
	children: React.ReactNode;
};

export function useSignInHref(): Route {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	return authPageHref(
		"/sign-in",
		currentPageCallbackUrl(pathname, searchParams.toString()),
	);
}

export function SignInLink({ className, children }: SignInLinkProps) {
	const href = useSignInHref();

	return (
		<Link href={href} className={className}>
			{children}
		</Link>
	);
}
