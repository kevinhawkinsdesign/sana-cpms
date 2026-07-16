'use client';

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/authContext";
import { BusinessProvider } from "@/lib/providers/BusinessProvider";
import { OrganizationProvider } from "@/lib/providers/OrganizationProvider";
import Header from "@/components/layout/DashboardHeader";
import Sidebar from "@/components/layout/Sidebar";
import { useLocalizedRouter } from "@/lib/hooks/useLocalizedRouter";

const LoadingSkeleton = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header Skeleton */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b z-20">
        <div className="h-full px-6 flex items-center justify-between">
          <div className="w-32 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
            <div className="hidden lg:block w-40 h-10 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Sidebar Skeleton */}
      <div className="fixed left-0 top-0 bottom-0 w-72 bg-white border-r hidden lg:block">
        <div className="h-16 border-b px-6 flex items-center">
          <div className="w-32 h-8 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-3">
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
              <div className="w-28 h-5 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Content Skeleton - Business Management Style */}
      <main className="lg:ml-72 pt-20">
        <div className="p-4 lg:p-8">
          <div className="space-y-8">
            {/* Header Skeleton */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="w-48 h-8 bg-gray-200 rounded animate-pulse" />
                  <div className="w-64 h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="flex items-center gap-4 mt-3">
                    <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="w-32 h-10 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>

            {/* Search and Filter Skeleton */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex gap-3">
                <div className="flex-1 h-9 bg-gray-200 rounded animate-pulse" />
                <div className="w-32 h-9 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>

            {/* Table Skeleton */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-white px-4 py-3 border-b border-gray-200">
                <div className="w-48 h-4 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-3 border-b border-gray-100">
                      <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="w-24 h-3 bg-gray-200 rounded animate-pulse" />
                      </div>
                      <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  countryCode?: string;
}

export default function DashboardLayout({ children, countryCode }: DashboardLayoutProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true); // Start with sidebar open
  const [mounted, setMounted] = useState(false);
  const router = useLocalizedRouter();

  // Handle client-side only code
  useEffect(() => {
    setMounted(true);
    
    // Handle redirect if not authenticated
    if (!isLoading && !isAuthenticated) {
      const currentPath = window.location.pathname + window.location.search;
      const loginUrl = `/auth/login?callbackUrl=${encodeURIComponent(currentPath)}`;
      router.push(loginUrl);
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading skeleton or nothing during initial load
  if (isLoading || !mounted) {
    return <LoadingSkeleton />;
  }

  // If not authenticated and we're on the client-side, return null
  // The useEffect above will handle the redirect
  if (!isAuthenticated) {
    return <LoadingSkeleton />;
  }

  return (
    <BusinessProvider>
    <OrganizationProvider>
      <div className="min-h-screen bg-white">
        <Header 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
          isOpen={sidebarOpen}
        />
        <Sidebar 
          isOpen={sidebarOpen} 
          setIsOpen={setSidebarOpen} 
        />

        {/* Main Content */}
        <main 
          className={`transition-all duration-300 pt-16 min-h-screen overflow-y-auto
            ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-0'}`}
        >
          <div className="p-2 sm:p-4 lg:p-8 min-h-full">
            {children}
          </div>
        </main>
      </div>
    </OrganizationProvider>
    </BusinessProvider>
  );
}