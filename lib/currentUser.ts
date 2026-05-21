import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

const SESSION_COOKIE = "greenroom_user_id";

/** Prototype session: cookie user id, else first user in the database. */
export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (fromCookie) {
    return fromCookie;
  }

  const [mariana] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, "user_mariana"))
    .limit(1);
  if (mariana) return mariana.id;

  const [first] = await db
    .select({ id: users.id })
    .from(users)
    .orderBy(asc(users.id))
    .limit(1);

  return first?.id ?? null;
}
