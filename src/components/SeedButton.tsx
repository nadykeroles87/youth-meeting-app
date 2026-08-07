"use client";

export default function SeedButton({ onSuccess }: { onSuccess?: () => void }) {
  const handleSeed = async () => {
    await fetch("/api/seed", { method: "POST" });
    if (onSuccess) {
      onSuccess();
    } else {
      window.location.reload();
    }
  };

  return (
    <button
      onClick={handleSeed}
      className="inline-flex items-center gap-2 bg-stone-600 hover:bg-stone-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors cursor-pointer"
    >
      إضافة بيانات تجريبية
    </button>
  );
}
