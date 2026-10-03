export type StorageEnv = "development" | "preview" | "production";

export type R2Config = {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucketName: string;
	publicBaseUrl: string;
};

export function getStorageEnv(): StorageEnv {
	const raw = process.env.VERCEL_ENV?.trim();
	if (raw === "preview" || raw === "production") {
		return raw;
	}
	return "development";
}

export function loadR2ConfigFromEnv(): R2Config | null {
	const accountId = process.env.R2_ACCOUNT_ID?.trim();
	const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
	const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
	const bucketName = process.env.R2_BUCKET_NAME?.trim();
	const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim();

	if (
		!accountId ||
		!accessKeyId ||
		!secretAccessKey ||
		!bucketName ||
		!publicBaseUrl
	) {
		return null;
	}

	return {
		accountId,
		accessKeyId,
		secretAccessKey,
		bucketName,
		publicBaseUrl,
	};
}

export function isR2Configured(): boolean {
	return loadR2ConfigFromEnv() !== null;
}
