import Link from "next/link";
import { Pill, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-50 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white">
        <Pill className="h-7 w-7" />
      </span>
      <p className="mt-6 text-6xl font-bold tracking-tight text-navy-900">404</p>
      <h1 className="mt-2 text-lg font-semibold text-navy-800">Page not found</h1>
      <p className="mt-1 max-w-sm text-sm text-navy-500">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-700"
      >
        <Home className="h-4 w-4" /> Back to home
      </Link>
    </div>
  );
}
