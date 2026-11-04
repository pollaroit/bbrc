import { mayFetchSite } from "@bbrc/shared";
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
	if (mayFetchSite(request.headers.get("user-agent"))) {
		return NextResponse.next();
	}

	return new NextResponse("Forbidden", { status: 403 });
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)",
	],
};
