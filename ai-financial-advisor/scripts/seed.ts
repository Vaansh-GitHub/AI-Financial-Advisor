import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { UserModel } from "../models/User";
import { ClientModel } from "../models/Client";
import { GoalModel } from "../models/Goal";
import { FundModel } from "../models/Fund";
import { PlanModel } from "../models/Plan";
import { ResearchDocumentModel } from "../models/ResearchDocument";
import { AuditLogModel } from "../models/AuditLog";
import {
  INITIAL_DEMO_CLIENTS,
  INITIAL_DEMO_FUNDS,
  INITIAL_DEMO_GOALS,
  INITIAL_DEMO_PLANS,
  INITIAL_DEMO_DOCUMENTS,
} from "../lib/db/repo";

async function runSeed() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/zeckathon_adviser_copilot";
  console.log("Connecting to MongoDB at:", uri);

  try {
    await mongoose.connect(uri);
    console.log("MongoDB connection established.");

    // 1. Seed Users
    const adviserPasswordHash = await bcrypt.hash("Adviser@12345", 10);
    const adminPasswordHash = await bcrypt.hash("Admin@12345", 10);

    await UserModel.findOneAndUpdate(
      { email: "adviser@zeckathon.com" },
      {
        email: "adviser@zeckathon.com",
        passwordHash: adviserPasswordHash,
        name: "Priya Sharma, CFA",
        role: "adviser",
        title: "Senior Wealth Adviser (RIA)",
        department: "Private Wealth Advisory",
      },
      { upsert: true, new: true }
    );

    await UserModel.findOneAndUpdate(
      { email: "admin@zeckathon.com" },
      {
        email: "admin@zeckathon.com",
        passwordHash: adminPasswordHash,
        name: "Vikram Malhotra",
        role: "admin",
        title: "Chief Compliance Officer & System Admin",
        department: "Regulatory & Compliance",
      },
      { upsert: true, new: true }
    );
    console.log("✓ Seeded default users (adviser@zeckathon.com, admin@zeckathon.com)");

    // 2. Seed 6 Demo Personas
    for (const c of INITIAL_DEMO_CLIENTS) {
      await ClientModel.findOneAndUpdate({ email: c.email }, c, { upsert: true });
    }
    console.log(`✓ Seeded ${INITIAL_DEMO_CLIENTS.length} demo client personas`);

    // 3. Seed Mutual Funds
    for (const f of INITIAL_DEMO_FUNDS) {
      await FundModel.findOneAndUpdate({ schemeCode: f.schemeCode }, f, { upsert: true });
    }
    console.log(`✓ Seeded ${INITIAL_DEMO_FUNDS.length} authentic mutual funds`);

    // 4. Seed Goals
    for (const g of INITIAL_DEMO_GOALS) {
      await GoalModel.findOneAndUpdate({ _id: g._id }, g, { upsert: true });
    }
    console.log(`✓ Seeded ${INITIAL_DEMO_GOALS.length} goals`);

    // 5. Seed Advisory Plans
    for (const p of INITIAL_DEMO_PLANS) {
      await PlanModel.findOneAndUpdate({ _id: p._id }, p, { upsert: true });
    }
    console.log(`✓ Seeded ${INITIAL_DEMO_PLANS.length} advisory plans with approval histories`);

    // 6. Seed Research Documents
    for (const d of INITIAL_DEMO_DOCUMENTS) {
      await ResearchDocumentModel.findOneAndUpdate({ _id: d._id }, d, { upsert: true });
    }
    console.log(`✓ Seeded ${INITIAL_DEMO_DOCUMENTS.length} research library documents`);

    // 7. Initial System Audit Record
    await AuditLogModel.create({
      id: `audit_seed_${Date.now()}`,
      actorId: "system",
      actorName: "System Seed Script",
      actorRole: "system",
      action: "SYSTEM_INITIALIZED",
      entityType: "SYSTEM",
      entityId: "zeckathon_copilot",
      timestamp: new Date().toISOString(),
      metadata: { seedVersion: "2.1.0", personasCount: 6, fundsCount: INITIAL_DEMO_FUNDS.length },
    });
    console.log("✓ Audit log initialized.");

    console.log("\n=======================================================");
    console.log("SUCCESS: Zeckathon PS 04 Database Seed Completed!");
    console.log("Adviser Login: adviser@zeckathon.com / Adviser@12345");
    console.log("Admin Login:   admin@zeckathon.com   / Admin@12345");
    console.log("=======================================================\n");

    process.exit(0);
  } catch (err: any) {
    console.error("Database seeding encountered an error or MongoDB was unreachable:", err?.message || err);
    console.log("Note: Application repository includes self-sufficient in-memory stores and will operate without local MongoDB.");
    process.exit(0);
  }
}

runSeed();
