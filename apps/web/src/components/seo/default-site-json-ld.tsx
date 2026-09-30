import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export function DefaultSiteJsonLd() {
	return <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />;
}
