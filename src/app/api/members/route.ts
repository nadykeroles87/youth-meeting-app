import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members, servants } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const servantId = searchParams.get("servantId") || searchParams.get("assignedServantId");
    const status = searchParams.get("status");

    let results = await db
      .select({
        id: members.id,
        name: members.name,
        phone: members.phone,
        birthDate: members.birthDate,
        gender: members.gender,
        college: members.college,
        job: members.job,
        address: members.address,
        confessionFather: members.confessionFather,
        assignedServantId: members.assignedServantId,
        servantName: servants.name,
        qrCode: members.qrCode,
        status: members.status,
        notes: members.notes,
        createdAt: members.createdAt,
      })
      .from(members)
      .leftJoin(servants, eq(members.assignedServantId, servants.id))
      .orderBy(desc(members.createdAt));

    let filtered = results;

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (m: any) =>
          m.name.toLowerCase().includes(s) ||
          (m.phone && m.phone.includes(s))
      );
    }

    if (servantId) {
      filtered = filtered.filter((m: any) => m.assignedServantId === parseInt(servantId));
    }

    if (status) {
      filtered = filtered.filter((m: any) => m.status === status);
    }

    return NextResponse.json(filtered);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const qrCode = `MNK-${randomUUID().slice(0, 8).toUpperCase()}`;

    const [member] = await db
      .insert(members)
      .values({
        name: body.name,
        phone: body.phone || null,
        birthDate: body.birthDate || null,
        gender: body.gender || "male",
        college: body.college || null,
        job: body.job || null,
        address: body.address || null,
        confessionFather: body.confessionFather || null,
        assignedServantId: body.assignedServantId ? parseInt(body.assignedServantId) : null,
        qrCode,
        status: body.status || "active",
        notes: body.notes || null,
      })
      .returning();

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create member" }, { status: 500 });
  }
}
