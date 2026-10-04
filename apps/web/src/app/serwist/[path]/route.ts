import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { createSerwistRoute } from "@serwist/turbopack";

const offlinePagePath = path.join(process.cwd(), "src/app/~offline/page.tsx");
const offlinePageRevision = createHash("md5")
	.update(readFileSync(offlinePagePath, "utf8"))
	.digest("hex");

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
	createSerwistRoute({
		swSrc: "src/app/sw.ts",
		additionalPrecacheEntries: [
			{ url: "/~offline", revision: offlinePageRevision },
		],
		useNativeEsbuild: true,
	});
