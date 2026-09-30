import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Metadata } from "next";
import Link from "next/link";
import SignInForm from "@/components/blocks/sign-in-form";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
	title: "Sign in",
	description: "Sign in to your BBRC account.",
	path: "/sign-in",
});

export const dynamic = "force-static";

export default function SignInPage() {
	return (
		<section className="flex w-full items-center justify-center bg-background px-6 py-12 text-foreground">
			<Card className="w-full max-w-sm">
				<CardHeader className="items-center text-center">
					<CardTitle className="mt-4 font-bold text-xl tracking-tight">
						Sign in to your account
					</CardTitle>
					<CardDescription className="text-sm">
						Welcome back to BBRC. Let&apos;s read together.
					</CardDescription>
				</CardHeader>

				<CardContent className="flex flex-col gap-6">
					<SignInForm />
				</CardContent>

				<CardFooter className="justify-center text-muted-foreground text-sm">
					Don&apos;t have an account?
					<Button
						variant="link"
						className="px-1"
						render={<Link href="/sign-up" />}
						nativeButton={false}
					>
						Sign up
					</Button>
				</CardFooter>
			</Card>
		</section>
	);
}
