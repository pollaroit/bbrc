import type { Session } from "better-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";
import { auth } from "@/services";

function requireNonAuthenticated(session: Session | null) {
	if (session) {
		redirect("/");
	}

	return null;
}

export default async function AuthLayout({ children }: PropsWithChildren) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	requireNonAuthenticated(session?.session ?? null);

	return (
		<div className="flex h-screen items-center justify-center">{children}</div>
	);
}
