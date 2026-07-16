'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp"

interface Step3Props {
    onNext: (code: string) => void;
    onBack: () => void;
    isLoading: boolean;
    contact: string;
    method: "email" | "phone";
    onResendCode: () => Promise<void>;
}

export const Step3VerificationCode = ({
    onNext,
    onBack,
    isLoading,
    contact,
    method,
    onResendCode
}: Step3Props) => {
    const [code, setCode] = useState("");
    const [countdown, setCountdown] = useState(0);
    const [isResending, setIsResending] = useState(false);

    // Format the countdown time to mm:ss
    const formatTime = useCallback((time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, []);

    // Handle countdown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setInterval(() => {
                setCountdown(current => current - 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [countdown]);

    // Handle resend code
    const handleResend = async () => {
        if (countdown > 0) return;

        setIsResending(true);
        try {
            await onResendCode();
            setCountdown(60); // Start 1-minute countdown
        } catch (error) {
            // console.error('Failed to resend code:', error);
        } finally {
            setIsResending(false);
        }
    };

    // Start initial countdown on component mount
    useEffect(() => {
        setCountdown(60);
    }, []);

    return (
        <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
                <CardTitle>Enter Verification Code</CardTitle>
                <CardDescription>
                    We sent a 6-digit code to your {method} at {contact}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
                <InputOTP
                    value={code}
                    onChange={(value) => setCode(value)}
                    maxLength={6}
                >
                    <InputOTPGroup>
                        <InputOTPSlot index={0} className="h-12 w-12 text-xl" />
                        <InputOTPSlot index={1} className="h-12 w-12 text-xl" />
                        <InputOTPSlot index={2} className="h-12 w-12 text-xl" />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                        <InputOTPSlot index={3} className="h-12 w-12 text-xl" />
                        <InputOTPSlot index={4} className="h-12 w-12 text-xl" />
                        <InputOTPSlot index={5} className="h-12 w-12 text-xl" />
                    </InputOTPGroup>
                </InputOTP>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Didn&apos;t receive the code?</span>
                    {countdown > 0 ? (
                        <span className="text-muted-foreground">
                            Resend in {formatTime(countdown)}
                        </span>
                    ) : (
                        <Button
                            variant="link"
                            className="p-0 h-auto text-yellow-600 hover:text-yellow-700"
                            onClick={handleResend}
                            disabled={isResending || isLoading}
                        >
                            {isResending ? (
                                <span className="flex items-center">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                </span>
                            ) : (
                                "Resend code"
                            )}
                        </Button>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
                <Button
                    className="w-full bg-black hover:bg-gray-900 text-white"
                    onClick={() => onNext(code)}
                    disabled={code.length !== 6 || isLoading}
                >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify Code
                </Button>
                <Button
                    variant="ghost"
                    className="w-full"
                    onClick={onBack}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </CardFooter>
        </Card>
    );
};