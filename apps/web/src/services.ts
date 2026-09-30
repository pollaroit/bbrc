import { createAuth } from "@bbrc/auth";
import { createPrismaClient } from "@bbrc/db";

import { ENV } from "./env.server";

export const db = createPrismaClient(ENV);
export const auth = createAuth(ENV, db);
