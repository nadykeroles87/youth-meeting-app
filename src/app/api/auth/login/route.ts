import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { servants, members } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const { role, identifier } = await req.json();

    if (!identifier) {
      return NextResponse.json(
        { error: "برجاء إدخال رقم الموبايل أو اسم المستخدم" },
        { status: 400 }
      );
    }

    const cleanId = identifier.trim();

    if (role === "servant") {
      const allServants = await db
        .select({
          id: servants.id,
          name: servants.name,
          phone: servants.phone,
          role: servants.role,
        })
        .from(servants);

      const servant = allServants.find(
        (s: any) =>
          (s.phone && s.phone.includes(cleanId)) ||
          s.name.toLowerCase().includes(cleanId.toLowerCase())
      );

      if (!servant) {
        return NextResponse.json(
          { error: "لم يتم العثور على خادم بهذه البيانات" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: servant.id,
          name: servant.name,
          phone: servant.phone,
          role: "servant",
          servantRole: servant.role,
        },
      });
    } else {
      const allMembers = await db
        .select({
          id: members.id,
          name: members.name,
          phone: members.phone,
          qrCode: members.qrCode,
          assignedServantId: members.assignedServantId,
          college: members.college,
          job: members.job,
        })
        .from(members);

      const member = allMembers.find(
        (m: any) =>
          (m.phone && m.phone.includes(cleanId)) ||
          m.name.toLowerCase().includes(cleanId.toLowerCase()) ||
          (m.qrCode && m.qrCode.toLowerCase() === cleanId.toLowerCase())
      );

      if (!member) {
        return NextResponse.json(
          { error: "لم يتم العثور على مخدوم بهذه البيانات" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: member.id,
          name: member.name,
          phone: member.phone,
          role: "member",
          qrCode: member.qrCode,
          assignedServantId: member.assignedServantId,
          college: member.college,
          job: member.job,
        },
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تسجيل الدخول" }, { status: 500 });
  }
}
