import { db } from "..";
import { users } from "../schema";
import { eq } from "drizzle-orm";

export async function createUser(name: string) {
  const [user] = await db.insert(users)
    .values({ name: name })
    .returning();

  return user;
}

export async function getUserByName(name: string) {
  const [user] = await db.select()
    .from(users)
    .where(eq(users.name, name));

  return user;
}
export async function deleteAllUsers() {
  await db.delete(users);
}
export async function getUsers() {
  return await db.select().from(users);
}