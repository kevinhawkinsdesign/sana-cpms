'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api/api'
import { toast } from 'sonner'

interface StartSessionData {
  cId: string
  vId: string
  socStart: number
}

interface EndSessionData {
  vId: string
  info: {
    "SOC End": number
    "Energy Charged": number
    "Payment type": string
  }
}

export function useChargingSession() {
  const [paymentInfo, setPaymentInfo] = useState<any>(null)
  const [vehicleInfo, setVehicleInfo] = useState<any>(null)
  const [chargingInfo, setChargingInfo] = useState<any>(null)
  const [needsRegistration, setNeedsRegistration] = useState(false)

  const startSession = useMutation({
    mutationFn: async (data: StartSessionData) => {
      return api().post("/api/charge/chargeSessionStart", data)
    },
    onSuccess: (response) => {
      if (response.data.status) {
        setChargingInfo({
          standardPrice: response.data.chargerInfo["Standard Charging Price"],
          freeChargingExpiration: response.data.vehicleInfo["Free Charging Expiration"],
        })
        setVehicleInfo({
          licenseNumber: response.data.vehicleInfo["License Plate #"],
          make: response.data.vehicleInfo["Make"],
          model: response.data.vehicleInfo["Model"],
          imageUrl: response.data.vehicleInfo["Vehicle Image"],
          kabisaId: response.data.vehicleInfo["Kabisa ID"] || "",
        })
        return { success: true, showConfirmation: true }
      } else if (response.data.needsRegistration) {
        setNeedsRegistration(true)
        return { success: false, needsRegistration: true }
      } else {
        toast.error(response.data.message)
        return { success: false, message: response.data.message }
      }
    },
    onError: (error) => {
      console.error("Error starting session:", error)
      // toast.error("Failed to start charging session")
      return { success: false, message: "Failed to start charging session" }
    }
  })

  const endSession = useMutation({
    mutationFn: async (data: EndSessionData) => {
      return api().post("/api/charge/chargeSessionEnd", data)
    },
    onSuccess: (response) => {
      if (response.data.status) {
        setPaymentInfo(response.data.paymentInfo)
        return { success: true, showPayment: true }
      } else if (response.data.needsRegistration) {
        setNeedsRegistration(true)
        return { success: false, needsRegistration: true }
      } else {
        toast.error(response.data.message)
        return { success: false, message: response.data.message }
      }
    },
    onError: (error) => {
      console.error("Error ending session:", error)
      // toast.error("Failed to end charging session")
      return { success: false, message: "Failed to end charging session" }
    }
  })

  const registerVehicleQuick = useMutation({
    mutationFn: async (data: any) => {
      return api().post("/api/register/idRegisterVehicleQuick", data)
    },
    onSuccess: (response) => {
      if (response.data.status) {
        setNeedsRegistration(true)
        return { success: true }
      } else {
        toast.error(response.data.message)
        return { success: false, message: response.data.message }
      }
    },
    onError: (error) => {
      console.error("Registration error:", error)
      // toast.error("Failed to register vehicle")
      return { success: false, message: "Failed to register vehicle" }
    }
  })

  return {
    startSession,
    endSession,
    registerVehicleQuick,
    paymentInfo,
    setPaymentInfo,
    vehicleInfo,
    setVehicleInfo,
    chargingInfo,
    setChargingInfo,
    needsRegistration,
    setNeedsRegistration
  }
}