import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/services";

/**
 * Pages only the member can open (their wishlist and reading stats): signed-out
 * visitors go to sign in, everyone else (admins included) to the profile.
 */
export async function requireOwnProfile(username: string) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		redirect("/sign-in" as Route);
	}
	if (session.user.username !== username) {
		redirect(`/users/${username}` as Route);
	}
	return session;
}
