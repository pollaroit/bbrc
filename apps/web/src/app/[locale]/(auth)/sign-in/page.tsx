import { toLocale } from "@bbrc/i18n";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthPageSwitchLink } from "@/components/blocks/auth-page-switch-link";
import SignInForm from "@/components/blocks/sign-in-form";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/sign-in">): Promise<Metadata> {
	const locale = toLocale((await params).locale);
	const t = await getTranslations({ locale, namespace: "auth" });
	return buildPageMetadata({
		title: t("signIn.metaTitle"),
		description: t("signIn.metaDescription"),
		path: "/sign-in",
		locale,
	});
}

export default async function SignInPage({
	params,
}: PageProps<"/[locale]/sign-in">) {
	const locale = toLocale((await params).locale);
	const t = await getTranslations({ locale, namespace: "auth" });
	return (
		<section className="flex w-full items-center justify-center bg-background px-6 py-12 text-foreground">
			<Card className="w-full max-w-sm">
				<CardHeader className="items-center text-center">
					<CardTitle className="mt-4 font-bold text-xl tracking-tight">
						{t("signIn.title")}
					</CardTitle>
					<CardDescription className="text-sm">
						{t("signIn.description")}
					</CardDescription>
				</CardHeader>

				<CardContent className="flex flex-col gap-6">
					<Suspense fallback={null}>
						<SignInForm />
					</Suspense>
				</CardContent>

				<CardFooter className="justify-center text-muted-foreground text-sm">
					{t("signIn.noAccount")}
					<Suspense fallback={null}>
						<AuthPageSwitchLink
							target="/sign-up"
							label={t("signIn.switchToSignUp")}
						/>
					</Suspense>
				</CardFooter>
			</Card>
		</section>
	);
}
