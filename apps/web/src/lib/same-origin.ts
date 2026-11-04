export function isSameOriginRequest(request: Request): boolean {
	const origin = request.headers.get("origin");
	if (!origin) return true;
	try {
		return new URL(origin).host === new URL(request.url).host;
	} catch {
		return false;
	}
}

export function forbiddenUnlessSameOrigin(request: Request): Response | null {
	if (isSameOriginRequest(request)) return null;
	return Response.json({ error: "Forbidden" }, { status: 403 });
}
