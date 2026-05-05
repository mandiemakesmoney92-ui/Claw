import { getAuth, clerkMiddleware } from "@clerk/express";
import { type Request, type Response, type NextFunction, type RequestHandler } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface User {
      id: string;
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      profileImageUrl?: string | null;
    }

    interface Request {
      isAuthenticated(): boolean;
      user: User;
    }
  }
}

export const clerkExpressMiddleware: RequestHandler = clerkMiddleware();

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  try {
    const { userId } = getAuth(req);
    if (!userId) return next();

    // Look up user by clerkId
    let user = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, userId),
    });

    if (!user) {
      // Fetch Clerk user details via Clerk Backend API
      const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
      });

      let email: string | null = null;
      let firstName: string | null = null;
      let lastName: string | null = null;
      let profileImageUrl: string | null = null;

      if (clerkRes.ok) {
        const cu = await clerkRes.json() as any;
        email = cu.email_addresses?.[0]?.email_address ?? null;
        firstName = cu.first_name ?? null;
        lastName = cu.last_name ?? null;
        profileImageUrl = cu.image_url ?? null;
      }

      // Try to find an existing user by email (migrate Replit auth users)
      if (email) {
        const byEmail = await db.query.usersTable.findFirst({
          where: eq(usersTable.email, email),
        });
        if (byEmail) {
          // Link Clerk ID to existing user
          await db.update(usersTable)
            .set({ clerkId: userId, updatedAt: new Date() })
            .where(eq(usersTable.id, byEmail.id));
          user = { ...byEmail, clerkId: userId };
        }
      }

      if (!user) {
        // Create new user with Clerk ID
        const [created] = await db.insert(usersTable)
          .values({ id: userId, clerkId: userId, email, firstName, lastName, profileImageUrl })
          .onConflictDoUpdate({
            target: usersTable.id,
            set: { clerkId: userId, updatedAt: new Date() },
          })
          .returning();
        user = created;
      }
    }

    if (user) {
      req.user = {
        id: user.id,
        email: user.email ?? undefined,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        profileImageUrl: user.profileImageUrl ?? undefined,
      };
    }
  } catch {
    // Auth errors are non-fatal — request continues unauthenticated
  }

  next();
}
