"use client";

import { use, useEffect, useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import Link from "next/link";
import {
  ChevronRight, Phone, MapPin, GraduationCap, Edit3, Save, X,
  QrCode, CalendarDays, CheckCircle, MessageSquare, Clock, Trash2,
  Church
} from "lucide-react";

type Member = {
  id: number;
  name: string;
  phone: string | null;
  birthDate: string | null;
  gender: string;
  college: string | null;
  job: string | null;
  address: string | null;
  confessionFather: string | null;
  assignedServantId: number | null;
  qrCode: string | null;
  status: string;
  notes: string | null;
  attendanceHistory: { id: number; meetingTitle: string | null; meetingDate: string | null; checkedInAt: string }[];
  followupNotes: { id: number; note: string; createdAt: string; servantName: string | null }[];
  attendanceCount: number;
};

type Servant = { id: number; name: string };

const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [member, setMember] = useState<Member | null>(null);
  const [servants, setServants] = useState<Servant[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Member>>({});
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const fetchMember = async () => {
    try {
      const res = await fetch(`/api/members/${id}`);
      if (!res.ok) throw new Error("Network error");
      const data = await res.json();
      setMember(data);
      setEditForm(data);
    } catch (err) {
      // Offline fallback: try to find the member in the bulk cache
      try {
        const cached = localStorage.getItem("offline_cache_members_servants") || localStorage.getItem("offline_cache_members");
        if (cached) {
          const parsed = JSON.parse(cached);
          const membersList = parsed.data || parsed;
          const m = membersList.find((x: any) => x.id === parseInt(id));
          if (m) {
            // Fill missing arrays to prevent UI crash
            setMember({ ...m, attendanceHistory: [], followupNotes: [], attendanceCount: 0 });
            setEditForm(m);
          }
        }
      } catch (e) { /* ignore */ }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMember();
    fetch("/api/servants").then((r) => r.json()).then(setServants);
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/members/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditing(false);
    setSaving(false);
    fetchMember();
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    await fetch("/api/followup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: id, note: newNote }),
    });
    setNewNote("");
    setAddingNote(false);
    fetchMember();
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="animate-pulse space-y-4 max-w-3xl mx-auto">
          <div className="h-40 bg-amber-100 rounded-2xl" />
          <div className="h-64 bg-white rounded-2xl" />
        </div>
      </PageWrapper>
    );
  }

  if (!member) {
    return (
      <PageWrapper>
        <div className="text-center py-20">
          <p className="text-stone-500">الشاب غير موجود</p>
          <Link href="/members" className="text-amber-600">العودة</Link>
        </div>
      </PageWrapper>
    );
  }

  const attendanceRate = member.attendanceCount > 0 ? member.attendanceCount : 0;
  const today = new Date();
  const birthday = member.birthDate ? new Date(member.birthDate) : null;
  const isBirthdayThisMonth = birthday?.getMonth() === today.getMonth();
  const isBirthdayToday = birthday?.getDate() === today.getDate() && birthday?.getMonth() === today.getMonth();

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Link href="/members" className="hover:text-amber-700">قاعدة الشباب</Link>
          <ChevronRight size={14} />
          <span className="text-stone-800 font-medium">{member.name}</span>
        </div>

        {/* Profile Header */}
        <div className={`rounded-2xl p-6 text-white ${
          member.gender === "female"
            ? "bg-gradient-to-r from-pink-600 to-pink-800"
            : "bg-gradient-to-r from-amber-700 to-amber-900"
        }`}>
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-4xl font-bold flex-shrink-0">
              {member.name.slice(0, 1)}
            </div>
            <div className="flex-1">
              {isBirthdayToday && (
                <div className="inline-flex items-center gap-1 bg-white/20 text-white text-xs px-3 py-1 rounded-full mb-2">
                  🎂 عيد ميلاد سعيد!
                </div>
              )}
              <h1 className="text-2xl font-bold">{member.name}</h1>
              <p className="text-white/70 text-sm mt-1">
                {member.gender === "female" ? "👩 شابة" : "👨 شاب"}
                {member.assignedServantId && ` • الخادم: ${servants.find(s => s.id === member.assignedServantId)?.name || ""}`}
              </p>
              <div className="flex flex-wrap gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-white/80 text-sm">
                  <CheckCircle size={14} />
                  {member.attendanceCount} اجتماع حضره
                </span>
                {member.qrCode && (
                  <button
                    onClick={() => setShowQr(true)}
                    className="flex items-center gap-1.5 text-white/80 text-sm hover:text-white"
                  >
                    <QrCode size={14} />
                    {member.qrCode}
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
            >
              {editing ? <X size={18} /> : <Edit3 size={18} />}
            </button>
          </div>
        </div>

        {/* QR Code Modal */}
        {showQr && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowQr(false)}>
            <div className="bg-white rounded-2xl p-8 text-center max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-stone-800 mb-4">QR Code - {member.name}</h3>
              <div className="w-48 h-48 bg-stone-100 rounded-xl mx-auto flex items-center justify-center mb-4">
                <div className="text-center">
                  <QrCode size={60} className="mx-auto text-stone-400 mb-2" />
                  <p className="font-mono text-sm font-bold text-stone-700">{member.qrCode}</p>
                </div>
              </div>
              <p className="text-xs text-stone-400 mb-4">يمكن مسح هذا الكود لتسجيل الحضور</p>
              <button onClick={() => setShowQr(false)} className="bg-amber-600 text-white px-6 py-2 rounded-xl text-sm font-medium">
                إغلاق
              </button>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Details Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-amber-50">
              <h2 className="font-bold text-stone-800 text-sm">البيانات الشخصية</h2>
              {editing && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 bg-amber-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
                >
                  <Save size={12} />
                  {saving ? "حفظ..." : "حفظ"}
                </button>
              )}
            </div>
            <div className="p-5 space-y-4">
              {editing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editForm.name || ""}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="الاسم"
                  />
                  <input
                    type="tel"
                    value={editForm.phone || ""}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="الموبايل"
                  />
                  <input
                    type="date"
                    value={editForm.birthDate || ""}
                    onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                    className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={editForm.college || ""}
                    onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
                    className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="الكلية"
                  />
                  <input
                    type="text"
                    value={editForm.job || ""}
                    onChange={(e) => setEditForm({ ...editForm, job: e.target.value })}
                    className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="الوظيفة"
                  />
                  <input
                    type="text"
                    value={editForm.confessionFather || ""}
                    onChange={(e) => setEditForm({ ...editForm, confessionFather: e.target.value })}
                    className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="أب الاعتراف"
                  />
                  <input
                    type="text"
                    value={editForm.address || ""}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="العنوان"
                  />
                  <select
                    value={editForm.assignedServantId?.toString() || ""}
                    onChange={(e) => setEditForm({ ...editForm, assignedServantId: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    <option value="">بدون خادم مسؤول</option>
                    {servants.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <select
                    value={editForm.status || "active"}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                    <option value="transferred">تحوّل</option>
                  </select>
                  <textarea
                    value={editForm.notes || ""}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={2}
                    placeholder="ملاحظات..."
                    className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm resize-none"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: "الموبايل", value: member.phone, icon: <Phone size={14} /> },
                    { label: "تاريخ الميلاد", value: member.birthDate ? `${member.birthDate.slice(8)}/${member.birthDate.slice(5,7)}/${member.birthDate.slice(0,4)}` : null, icon: <CalendarDays size={14} /> },
                    { label: "الكلية", value: member.college, icon: <GraduationCap size={14} /> },
                    { label: "الوظيفة", value: member.job, icon: <GraduationCap size={14} /> },
                    { label: "أب الاعتراف", value: member.confessionFather, icon: <Church size={14} /> },
                    { label: "العنوان", value: member.address, icon: <MapPin size={14} /> },
                  ].map((item) => item.value && (
                    <div key={item.label} className="flex items-start gap-3">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">{item.icon}</span>
                      <div>
                        <p className="text-xs text-stone-400">{item.label}</p>
                        <p className="text-sm text-stone-800 font-medium">{item.value}</p>
                      </div>
                    </div>
                  ))}
                  {member.notes && (
                    <div className="bg-amber-50 rounded-xl p-3">
                      <p className="text-xs text-amber-700 font-medium mb-1">ملاحظات</p>
                      <p className="text-sm text-stone-700">{member.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Attendance History */}
            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
              <div className="p-4 border-b border-amber-50">
                <h2 className="font-bold text-stone-800 text-sm flex items-center gap-2">
                  <CheckCircle size={15} className="text-amber-600" />
                  سجل الحضور ({member.attendanceCount})
                </h2>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-amber-50">
                {member.attendanceHistory.length === 0 ? (
                  <p className="text-stone-400 text-sm text-center py-6">لم يحضر بعد</p>
                ) : (
                  member.attendanceHistory.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                      <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-stone-700 truncate">{a.meetingTitle || "اجتماع"}</p>
                        <p className="text-xs text-stone-400">{a.meetingDate}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Followup Notes */}
            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
              <div className="p-4 border-b border-amber-50">
                <h2 className="font-bold text-stone-800 text-sm flex items-center gap-2">
                  <MessageSquare size={15} className="text-amber-600" />
                  ملاحظات الافتقاد
                </h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="أضف ملاحظة افتقاد..."
                    className="flex-1 border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={addingNote || !newNote.trim()}
                    className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-200 text-white px-3 py-2 rounded-xl text-sm transition-colors"
                  >
                    {addingNote ? "..." : "إضافة"}
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {member.followupNotes.length === 0 ? (
                    <p className="text-stone-400 text-sm text-center py-3">لا توجد ملاحظات</p>
                  ) : (
                    member.followupNotes.map((note) => (
                      <div key={note.id} className="bg-amber-50 rounded-xl p-3">
                        <p className="text-sm text-stone-700">{note.note}</p>
                        <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                          <Clock size={10} />
                          {note.servantName || "خادم"} • {new Date(note.createdAt).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
