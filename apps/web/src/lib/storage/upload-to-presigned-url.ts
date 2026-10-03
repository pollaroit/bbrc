export type PresignedUploadRequest = {
	url: string;
	headers: Record<string, string>;
};

/**
 * PUT the file bytes directly to R2 using a presigned URL from `storage.initUpload`.
 */
export async function uploadFileToPresignedUrl(
	file: File,
	presigned: PresignedUploadRequest,
): Promise<void> {
	const response = await fetch(presigned.url, {
		method: "PUT",
		body: file,
		headers: presigned.headers,
	});

	if (!response.ok) {
		const detail = await response.text().catch(() => "");
		throw new Error(
			detail
				? `Upload failed (${response.status}): ${detail.slice(0, 200)}`
				: `Upload failed (${response.status})`,
		);
	}
}
