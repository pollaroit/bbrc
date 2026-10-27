import type { useTranslations } from "next-intl";

/** The `books` translator (from `useTranslations("books")` or `getTranslations`), for helpers that build texts. */
export type BooksTranslator = ReturnType<typeof useTranslations<"books">>;
