import type { MetadataRoute } from "next";
import { buildAppSitemap } from "@/lib/seo/sitemap";
import { db } from "@/services";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	return buildAppSitemap(db);
}
