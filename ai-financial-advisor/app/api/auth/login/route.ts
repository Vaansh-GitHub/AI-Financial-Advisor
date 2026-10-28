import { NextResponse } from "next/server";
import { LoginSchema } from "@/lib/validation/schemas";
import { createSessionToken, getSessionCookieOptions } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";
import { connectToDatabase, isDatabaseConnected } from "@/lib/db/connect";
import { UserModel } from "@/models/User";
import { comparePassword } from "@/lib/auth/passwords";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = LoginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const lowerEmail = email.toLowerCase().trim();

    let matchedUser: {
      userId: string;
      email: string;
      name: string;
      role: "adviser" | "admin";
      title?: string;
      department?: string;
    } | null = null;

    // Check pre-configured hackathon demo accounts
    if (lowerEmail === "adviser@zeckathon.com" && password === "Adviser@12345") {
      matchedUser = {
        userId: "adviser_default",
        email: "adviser@zeckathon.com",
        name: "Priya Sharma, CFA",
        role: "adviser",
        title: "Senior Wealth Adviser (RIA)",
        department: "Private Wealth Advisory",
      };
    } else if (lowerEmail === "admin@zeckathon.com" && password === "Admin@12345") {
      matchedUser = {
        userId: "admin_default",
        email: "admin@zeckathon.com",
        name: "Vikram Malhotra",
        role: "admin",
        title: "Chief Compliance Officer & System Admin",
        department: "Regulatory & Compliance",
      };
    } else {
      // Check MongoDB if connected
      await connectToDatabase();
      if (isDatabaseConnected()) {
        const dbUser = await UserModel.findOne({ email: lowerEmail });
        if (dbUser) {
          const isValid = await comparePassword(password, dbUser.passwordHash);
          if (isValid) {
            matchedUser = {
              userId: String(dbUser._id),
              email: dbUser.email,
              name: dbUser.name,
              role: dbUser.role,
              title: dbUser.title,
              department: dbUser.department,
            };
          }
        }
      }
    }

    if (!matchedUser) {
      return NextResponse.json(
        { error: "Invalid credentials. For hackathon demo, use adviser@zeckathon.com / Adviser@12345" },
        { status: 401 }
      );
    }

    const token = await createSessionToken(matchedUser);

    await logAuditEvent({
      actorId: matchedUser.userId,
      actorName: matchedUser.name,
      actorRole: matchedUser.role,
      action: "AUTH_LOGIN",
      entityType: "AUTH",
      entityId: matchedUser.userId,
      metadata: { email: matchedUser.email, role: matchedUser.role },
    });

    const response = NextResponse.json({
      success: true,
      user: matchedUser,
      message: "Authentication successful",
    });

    const cookieOpts = getSessionCookieOptions();
    response.cookies.set(cookieOpts.name, token, cookieOpts);

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error during authentication", message: error?.message },
      { status: 500 }
    );
  }
}
