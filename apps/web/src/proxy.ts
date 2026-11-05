import { mayFetchSite, mayVisitFromCountry } from "@bbrc/shared";
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
	const userAgent = request.headers.get("user-agent");
	const country = request.headers.get("x-vercel-ip-country");

	if (mayFetchSite(userAgent) && mayVisitFromCountry(userAgent, country)) {
		return NextResponse.next();
	}

	return new NextResponse("Forbidden", { status: 403 });
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)",
	],
};
