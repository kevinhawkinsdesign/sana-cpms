'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { VehicleForm } from '@/components/order/VehicleOrderForm';
import { OrderConfirmation } from '@/components/order/OrderConfirmation';
import Modal from '@/components/shared/Modal';
import api from '@/lib/api/api';
import { createZodSchema } from '@/components/shared/SharedComponents';
import { AddOn, AddOnFromBackend, Discount, DiscountFromBackend, PriceInfo, VehicleFormData } from '@/types/oderVehicle';
import { IShopVehicle } from '@/types/shop';
import { toast } from 'sonner';
import { VehicleGallery } from '@/components/order/ImageGallery';
import KabisaLoading from '@/components/shared/Loading';
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';
import { useClarity } from "@/lib/hooks/useClarity";
import { useCurrencyConversion } from '@/lib/hooks/useCurrencyConversion';

const VehicleOrderContent: React.FC = () => {
  const router = useLocalizedRouter();
  const { trackEvent } = useClarity();
  const { convertCurrency, convertCurrencySync } = useCurrencyConversion();
  const params = useParams();
  const shopId = params?.shopId as string;


  const [vehicleInfo, setVehicleInfo] = useState<IShopVehicle | null>(null);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [price, setPrice] = useState<PriceInfo & { convertedPrice?: number; } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const schema = z.object({
    color: z.string().min(1, "Please select a color"),
    upfrontPercent: z.coerce.number().min(0).max(100),
    saleCountry: z.string().min(1, "Please select a country"),
    currency: z.string().min(1, "Please select a currency"),
    paymentMethod: z.string().min(1, "Please select a payment method"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    company: z.string().optional(),
    phoneNumber: z.string().min(1, "Phone number is required"),
    emailAddress: z.string().email("Invalid email address"),
  });

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      color: "",
      upfrontPercent: 0,
      saleCountry: "",
      currency: "",
      paymentMethod: "",
      firstName: "",
      lastName: "",
      company: "",
      phoneNumber: "",
      emailAddress: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (!shopId) return;
    const fetchVehicle = async () => {
      setIsLoading(true);
      try {
        const response = await api().get(`/api/client/shop-vehicles/${shopId}`);
        if (response.data.status !== 'success' || !response.data.data.vehicles || response.data.data.vehicles.length === 0) {
          setVehicleInfo(null);
          return;
        }
        const vehicle = response.data.data.vehicles[0];
        setVehicleInfo(vehicle);
        
        // Set country and currency based on vehicle's country
        const vehicleCountry = vehicle.country;
        if (vehicleCountry === 'KE') {
          form.setValue('saleCountry', 'Kenya');
          form.setValue('currency', 'KES');
        } else if (vehicleCountry === 'RW') {
          form.setValue('saleCountry', 'Rwanda');
          form.setValue('currency', 'RWF');
        }
        
        await Promise.all([
          fetchAddOns(vehicle),
          fetchDiscounts(vehicle)
        ]);
      } catch (e) {
        setVehicleInfo(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVehicle();
  }, [shopId, form]);



  const fetchAddOns = async (vehicle: IShopVehicle) => {
    try {
      const response = await api(false, false).post("/api/shopVehicleAddOns", {
        Make: vehicle.make,
        Model: vehicle.model,
        Year: vehicle.year,
        Trim: vehicle.trim
      });
      if (!response.data || !Array.isArray(response.data.addOns)) {
        setAddOns([]);
        return;
      }
      const mappedAddOns = response.data.addOns.map((addOn: AddOnFromBackend) => ({
        id: addOn.ID,
        name: addOn.Name,
        cost: addOn.Cost,
        isSelected: false,
        description: addOn.Description || '',
        category: addOn.Category || 'General',
        categoryMutuallyExclusive: Boolean(addOn.CategoryMutuallyExclusive),
      }));
      setAddOns(mappedAddOns);
    } catch (err) {
      setAddOns([]);
    }
  };

  const fetchDiscounts = async (vehicle: IShopVehicle) => {
    try {
      const response = await api(false, false).post("/api/shopVehicleDiscounts", {
        Make: vehicle.make,
        Model: vehicle.model,
        Year: vehicle.year,
        Trim: vehicle.trim,
      });
      if (!response.data || !Array.isArray(response.data.discounts)) {
        setDiscounts([]);
        return;
      }
      setDiscounts(
        response.data.discounts.map((discount: DiscountFromBackend) => ({
          id: discount.ID,
          name: discount.Name,
          cost: discount.Cost,
          description: discount.Description,
          category: discount.Category,
          categoryMutuallyExclusive: discount.CategoryMutuallyExclusive,
        }))
      );
    } catch (err) {
      setDiscounts([]);
    }
  };



  useEffect(() => {
    const formData = form.watch();
    if (formData.saleCountry && formData.currency && vehicleInfo) {
      const basePrice = vehicleInfo.price;
      const selectedCurrency = formData.currency;
      const vehicleCurrency = vehicleInfo.country === 'KE' ? 'KES' : 'RWF';
      
      // Use synchronous conversion for immediate UI updates
      const convertedBasePrice = convertCurrencySync(basePrice, vehicleCurrency, selectedCurrency);
      
      // Convert add-ons to the selected currency
      const selectedAddOnsTotal = addOns
        .filter(addon => addon.isSelected)
        .reduce((sum, addon) => {
          const convertedAddonCost = convertCurrencySync(addon.cost, vehicleCurrency, selectedCurrency);
          return sum + convertedAddonCost;
        }, 0);
      
      const totalPrice = convertedBasePrice + selectedAddOnsTotal;
      const upfrontPercent = formData.upfrontPercent || 0;
      const upfrontAmount = Math.round((totalPrice * upfrontPercent) / 100);
      
      setPrice({
        price: Math.round(totalPrice), // Round to avoid decimal issues
        currency: selectedCurrency,
        upfrontAmount: upfrontAmount,
        upfrontPercent: upfrontPercent
      });
    }
  }, [
    form.watch("saleCountry"),
    form.watch("currency"),
    form.watch("upfrontPercent"),
    vehicleInfo,
    addOns,
    convertCurrencySync
  ]);

  const handleAddOnToggle = useCallback((addOnId: string) => {
    const addon = addOns.find(a => a.id === addOnId);
    if (addon) {
      // Track addon selection
      trackEvent('addon_toggled', {
        addon_id: addOnId,
        addon_name: addon.name,
        addon_cost: addon.cost,
        is_selected: !addon.isSelected,
        vehicle_id: vehicleInfo?.id
      });
    }
    
    setAddOns(prevAddOns =>
      prevAddOns.map(addon =>
        addon.id === addOnId
          ? { ...addon, isSelected: !addon.isSelected }
          : addon
      )
    );
  }, [addOns, vehicleInfo, trackEvent]);

  const handleNavigateBack = useCallback(() => {
    router.push(`/shop`);
  }, [router]);

  const handleSubmit: SubmitHandler<VehicleFormData> = async (data) => {
    if (!vehicleInfo) {
      toast.error("No vehicle info available");
      return;
    }
    
    // Track order submission start
    trackEvent('order_submission_started', {
      vehicle_id: vehicleInfo.id,
      vehicle_make: vehicleInfo.make,
      vehicle_model: vehicleInfo.model,
      vehicle_price: vehicleInfo.price,
      addons_count: addOns.filter(addon => addon.isSelected).length,
      payment_method: data.paymentMethod,
      currency: data.currency
    });

    try {
      setIsOrdering(true);
      const response = await api().post("/api/shopVehicleOrder", {
        order: {
          ID: vehicleInfo.id,
          Make: vehicleInfo.make,
          Model: vehicleInfo.model,
          Year: vehicleInfo.year,
          Trim: vehicleInfo.trim,
          Color: data.color,
          addOnIds: addOns.filter(addon => addon.isSelected).map(addon => addon.id),
          discountIds: discounts.map(discount => discount.id),
          saleCountry: data.saleCountry,
        },
        customer: {
          "First Name": data.firstName,
          "Last Name": data.lastName,
          Email: data.emailAddress,
          Phone: data.phoneNumber,
          ...(data.company && { Company: data.company })
        },
        payment: {
          "Payment Method": data.paymentMethod,
          "Payment Currency": data.currency,
          "Upfront Percent": data.upfrontPercent
        },
      });
      if (response.data.status) {
        // Track successful order
        trackEvent('order_submission_success', {
          order_id: response.data.orderId,
          vehicle_id: vehicleInfo.id,
          vehicle_make: vehicleInfo.make,
          vehicle_model: vehicleInfo.model,
          total_price: vehicleInfo.price,
          payment_method: data.paymentMethod,
          currency: data.currency
        });
        
        setOrderId(response.data.orderId);
        setIsModalOpen(true);
      }
    }
    catch (e: any) {
      // Track order submission error
      trackEvent('order_submission_error', {
        vehicle_id: vehicleInfo.id,
        error_message: e?.message || 'Unknown error',
        payment_method: data.paymentMethod,
        currency: data.currency
      });
    }
    finally {
      setIsOrdering(false);
    }
  };

  const getYuanUpImages = () => {
    return [
      '/cars/yuanUp/yuanUp.webp',
      '/cars/yuanUp/YuanUp2.webp',
      '/cars/yuanUp/yuanUp3.webp',
      '/cars/yuanUp/yuanUp4.jpg',
      '/cars/yuanUp/yuanUp5.jpg',
    ];
  };

  // Track when user starts the order process
  useEffect(() => {
    if (vehicleInfo) {
      trackEvent('vehicle_order_page_viewed', {
        vehicle_id: vehicleInfo.id,
        vehicle_make: vehicleInfo.make,
        vehicle_model: vehicleInfo.model,
        vehicle_price: vehicleInfo.price,
        shop_id: shopId
      });
    }
  }, [vehicleInfo, shopId, trackEvent]);

  if (isLoading || !vehicleInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <KabisaLoading />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col lg:flex-row">
      {/* Image Section - Hidden on small screens, visible on large screens */}
      <div className="hidden lg:block w-full h-[40vh] lg:h-screen lg:w-[65%] lg:fixed lg:inset-0">
        <VehicleGallery
          images={
            vehicleInfo && vehicleInfo.make === 'BYD' && vehicleInfo.model.toLowerCase() === 'yuan up'
              ? getYuanUpImages()
              : [
                  vehicleInfo?.orderImage || vehicleInfo?.mainImage, // Use orderImage if available
                  ...(vehicleInfo?.additionalImages || [])
                ]
          }
          make={vehicleInfo.make}
          model={vehicleInfo.model}
          year={vehicleInfo.year}
        />
      </div>
      {/* Form Section - Full width on small screens, 35% on large screens */}
      <div className="w-full lg:w-[35%] lg:ml-[65%] flex flex-col justify-center items-center min-h-screen bg-[#f8f9fb] px-4 py-8 overflow-y-auto mt-16 lg:mt-19 pb-20">
        <VehicleForm
          form={form}
          vehicleInfo={vehicleInfo}
          addOns={addOns}
          discounts={discounts}
          price={price}
          isOrdering={isOrdering}
          onAddOnToggle={handleAddOnToggle}
          onNavigateBack={handleNavigateBack}
          onSubmit={handleSubmit}
          mainClassification={null}
        />
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Order Confirmation"
      >
        <OrderConfirmation
          orderId={orderId}
          onClose={() => {
            setIsModalOpen(false);
            router.push(`/shop`);
          }}
        />
      </Modal>
    </div>
  );
};

export default function VehicleOrder() {
  return (
    <Suspense fallback={<KabisaLoading />}>
      <VehicleOrderContent />
    </Suspense>
  );
}
