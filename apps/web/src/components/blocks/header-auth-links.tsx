"use client";

import { Button } from "@bbrc/ui/components/button";
import { ArrowRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { authPageHref, currentPageCallbackUrl } from "@/lib/auth-callback-url";

type HeaderAuthLinksProps = {
	variant: "desktop" | "mobile";
	onNavigate?: () => void;
};

export function HeaderAuthLinks({ variant, onNavigate }: HeaderAuthLinksProps) {
	const t = useTranslations("shell.header");
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const callbackUrl = currentPageCallbackUrl(pathname, searchParams.toString());
	const signInHref = authPageHref("/sign-in", callbackUrl);
	const signUpHref = authPageHref("/sign-up", callbackUrl);

	if (variant === "desktop") {
		return (
			<>
				<Button
					render={<Link href={signInHref} />}
					nativeButton={false}
					variant="ghost"
					className="text-muted-foreground hover:text-foreground"
				>
					{t("signIn")}
				</Button>
				<Button render={<Link href={signUpHref} />} nativeButton={false}>
					{t("getStarted")}
					<ArrowRight data-icon="inline-end" aria-hidden="true" />
				</Button>
			</>
		);
	}

	return (
		<>
			<Button
				render={<Link href={signInHref} onClick={onNavigate} />}
				nativeButton={false}
				variant="outline"
				className="w-full"
			>
				{t("signIn")}
			</Button>
			<Button
				render={<Link href={signUpHref} onClick={onNavigate} />}
				nativeButton={false}
				className="w-full"
			>
				{t("getStarted")}
				<ArrowRight data-icon="inline-end" aria-hidden="true" />
			</Button>
		</>
	);
}
