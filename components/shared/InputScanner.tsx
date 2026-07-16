import React, { ComponentPropsWithoutRef, useState } from 'react';
import { FieldError, UseFormRegister } from 'react-hook-form';
import { CameraOffIcon, QrCode } from 'lucide-react';
import QRScanner from '../scanner/QrScanner';

interface CustomInputProps {
    label: string;
    register: UseFormRegister<any>;
    error?: FieldError;
    onScan?: (value: string) => void;
    className?: string;
}

type InputScannerProps = CustomInputProps &
    Omit<ComponentPropsWithoutRef<'input'>, keyof CustomInputProps | 'className'>;

export const InputScanner: React.FC<InputScannerProps> = ({
    label,
    register,
    error,
    required = false,
    name,
    onScan,
    className = '',
    ...restProps
}) => {
    const [scannerVisible, setScannerVisible] = useState(false);

    const toggleScanner = () => {
        setScannerVisible(!scannerVisible);
    };

    const handleScan = (scannedValue: string | null) => {
        if (scannedValue) {
            const event = {
                target: {
                    name,
                    value: scannedValue
                }
            } as React.ChangeEvent<HTMLInputElement>;

            register(name as string).onChange(event);

            if (onScan) {
                onScan(scannedValue);
            }
        }
        setScannerVisible(false);
    };

    return (
        <div className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>

            <div className="relative">
                <input
                    id={name}
                    {...register(name as string, { required })}
                    {...restProps}
                    className={`w-full px-4 py-2 pr-12 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border ${error ? 'border-red-500' : 'border-gray-300'
                        } placeholder-gray-400 ${className}`}
                />

                {restProps.disabled ?
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-300 hover:text-gray-300 focus:outline-none bg-gray-100 rounded-full hover:bg-gray-200 transition-all duration-200">
                        <CameraOffIcon className="h-5 w-5" />
                    </div>
                    :
                    <button
                        type="button"
                        onClick={toggleScanner}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 focus:outline-none bg-gray-100 rounded-full hover:bg-gray-200 transition-all duration-200"
                    >
                        <QrCode className="h-5 w-5" />
                    </button>}

            </div>

            {error && <p className="mt-1 text-sm text-red-500">{error.message}</p>}

            {scannerVisible && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Scan QR Code</h3>
                            <p className="text-sm text-gray-500">Position the QR code within the frame</p>
                        </div>

                        <div className="relative aspect-square w-full bg-gray-100 rounded-lg overflow-hidden">
                            <QRScanner onScan={handleScan} />
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setScannerVisible(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InputScanner;