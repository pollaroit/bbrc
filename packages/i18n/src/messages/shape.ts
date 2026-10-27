import type { en } from "./en";
import type { DeepString } from "./types";

/** The shape every language must have, taken from English. */
export type Messages = DeepString<typeof en>;
