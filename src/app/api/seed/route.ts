import { NextResponse } from "next/server";
import { db, initDb } from "@/db";
import { members, meetings, servants, announcements, attendance, mediaItems } from "@/db/schema";
import { randomUUID } from "crypto";

export async function POST() {
  try {
    await initDb();
    // Clear old data for clean seed
    try {
      await db.delete(attendance);
      await db.delete(mediaItems);
      await db.delete(members);
      await db.delete(servants);
      await db.delete(meetings);
      await db.delete(announcements);
    } catch (e) {
      console.log("Cleanup before seed:", e);
    }

    // Create servants
    const [servant1] = await db
      .insert(servants)
      .values({ name: "مينا سمير", phone: "01001234567", role: "admin", passwordHash: "123" })
      .returning();

    const [servant2] = await db
      .insert(servants)
      .values({ name: "جورج أمير", phone: "01112345678", role: "servant", passwordHash: "123" })
      .returning();

    const [servant3] = await db
      .insert(servants)
      .values({ name: "بيتر نبيل", phone: "01223456789", role: "servant", passwordHash: "123" })
      .returning();

    // Create members with assignedServantId
    const memberData = [
      { name: "مارك أنطوان", phone: "01001111111", gender: "male" as const, college: "هندسة القاهرة", assignedServantId: servant1.id, birthDate: "2002-03-15", confessionFather: "الأنبا بيشوي", passwordHash: "123" },
      { name: "كيرلس رفيق", phone: "01002222222", gender: "male" as const, college: "طب عين شمس", assignedServantId: servant1.id, birthDate: "2001-07-22", confessionFather: "الأنبا بيشوي", passwordHash: "123" },
      { name: "باسيليوس مجدي", phone: "01003333333", gender: "male" as const, job: "مهندس", assignedServantId: servant2.id, birthDate: "2000-01-10", passwordHash: "123" },
      { name: "فيلبس سعد", phone: "01004444444", gender: "male" as const, college: "تجارة حلوان", assignedServantId: servant2.id, birthDate: "2003-11-05", passwordHash: "123" },
      { name: "بولس ماهر", phone: "01005555555", gender: "male" as const, college: "علوم الحاسب", assignedServantId: servant1.id, birthDate: "2002-08-18", passwordHash: "123" },
      { name: "ماريا سامي", phone: "01006666666", gender: "female" as const, college: "تربية عين شمس", assignedServantId: servant3.id, birthDate: "2001-04-25", passwordHash: "123" },
      { name: "مريم رامي", phone: "01007777777", gender: "female" as const, job: "معلمة", assignedServantId: servant3.id, birthDate: "2000-12-30", passwordHash: "123" },
      { name: "ريهام طارق", phone: "01008888888", gender: "female" as const, college: "صيدلة الزقازيق", assignedServantId: servant3.id, birthDate: "2003-06-14", passwordHash: "123" },
      { name: "نانسي يوسف", phone: "01009999999", gender: "female" as const, college: "آداب عين شمس", assignedServantId: servant3.id, birthDate: "2002-09-02", passwordHash: "123" },
      { name: "إيريس هاني", phone: "01010101010", gender: "female" as const, job: "مهندسة", assignedServantId: servant3.id, birthDate: "2001-02-17", passwordHash: "123" },
    ];

    await Promise.all(
      memberData.map((m) =>
        db
          .insert(members)
          .values({ ...m, qrCode: `MNK-${randomUUID().slice(0, 8).toUpperCase()}` })
          .returning()
      )
    );

    // Create meetings
    await db.insert(meetings).values([
      { title: "اجتماع الأحد الأول", topic: "أنا هو القيامة والحياة", speaker: "الأنبا بيشوي", meetingDate: "2025-01-05" },
      { title: "اجتماع الأحد الثاني", topic: "منقوش على كفيّ", speaker: "القس بولس ميخائيل", meetingDate: "2025-01-12" },
      { title: "اجتماع الأحد الثالث", topic: "الله محبة", speaker: "القس بطرس سامي", meetingDate: "2025-01-19" },
    ]);

    // Create announcements
    await db.insert(announcements).values([
      {
        title: "رحلة الصيف 2025 🌊",
        content: "هيتم تسجيل أسماء الراغبين في رحلة الصيف من يوم الأحد القادم. الرحلة هتكون يوم 15 فبراير. التسجيل مفتوح للجميع!",
        isPinned: true,
      },
      {
        title: "مؤتمر الشباب 2025 🙏",
        content: "مؤتمر الشباب القبطي هيبدأ من 20 يناير. اتواصلوا مع الخدام لتسجيل أسماءكم وحجز أماكنكم.",
        isPinned: false,
      },
    ]);

    // Create seed media files (PDF, PPTX, DOCX & Videos)
    await db.insert(mediaItems).values([
      {
        title: "كتاب صلوات الأجبية القبطية الكاملة 📖",
        description: "نسخة PDF شاملة لصلوات السواعي القبطية (باكر، الثالثة، السادسة، الغروب، النوم)",
        fileUrl: "https://www.africau.edu/images/default/sample.pdf",
        fileType: "pdf",
        category: "coptic_prayers",
        uploadedBy: servant1.id,
      },
      {
        title: "كتاب ترانيم اجتماع الشباب 🎵",
        description: "كتيب الترانيم والصلوات الخاصة باجتماع منقوش على كفك",
        fileUrl: "https://scholar.harvard.edu/files/torber/files/sample.pdf",
        fileType: "pdf",
        category: "hymns",
        uploadedBy: servant1.id,
      },
      {
        title: "عرض تقديمى - مسابقة الكتاب المقدس 🏆",
        description: "اسئلة مسابقة الكتاب المقدس لاجتماع الشباب",
        fileUrl: "https://raw.githubusercontent.com/nadykeroles87/youth-meeting-app/main/public/sample.pptx",
        fileType: "document",
        category: "general",
        uploadedBy: servant1.id,
      },
      {
        title: "فيديو اجتماع الشباب - موضوع محبة الله 🎬",
        description: "تسجيل كلمة اجتماع الشباب الأخير وتأملات في الآية 'منقوش على كفك'",
        fileUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        fileType: "video",
        category: "presentation",
        uploadedBy: servant1.id,
      },
    ]);

    return NextResponse.json({ success: true, message: "تم تحديث البيانات التجريبية بنجاح" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to seed data" }, { status: 500 });
  }
}
