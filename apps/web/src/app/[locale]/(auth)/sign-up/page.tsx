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
import SignupForm from "@/components/blocks/sign-up-form";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/sign-up">): Promise<Metadata> {
	const locale = toLocale((await params).locale);
	const t = await getTranslations({ locale, namespace: "auth" });
	return buildPageMetadata({
		title: t("signUp.metaTitle"),
		description: t("signUp.metaDescription"),
		path: "/sign-up",
		locale,
	});
}

export default async function SignupPage({
	params,
}: PageProps<"/[locale]/sign-up">) {
	const locale = toLocale((await params).locale);
	const t = await getTranslations({ locale, namespace: "auth" });
	return (
		<section className="flex w-full items-center justify-center bg-background px-6 py-12 text-foreground">
			<Card className="w-full max-w-sm">
				<CardHeader className="items-center text-center">
					<CardTitle className="mt-4 font-bold text-xl tracking-tight">
						{t("signUp.title")}
					</CardTitle>
					<CardDescription className="text-sm">
						{t("signUp.description")}
					</CardDescription>
				</CardHeader>

				<CardContent className="flex flex-col gap-6">
					<Suspense fallback={null}>
						<SignupForm />
					</Suspense>
				</CardContent>

				<CardFooter className="justify-center text-muted-foreground text-sm">
					{t("signUp.haveAccount")}
					<Suspense fallback={null}>
						<AuthPageSwitchLink
							target="/sign-in"
							label={t("signUp.switchToSignIn")}
						/>
					</Suspense>
				</CardFooter>
			</Card>
		</section>
	);
}
