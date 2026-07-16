import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star, Zap, BadgeCheck, Infinity as InfinityIcon, Hash, Clock } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface Entitlement {
  id: string;
  type: string;
  description: string;
  remainingCount?: number;
  isUnlimited: boolean;
  expiryDate?: string;
  isActive: boolean;
  createdAt: string;
}

interface EntitlementsTableProps {
  entitlements: Entitlement[];
}

export const EntitlementsTable: React.FC<EntitlementsTableProps> = ({ entitlements }) => {
  // Ensure entitlements is always an array
  const safeEntitlements = Array.isArray(entitlements) ? entitlements : [];
  
  if (!safeEntitlements || safeEntitlements.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Your Entitlements
          </CardTitle>
          <CardDescription>No entitlements available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getTypeBadge = (entitlement: Entitlement) => {
    if (entitlement.isUnlimited) {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          <InfinityIcon className="w-3 h-3 mr-1" />
          Unlimited
        </Badge>
      );
    }
    if (entitlement.remainingCount === 1) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Zap className="w-3 h-3 mr-1" />
          One-Time
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
        <Hash className="w-3 h-3 mr-1" />
        Limited
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <BadgeCheck className="w-3 h-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        Inactive
      </Badge>
    );
  };

  const getRemainingText = (entitlement: Entitlement) => {
    if (entitlement.isUnlimited) return '∞';
    if (entitlement.remainingCount !== undefined) return `${entitlement.remainingCount} remaining`;
    return '—';
  };

  const getExpiryText = (expiryDate?: string) => {
    if (!expiryDate) return '—';
    const date = new Date(expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `Expires in ${diffDays} days`;
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500" />
          Your Entitlements
        </CardTitle>
        <CardDescription>Manage your charging entitlements and free sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeEntitlements.map((entitlement) => (
                <TableRow key={entitlement.id}>
                  <TableCell>{getTypeBadge(entitlement)}</TableCell>
                  <TableCell className="max-w-xs truncate" title={entitlement.description}>
                    {entitlement.description}
                  </TableCell>
                  <TableCell>{getRemainingText(entitlement)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      {getExpiryText(entitlement.expiryDate)}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(entitlement.isActive)}</TableCell>
                  <TableCell>
                    {new Date(entitlement.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
