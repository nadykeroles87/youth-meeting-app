"use client";

import { useEffect, useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import { useAuth } from "@/components/AuthProvider";
import {
  Shield, UserPlus, Users, Phone, Mail, Trash2,
  ChevronDown, Loader2, X, Check, Crown
} from "lucide-react";

type Servant = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  role: "admin" | "servant" | "viewer";
};

const ROLE_LABELS = {
  admin: "سوبر أدمن (أمين عام / أبونا)",
  servant: "خادم",
  viewer: "مراقب فقط",
};

const ROLE_COLORS = {
  admin: "bg-amber-100 text-amber-800 border-amber-300",
  servant: "bg-blue-100 text-blue-800 border-blue-300",
  viewer: "bg-stone-100 text-stone-600 border-stone-300",
};

// Super admins are servants with role === "admin"
const SUPER_ADMIN_IDENTIFIERS = ["أمين عام", "أبونا", "admin"];

export default function ServantsPage() {
  const { user, role } = useAuth();

  // Only servants with role "admin" can access this page
  const isAdmin = role === "servant" && (user as any)?.servantRole === "admin";

  const [servants, setServants] = useState<Servant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    role: "servant" as "admin" | "servant" | "viewer",
  });

  const fetchServants = async () => {
    try {
      const res = await fetch("/api/servants");
      if (res.ok) setServants(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServants();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/servants/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ name: "", phone: "", email: "", role: "servant" });
        fetchServants();
      } else {
        const d = await res.json();
        alert(d.error || "فشل الإضافة");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <Shield size={60} className="text-amber-300" />
          <h2 className="text-xl font-bold text-stone-700">هذه الصفحة للسوبر أدمن فقط</h2>
          <p className="text-stone-500 text-sm max-w-xs">
            فقط أمين عام الخدمة وأبونا الكاهن يملكون صلاحية الوصول لهذه الصفحة وإدارة قائمة الخدام.
          </p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
              <Crown size={24} className="text-amber-600" />
              إدارة الخدام
            </h1>
            <p className="text-stone-500 text-sm mt-1">
              لوحة تحكم السوبر أدمن · تسجيل وإدارة الخدام
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm shadow-md transition-colors"
          >
            <UserPlus size={16} />
            تسجيل خادم جديد
          </button>
        </div>

        {/* Admin Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Shield size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">صلاحيات هذه الصفحة</p>
            <p className="text-xs text-amber-700 mt-0.5">
              الخدام المسجلون هنا يمكنهم الدخول للتطبيق وتسجيل المخدومين وإدارة الاجتماعات والإعلانات.
              المخدومون لا يستطيعون التسجيل بأنفسهم — الخادم هو من يضيفهم من صفحة "قاعدة الشباب".
            </p>
          </div>
        </div>

        {/* Add Servant Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                  <UserPlus size={18} className="text-amber-600" />
                  تسجيل خادم جديد
                </h2>
                <button onClick={() => setShowForm(false)} className="text-stone-400 hover:text-stone-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    الاسم الكامل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="مثال: مينا سمير"
                    className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    رقم الموبايل
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="01001234567"
                    className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="example@email.com"
                    className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    الدور / الصلاحية
                  </label>
                  <div className="relative">
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                      className="w-full border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 appearance-none"
                    >
                      <option value="servant">خادم (يرى كل شيء ويدير)</option>
                      <option value="admin">سوبر أدمن (أمين عام / أبونا)</option>
                      <option value="viewer">مراقب فقط (يرى بدون تعديل)</option>
                    </select>
                    <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 border border-stone-200 text-stone-600 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !form.name.trim()}
                    className="flex-1 bg-amber-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:bg-amber-300 hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <><Loader2 size={14} className="animate-spin" /> جاري التسجيل...</>
                    ) : (
                      <><Check size={14} /> تسجيل الخادم</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Servants List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-amber-400" />
          </div>
        ) : servants.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-amber-100">
            <Users size={50} className="mx-auto text-amber-200 mb-4" />
            <p className="text-stone-500">لا يوجد خدام مسجلون بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {servants.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-amber-100 p-4 flex items-center gap-4 hover:border-amber-300 transition-all shadow-sm"
              >
                <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold text-sm flex-shrink-0">
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-800 truncate">{s.name}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {s.phone && (
                      <span className="flex items-center gap-1 text-xs text-stone-500">
                        <Phone size={11} /> {s.phone}
                      </span>
                    )}
                    {s.email && (
                      <span className="flex items-center gap-1 text-xs text-stone-500 truncate">
                        <Mail size={11} /> {s.email}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${ROLE_COLORS[s.role]}`}>
                  {ROLE_LABELS[s.role]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
