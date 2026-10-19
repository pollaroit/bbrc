import { isOpenLibraryError } from "./errors";

export function openLibraryErrorResponse(
	error: unknown,
	body: Record<string, unknown>,
): Response {
	if (isOpenLibraryError(error)) {
		return Response.json(
			{
				...body,
				error: error.toUserMessage(),
			},
			{ status: 503 },
		);
	}

	console.error("[open-library]", error);

	return Response.json(
		{
			...body,
			error:
				"Something went wrong while contacting Open Library. Please try again.",
		},
		{ status: 500 },
	);
}
