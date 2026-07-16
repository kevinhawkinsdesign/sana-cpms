'use client';

import { Construction } from "lucide-react";

export default function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 bg-yellow-100 rounded-full">
            <Construction className="h-12 w-12 text-yellow-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          This page is under development
        </h1>
        <p className="text-gray-600 max-w-md">
          We're working hard to bring you this feature. Please check back soon.
        </p>
      </div>
    </div>
  );
}
