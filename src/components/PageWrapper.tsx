import Sidebar from "./Sidebar";
import { ReactNode } from "react";

export default function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row w-full max-w-full overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 w-full max-w-full min-w-0 lg:mr-64 p-4 lg:p-8 pt-16 lg:pt-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
