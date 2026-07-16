'use client';

import { useAuth } from "@/lib/auth/authContext";
import { useUserDashboardSessions } from "@/lib/api/hooks/useUserDashboard";
import { RecentSessionsTable } from "@/components/dashboard/Customer/Others/RecentSessionsTable";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomerSessionsPage() {
  const { user } = useAuth();
  const { data: sessionsRespRaw, isLoading: loadingSessions, error: sessionsError } = useUserDashboardSessions(1, 50);

  // Ensure sessions data is always an array
  const sessionsResp =
    sessionsRespRaw && typeof sessionsRespRaw === "object" ? sessionsRespRaw : { sessions: [] };
  const sessionsRaw = Array.isArray((sessionsResp as any).sessions)
    ? (sessionsResp as any).sessions
    : [];

  if (sessionsError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Sessions</h1>
          <p className="text-muted-foreground">
            View your charging session history and detailed information.
          </p>
        </div>
        
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Sessions</h3>
              <p className="text-muted-foreground mb-4">
                There was an error loading your charging sessions. Please try again.
              </p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingSessions) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Sessions</h1>
          <p className="text-muted-foreground">
            View your charging session history and detailed information.
          </p>
        </div>
        
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your charging sessions...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Sessions</h1>
        <p className="text-muted-foreground">
          View your charging session history and detailed information.
        </p>
      </div>

      <RecentSessionsTable sessions={sessionsRaw} fullPage={true} showAll={true} />
    </div>
  );
}
