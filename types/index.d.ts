import { KabisaIdType } from "@/enums";
import { IChargerData, IEquipmentData, IVehicleData } from "./idRegistration";

export interface ICarData {
    "Kabisa ID": string;
    "Make": string;
    "Model": string;
    "Color": string;
    "Year": number;
    "Sales Status": string;
    "Ownership": string;
    "VIN": string;
    "Plate Numbers": string;
    "Free Charging Expiry Date": string;
    "Warranty Status": string;
    "Warranty Expiry Date": string;
    "GPS Tracker ID": string;
}


export interface IdVerifyResult {
    status: 'Found' | 'Not Found' | 'Unregistered' | 'Incomplete Registration';
    type: KabisaIdType | null;
}

export type ItemType = 'VEHICLE' | 'CHARGER' | 'EQUIPMENT' | 'METER';

export interface IdLookupResult {
    status: 'Success' | 'Not Found' | 'Invalid Pin' | 'Unregistered';
    info: any;
}

export interface IQrCodeCard {
    serialNumber: string;
    qrCodeUrl: string
}

export interface Operator {
    ID: number;
    Name: string;
    Headshot?: string[];
    KabisaID?: string;
}