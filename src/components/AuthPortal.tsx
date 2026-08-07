"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useAuth } from "./AuthProvider";
import { UserCheck, User, Lock, Phone, Loader2, LogIn, ArrowRight } from "lucide-react";

export default function AuthPortal() {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<"servant" | "member" | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !identifier) { setError("برجاء إدخال البيانات كاملة"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole, identifier, password: password || "123" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) setError(data.error || "فشل تسجيل الدخول.");
      else login(data.user);
    } catch { setError("حدث خطأ في الاتصال."); }
    finally { setLoading(false); }
  };

  const isServant = selectedRole === "servant";

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0618 0%, #150d2e 40%, #1a0f3d 70%, #0d1a3a 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "var(--font-cairo,'Cairo',sans-serif)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Glow orbs for depth */}
      <div style={{ position:"absolute", top:"15%", right:"20%", width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)", pointerEvents:"none", filter:"blur(40px)" }} />
      <div style={{ position:"absolute", bottom:"20%", left:"15%", width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)", pointerEvents:"none", filter:"blur(50px)" }} />
      <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)", pointerEvents:"none" }} />

      <div style={{ width:"100%", maxWidth:380, position:"relative", zIndex:1 }}>

        {/* Logo + Title */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ position:"relative", width:96, height:96, margin:"0 auto 18px" }}>
            {/* Glow ring */}
            <div style={{ position:"absolute", inset:-4, borderRadius:"50%", background:"linear-gradient(135deg, #f59e0b, #8b5cf6)", padding:2, opacity:0.7 }}>
              <div style={{ width:"100%", height:"100%", borderRadius:"50%", background:"#0a0618" }} />
            </div>
            {/* Logo */}
            <div style={{ position:"relative", width:"100%", height:"100%", borderRadius:"50%", overflow:"hidden", background:"#1a1030" }}>
              <Image src="/logo.png" alt="شعار" fill style={{ objectFit:"contain", padding:8 }} priority />
            </div>
          </div>
          <h1 style={{ color:"#ffffff", fontSize:24, fontWeight:900, margin:"0 0 6px", textShadow:"0 0 40px rgba(139,92,246,0.4)" }}>
            منقوش على كفك
          </h1>
          <p style={{ color:"rgba(167,139,250,0.7)", fontSize:12, margin:0 }}>
            كنيسة السيدة العذراء · العاشر من رمضان
          </p>
        </div>

        {/* Card */}
        <div style={{
          background:"rgba(255,255,255,0.04)",
          border:"1px solid rgba(255,255,255,0.1)",
          borderRadius:20,
          backdropFilter:"blur(24px)",
          boxShadow:"0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)",
          overflow:"hidden",
        }}>

          {!selectedRole ? (
            <div style={{ padding:"24px 20px 20px" }}>
              <p style={{ color:"rgba(167,139,250,0.5)", fontSize:11, textAlign:"center", marginBottom:18, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:700 }}>
                اختر نوع الحساب
              </p>

              <GlassRoleBtn
                icon={<UserCheck size={20} />}
                label="دخول الخادم"
                sub="لوحة الخدمة والحضور والافتقاد"
                gradientFrom="#f59e0b"
                gradientTo="#d97706"
                glowColor="rgba(245,158,11,0.25)"
                onClick={() => { setSelectedRole("servant"); setError(""); }}
              />

              <div style={{ height:10 }} />

              <GlassRoleBtn
                icon={<User size={20} />}
                label="دخول المخدوم"
                sub="كارت الحضور QR وطلبات الصلاة"
                gradientFrom="#818cf8"
                gradientTo="#6366f1"
                glowColor="rgba(129,140,248,0.25)"
                onClick={() => { setSelectedRole("member"); setError(""); }}
              />

              {/* Quick Test Bar */}
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 8, fontWeight: 600 }}>
                  ⚡ تجربة سريعة بضغطة واحدة:
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const doLogin = async () => fetch("/api/auth/login", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ role: "servant", identifier: "01001234567", password: "123" }),
                        });
                        
                        let res = await doLogin();
                        if (res.status === 404) {
                          // Auto-seed for Vercel ephemeral DB
                          await fetch("/api/seed", { method: "POST" });
                          res = await doLogin();
                        }
                        
                        const data = await res.json();
                        if (data.success) login(data.user);
                      } finally { setLoading(false); }
                    }}
                    style={{
                      background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
                      color: "#fbbf24", borderRadius: 8, padding: "6px 12px", fontSize: 11,
                      fontWeight: 700, cursor: "pointer", fontFamily: "inherit"
                    }}
                  >
                    تجربة خادم (مينا سمير)
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const doLogin = async () => fetch("/api/auth/login", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ role: "member", identifier: "01006666666", password: "123" }),
                        });
                        
                        let res = await doLogin();
                        if (res.status === 404) {
                          // Auto-seed for Vercel ephemeral DB
                          await fetch("/api/seed", { method: "POST" });
                          res = await doLogin();
                        }
                        
                        const data = await res.json();
                        if (data.success) login(data.user);
                      } finally { setLoading(false); }
                    }}
                    style={{
                      background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.3)",
                      color: "#a5b4fc", borderRadius: 8, padding: "6px 12px", fontSize: 11,
                      fontWeight: 700, cursor: "pointer", fontFamily: "inherit"
                    }}
                  >
                    تجربة مخدوم (ماريا سامي)
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 14, textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, margin: 0 }}>
                  "هَوْذَا عَلَى الكَفَّيْنِ نَقَشْتُكِ" · إشعياء ٤٩: ١٦
                </p>
              </div>
            </div>

          ) : (
            <>
              {/* Form strip */}
              <div style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"13px 20px",
                borderBottom:"1px solid rgba(255,255,255,0.07)",
                background: isServant ? "rgba(245,158,11,0.06)" : "rgba(129,140,248,0.07)",
              }}>
                <button type="button" onClick={() => { setSelectedRole(null); setError(""); setIdentifier(""); setPassword(""); }}
                  style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontFamily:"inherit" }}>
                  <ArrowRight size={13} /> رجوع
                </button>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  {isServant ? <UserCheck size={14} style={{ color:"#f59e0b" }} /> : <User size={14} style={{ color:"#818cf8" }} />}
                  <span style={{ fontSize:12, fontWeight:800, color: isServant ? "#fbbf24" : "#a5b4fc" }}>
                    {isServant ? "دخول الخادم" : "دخول المخدوم"}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit} style={{ padding:"20px" }}>
                {error && (
                  <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:"10px 14px", color:"#fca5a5", fontSize:12, textAlign:"center", marginBottom:16 }}>
                    {error}
                  </div>
                )}

                <GlassInput
                  label="رقم الموبايل أو الاسم"
                  icon={<Phone size={14} />}
                  value={identifier}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIdentifier(e.target.value)}
                  placeholder={isServant ? "01001234567" : "01006666666"}
                  type="text"
                  required
                  accentColor={isServant ? "#f59e0b" : "#818cf8"}
                />

                <div style={{ height:12 }} />

                <GlassInput
                  label="كلمة المرور"
                  icon={<Lock size={14} />}
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  placeholder="••••••"
                  type="password"
                  accentColor={isServant ? "#f59e0b" : "#818cf8"}
                />

                <button type="submit" disabled={loading} style={{
                  width:"100%", marginTop:18, padding:"13px",
                  borderRadius:12, border:"none", cursor:loading ? "not-allowed":"pointer",
                  background: isServant
                    ? "linear-gradient(135deg, #f59e0b, #d97706)"
                    : "linear-gradient(135deg, #818cf8, #6366f1)",
                  color:"white", fontWeight:800, fontSize:14,
                  fontFamily:"inherit",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                  opacity: loading ? 0.7 : 1,
                  boxShadow: isServant
                    ? "0 6px 24px rgba(245,158,11,0.35), 0 0 0 1px rgba(245,158,11,0.1)"
                    : "0 6px 24px rgba(99,102,241,0.4), 0 0 0 1px rgba(129,140,248,0.1)",
                  transition:"opacity 0.15s",
                }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                  {loading ? "جاري التحقق..." : "دخول"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GlassRoleBtn({ icon, label, sub, gradientFrom, gradientTo, glowColor, onClick }: any) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 14px",
        borderRadius:14,
        border:`1px solid ${h ? gradientFrom + "60" : "rgba(255,255,255,0.08)"}`,
        background: h ? `rgba(255,255,255,0.06)` : "rgba(255,255,255,0.03)",
        cursor:"pointer", textAlign:"right", direction:"rtl",
        transition:"all 0.2s", fontFamily:"inherit",
        boxShadow: h ? `0 8px 32px ${glowColor}` : "none",
        transform: h ? "translateY(-2px)" : "none",
      }}>
      <div style={{
        width:44, height:44, borderRadius:12, flexShrink:0,
        background:`linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
        display:"flex", alignItems:"center", justifyContent:"center", color:"white",
        boxShadow:`0 4px 16px ${glowColor}`,
      }}>
        {icon}
      </div>
      <div style={{ flex:1 }}>
        <p style={{ color:"#f1f5f9", fontSize:14, fontWeight:800, margin:0 }}>{label}</p>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:11, marginTop:3 }}>{sub}</p>
      </div>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={h ? gradientFrom : "rgba(255,255,255,0.2)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, transition:"stroke 0.2s" }}>
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
}

function GlassInput({ label, icon, value, onChange, placeholder, type, required, accentColor }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.45)", marginBottom:7, letterSpacing:"0.06em" }}>
        {label}
      </label>
      <div style={{ position:"relative" }}>
        <input
          type={type} required={required} value={value} onChange={onChange} placeholder={placeholder}
          style={{
            width:"100%", background:"rgba(255,255,255,0.05)",
            border:`1.5px solid ${focused ? accentColor : "rgba(255,255,255,0.1)"}`,
            borderRadius:11, padding:"12px 42px 12px 14px", color:"#f1f5f9", fontSize:13,
            outline:"none", transition:"border-color 0.2s, background 0.2s", fontFamily:"inherit",
            direction:"ltr", textAlign:"right", boxSizing:"border-box",
            boxShadow: focused ? `0 0 0 3px ${accentColor}20` : "none",
          } as React.CSSProperties}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        />
        <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", color: focused ? accentColor : "rgba(255,255,255,0.3)", transition:"color 0.2s", pointerEvents:"none" }}>
          {icon}
        </span>
      </div>
    </div>
  );
}
