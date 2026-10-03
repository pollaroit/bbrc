import {
	DeleteObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { DEFAULT_PRESIGN_EXPIRES_SECONDS } from "./constants";
import type { R2Config } from "./env";

export function createR2Client(config: R2Config): S3Client {
	return new S3Client({
		region: "auto",
		endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
	});
}

export function buildPublicObjectUrl(config: R2Config, key: string): string {
	const base = config.publicBaseUrl.replace(/\/$/, "");
	const normalizedKey = key.replace(/^\//, "");
	return `${base}/${normalizedKey}`;
}

export type PresignedUpload = {
	url: string;
	key: string;
	headers: Record<string, string>;
};

export async function createPresignedUpload(
	client: S3Client,
	config: R2Config,
	input: {
		key: string;
		contentType: string;
		contentLength: number;
		expiresInSeconds?: number;
	},
): Promise<PresignedUpload> {
	const expiresIn = input.expiresInSeconds ?? DEFAULT_PRESIGN_EXPIRES_SECONDS;

	const command = new PutObjectCommand({
		Bucket: config.bucketName,
		Key: input.key,
		ContentType: input.contentType,
		ContentLength: input.contentLength,
	});

	const url = await getSignedUrl(client, command, { expiresIn });

	return {
		url,
		key: input.key,
		headers: {
			"Content-Type": input.contentType,
			"Content-Length": String(input.contentLength),
		},
	};
}

export type HeadObjectResult = {
	contentLength: number;
	contentType: string | undefined;
};

export async function headObject(
	client: S3Client,
	config: R2Config,
	key: string,
): Promise<HeadObjectResult | null> {
	try {
		const response = await client.send(
			new HeadObjectCommand({
				Bucket: config.bucketName,
				Key: key,
			}),
		);

		if (response.ContentLength === undefined) {
			return null;
		}

		return {
			contentLength: response.ContentLength,
			contentType: response.ContentType,
		};
	} catch (error: unknown) {
		const status =
			error &&
			typeof error === "object" &&
			"$metadata" in error &&
			typeof (error as { $metadata?: { httpStatusCode?: number } }).$metadata
				?.httpStatusCode === "number"
				? (error as { $metadata: { httpStatusCode: number } }).$metadata
						.httpStatusCode
				: undefined;

		if (status === 404) {
			return null;
		}

		if (
			error &&
			typeof error === "object" &&
			"name" in error &&
			error.name === "NotFound"
		) {
			return null;
		}

		throw error;
	}
}

export async function deleteObject(
	client: S3Client,
	config: R2Config,
	key: string,
): Promise<void> {
	await client.send(
		new DeleteObjectCommand({
			Bucket: config.bucketName,
			Key: key,
		}),
	);
}
