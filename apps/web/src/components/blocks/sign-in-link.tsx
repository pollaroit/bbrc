"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authPageHref } from "@/lib/auth-callback-url";

type SignInLinkProps = {
	className?: string;
	children: React.ReactNode;
};

export function useSignInHref(): Route {
	const pathname = usePathname();
	return authPageHref("/sign-in", pathname);
}

export function SignInLink({ className, children }: SignInLinkProps) {
	const href = useSignInHref();

	return (
		<Link href={href} className={className}>
			{children}
		</Link>
	);
}
