import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Link, redirect and the router hooks that keep the language in the address:
 * `<Link href="/books">` goes to `/az/books` when the page is in Azerbaijani.
 * Use these instead of the ones from `next/link` and `next/navigation`.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
	createNavigation(routing);
