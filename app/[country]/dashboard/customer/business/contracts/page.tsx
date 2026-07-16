'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  ArrowLeft, 
  Plus,
  DollarSign,
  TrendingUp,
  Calendar,
  Edit,
  Trash2,
  Zap,
  Users,
  BarChart3
} from "lucide-react";

// Types
interface BusinessContract {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  startDate: string;
  endDate?: string;
  invoicingDate: number;
  pricingTiers: PricingTier[];
  totalUsage: number;
  totalSpent: number;
  memberCount: number;
}

interface PricingTier {
  id: string;
  minKwh: number;
  maxKwh?: number;
  ratePerKwh: number;
  discount: number;
}

// Demo data
const DEMO_CONTRACTS: BusinessContract[] = [
  {
    id: '1',
    name: 'Premium Business Contract',
    status: 'ACTIVE',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    invoicingDate: 15,
    pricingTiers: [
      { id: '1', minKwh: 0, maxKwh: 100, ratePerKwh: 400, discount: 20 },
      { id: '2', minKwh: 100, maxKwh: 500, ratePerKwh: 380, discount: 24 },
      { id: '3', minKwh: 500, ratePerKwh: 350, discount: 30 }
    ],
    totalUsage: 1250.5,
    totalSpent: 450000,
    memberCount: 8
  },
  {
    id: '2',
    name: 'Standard Fleet Contract',
    status: 'ACTIVE',
    startDate: '2024-02-01',
    invoicingDate: 1,
    pricingTiers: [
      { id: '4', minKwh: 0, maxKwh: 200, ratePerKwh: 450, discount: 10 },
      { id: '5', minKwh: 200, ratePerKwh: 420, discount: 16 }
    ],
    totalUsage: 680.2,
    totalSpent: 280000,
    memberCount: 4
  }
];

export default function BusinessContractsPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<BusinessContract[]>(DEMO_CONTRACTS);
  const [showCreateContract, setShowCreateContract] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newContract, setNewContract] = useState({
    name: '',
    startDate: '',
    endDate: '',
    invoicingDate: 1,
    pricingTiers: [
      { minKwh: 0, maxKwh: 100, ratePerKwh: 400, discount: 20 }
    ]
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'INACTIVE': return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case 'EXPIRED': return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // TODO: Implement API call to create contract
      console.log('Creating contract:', newContract);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add to local state
      const contract: BusinessContract = {
        id: Date.now().toString(),
        name: newContract.name,
        status: 'ACTIVE',
        startDate: newContract.startDate,
        endDate: newContract.endDate || undefined,
        invoicingDate: newContract.invoicingDate,
        pricingTiers: newContract.pricingTiers.map((tier, index) => ({
          id: (Date.now() + index).toString(),
          ...tier
        })),
        totalUsage: 0,
        totalSpent: 0,
        memberCount: 0
      };
      
      setContracts(prev => [...prev, contract]);
      setNewContract({
        name: '',
        startDate: '',
        endDate: '',
        invoicingDate: 1,
        pricingTiers: [{ minKwh: 0, maxKwh: 100, ratePerKwh: 400, discount: 20 }]
      });
      setShowCreateContract(false);
    } catch (error) {
      console.error('Error creating contract:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveContract = (contractId: string) => {
    setContracts(prev => prev.filter(contract => contract.id !== contractId));
  };

  const addPricingTier = () => {
    setNewContract(prev => ({
      ...prev,
      pricingTiers: [...prev.pricingTiers, {
        minKwh: prev.pricingTiers[prev.pricingTiers.length - 1]?.maxKwh || 0,
        maxKwh: (prev.pricingTiers[prev.pricingTiers.length - 1]?.maxKwh || 0) + 100,
        ratePerKwh: 400,
        discount: 20
      }]
    }));
  };

  const updatePricingTier = (index: number, field: string, value: number | undefined) => {
    setNewContract(prev => ({
      ...prev,
      pricingTiers: prev.pricingTiers.map((tier, i) => 
        i === index ? { ...tier, [field]: value } : tier
      )
    }));
  };

  const removePricingTier = (index: number) => {
    setNewContract(prev => ({
      ...prev,
      pricingTiers: prev.pricingTiers.filter((_, i) => i !== index)
    }));
  };

  const contractStats = {
    totalContracts: contracts.length,
    activeContracts: contracts.filter(c => c.status === 'ACTIVE').length,
    totalUsage: contracts.reduce((sum, c) => sum + c.totalUsage, 0),
    totalSpent: contracts.reduce((sum, c) => sum + c.totalSpent, 0),
    totalMembers: contracts.reduce((sum, c) => sum + c.memberCount, 0)
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Business Contracts</h1>
            <p className="text-muted-foreground mt-1">
              Manage your business contracts and pricing discounts
            </p>
          </div>
        </div>
        
        <Button 
          onClick={() => setShowCreateContract(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Contract
        </Button>
      </div>

      {/* Contract Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Contracts</p>
                <p className="text-2xl font-bold">{contractStats.totalContracts}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{contractStats.activeContracts}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="h-3 w-3 bg-green-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Usage</p>
                <p className="text-2xl font-bold">{contractStats.totalUsage.toFixed(1)} kWh</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">{formatCurrency(contractStats.totalSpent)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Members</p>
                <p className="text-2xl font-bold">{contractStats.totalMembers}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Contract Form */}
      {showCreateContract && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Business Contract
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateContract} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Contract Name *</Label>
                  <Input
                    id="name"
                    value={newContract.name}
                    onChange={(e) => setNewContract(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Premium Business Contract"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="invoicingDate">Invoicing Date *</Label>
                  <Input
                    id="invoicingDate"
                    type="number"
                    min="1"
                    max="31"
                    value={newContract.invoicingDate}
                    onChange={(e) => setNewContract(prev => ({ ...prev, invoicingDate: parseInt(e.target.value) }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newContract.startDate}
                    onChange={(e) => setNewContract(prev => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newContract.endDate}
                    onChange={(e) => setNewContract(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Pricing Tiers */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Pricing Tiers</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addPricingTier}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Tier
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {newContract.pricingTiers.map((tier, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg">
                      <div className="space-y-2">
                        <Label>Min kWh</Label>
                        <Input
                          type="number"
                          value={tier.minKwh}
                          onChange={(e) => updatePricingTier(index, 'minKwh', parseInt(e.target.value))}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Max kWh</Label>
                        <Input
                          type="number"
                          value={tier.maxKwh || ''}
                          onChange={(e) => updatePricingTier(index, 'maxKwh', e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="No limit"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Rate (RWF/kWh)</Label>
                        <Input
                          type="number"
                          value={tier.ratePerKwh}
                          onChange={(e) => updatePricingTier(index, 'ratePerKwh', parseInt(e.target.value))}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Discount (%)</Label>
                        <Input
                          type="number"
                          value={tier.discount}
                          onChange={(e) => updatePricingTier(index, 'discount', parseInt(e.target.value))}
                          required
                        />
                      </div>
                      
                      <div className="flex items-end">
                        {newContract.pricingTiers.length > 1 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removePricingTier(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-4 pt-4">
                <Button 
                  type="submit" 
                  disabled={isLoading || !newContract.name || !newContract.startDate}
                  className="flex-1"
                >
                  {isLoading ? 'Creating...' : 'Create Contract'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowCreateContract(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Contracts List */}
      <Card>
        <CardHeader>
          <CardTitle>Business Contracts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {contracts.map((contract) => (
              <div key={contract.id} className="border rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{contract.name}</h3>
                      {getStatusBadge(contract.status)}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(contract.startDate).toLocaleDateString()} - {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'No end date'}
                      </span>
                      <span>Invoicing: {contract.invoicingDate}th of month</span>
                      <span>{contract.memberCount} members</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveContract(contract.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Pricing Tiers */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Pricing Tiers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {contract.pricingTiers.map((tier) => (
                      <div key={tier.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm">
                          <span className="font-medium">
                            {tier.minKwh} - {tier.maxKwh ? tier.maxKwh : '∞'} kWh
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(tier.ratePerKwh)}/kWh ({tier.discount}% discount)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-600" />
                    <span>{contract.totalUsage.toFixed(1)} kWh used</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span>{formatCurrency(contract.totalSpent)} spent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    <span>Avg: {formatCurrency(contract.totalUsage > 0 ? contract.totalSpent / contract.totalUsage : 0)}/kWh</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
