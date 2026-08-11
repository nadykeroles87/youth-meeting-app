import {
  pgTable,
  serial,
  varchar,
  text,
  date,
  timestamp,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const genderEnum = pgEnum("gender", ["male", "female"]);
export const roleEnum = pgEnum("role", ["admin", "servant", "viewer"]);
export const statusEnum = pgEnum("member_status", ["active", "inactive", "transferred"]);
export const mediaTypeEnum = pgEnum("media_type", ["pdf", "video", "document", "link"]);

// ===== SERVANTS (الخدام) =====
export const servants = pgTable("servants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 150 }),
  role: roleEnum("role").default("servant").notNull(),
  passwordHash: varchar("password_hash", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== MEMBERS (الشباب) =====
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  birthDate: date("birth_date"),
  gender: genderEnum("gender").default("male").notNull(),
  college: varchar("college", { length: 200 }),
  job: varchar("job", { length: 200 }),
  address: text("address"),
  confessionFather: varchar("confession_father", { length: 150 }),
  assignedServantId: integer("assigned_servant_id").references(() => servants.id, { onDelete: "set null" }),
  qrCode: varchar("qr_code", { length: 100 }).unique(),
  status: statusEnum("status").default("active").notNull(),
  passwordHash: varchar("password_hash", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ===== MEETINGS (الاجتماعات) =====
export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  topic: text("topic"),
  speaker: varchar("speaker", { length: 150 }),
  meetingDate: date("meeting_date").notNull(),
  location: varchar("location", { length: 200 }).default("كنيسة العذراء - العاشر من رمضان"),
  notes: text("notes"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== ATTENDANCE (الحضور) =====
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").references(() => meetings.id, { onDelete: "cascade" }).notNull(),
  memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }).notNull(),
  recordedBy: integer("recorded_by").references(() => servants.id, { onDelete: "set null" }),
  checkedInAt: timestamp("checked_in_at").defaultNow().notNull(),
  notes: text("notes"),
});

// ===== PRAYER REQUESTS (طلبات الصلاة) =====
export const prayerRequests = pgTable("prayer_requests", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id, { onDelete: "set null" }),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  request: text("request").notNull(),
  isPrayed: boolean("is_prayed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== FOLLOWUP NOTES (ملاحظات الافتقاد) =====
export const followupNotes = pgTable("followup_notes", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }).notNull(),
  servantId: integer("servant_id").references(() => servants.id, { onDelete: "set null" }),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== ANNOUNCEMENTS (إشعارات / إعلانات) =====
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== MEDIA / LIBRARY (مكتبة الفيديوهات والملفات الـ PDF) =====
export const mediaItems = pgTable("media_items", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 50 }).default("pdf").notNull(), // 'pdf' | 'video' | 'link' | 'document'
  category: varchar("category", { length: 100 }).default("general").notNull(), // 'coptic_prayers' | 'hymns' | 'presentation' | 'general'
  uploadedBy: integer("uploaded_by").references(() => servants.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== RELATIONS =====
export const membersRelations = relations(members, ({ one, many }) => ({
  assignedServant: one(servants, { fields: [members.assignedServantId], references: [servants.id] }),
  attendance: many(attendance),
  prayerRequests: many(prayerRequests),
  followupNotes: many(followupNotes),
}));

export const servantsRelations = relations(servants, ({ many }) => ({
  assignedMembers: many(members),
  attendance: many(attendance),
  followupNotes: many(followupNotes),
  mediaItems: many(mediaItems),
}));

export const meetingsRelations = relations(meetings, ({ many }) => ({
  attendance: many(attendance),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  meeting: one(meetings, { fields: [attendance.meetingId], references: [meetings.id] }),
  member: one(members, { fields: [attendance.memberId], references: [members.id] }),
  servant: one(servants, { fields: [attendance.recordedBy], references: [servants.id] }),
}));

export const prayerRequestsRelations = relations(prayerRequests, ({ one }) => ({
  member: one(members, { fields: [prayerRequests.memberId], references: [members.id] }),
}));

export const followupNotesRelations = relations(followupNotes, ({ one }) => ({
  member: one(members, { fields: [followupNotes.memberId], references: [members.id] }),
  servant: one(servants, { fields: [followupNotes.servantId], references: [servants.id] }),
}));

export const mediaItemsRelations = relations(mediaItems, ({ one }) => ({
  servant: one(servants, { fields: [mediaItems.uploadedBy], references: [servants.id] }),
}));
