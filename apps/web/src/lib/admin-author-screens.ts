/**
 * The author editor and the add-author form are admin screens served at public-looking
 * addresses (`/authors/<slug>/edit` is a rewrite of `/admin/authors/edit/<slug>`), so the
 * pathname alone does not say "admin".
 */
const ADMIN_AUTHOR_SCREEN = /^\/authors\/(new|[^/]+\/edit)\/?$/;

export function isAdminAuthorScreen(pathname: string): boolean {
	return ADMIN_AUTHOR_SCREEN.test(pathname);
}
