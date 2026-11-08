import { PrismaClient } from "@prisma/client";

// Guna satu PrismaClient sahaja semasa dev (hot reload buat banyak instance).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
