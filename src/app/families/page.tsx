"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FamiliesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/followup");
  }, [router]);

  return null;
}
