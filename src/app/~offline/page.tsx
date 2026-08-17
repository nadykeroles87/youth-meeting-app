import { WifiOff } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-900 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center space-y-6">
        <div className="mx-auto bg-amber-100 w-24 h-24 rounded-full flex items-center justify-center">
          <WifiOff className="w-12 h-12 text-amber-600" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">أنت غير متصل بالإنترنت</h1>
          <p className="text-gray-500">
            يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.
          </p>
        </div>

        <Link
          href="/"
          className="inline-block w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors"
        >
          حاول مرة أخرى
        </Link>
      </div>
    </div>
  );
}
