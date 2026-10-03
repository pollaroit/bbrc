/**
 * Manual smoke: presign → PUT → head → delete (requires R2 env vars).
 *
 *   bun run packages/storage/scripts/smoke-upload.ts
 */
import {
	buildObjectKey,
	createPresignedUpload,
	createR2Client,
	deleteObject,
	getStorageEnv,
	headObject,
	loadR2ConfigFromEnv,
} from "../src/index";

const config = loadR2ConfigFromEnv();
if (!config) {
	console.error("R2 env vars are not set. See docs/SPEC.md.");
	process.exit(1);
}

const client = createR2Client(config);
const storageEnv = getStorageEnv();
const key = buildObjectKey(storageEnv, {
	kind: "avatar",
	username: "_smoke_test",
});

/** 1×1 PNG */
const body = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
	"base64",
);
const contentType = "image/png";
const contentLength = body.byteLength;

const presigned = await createPresignedUpload(client, config, {
	key,
	contentType,
	contentLength,
});

const putResponse = await fetch(presigned.url, {
	method: "PUT",
	body,
	headers: presigned.headers,
});

if (!putResponse.ok) {
	console.error("PUT failed", putResponse.status, await putResponse.text());
	process.exit(1);
}

const head = await headObject(client, config, key);
if (!head || head.contentLength !== contentLength) {
	console.error("HEAD mismatch", head);
	process.exit(1);
}

await deleteObject(client, config, key);
console.log("R2 smoke OK:", key);
