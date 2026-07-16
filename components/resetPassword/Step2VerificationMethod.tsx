'use client';

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Mail, Phone } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Step2Props {
    onNext: (method: "email" | "phone") => void;
    onBack: () => void;
    isLoading: boolean;
    userInfo: {
        email: string;
        phone: string;
    };
}

export const Step2VerificationMethod = ({ onNext, onBack, isLoading, userInfo }: Step2Props) => {
    const [selectedMethod, setSelectedMethod] = useState<"email" | "phone">(
        userInfo.email ? "email" : "phone"
    );

    return (
        <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
                <CardTitle>Choose Verification Method</CardTitle>
                <CardDescription>
                    Select how you want to receive the verification code
                </CardDescription>
            </CardHeader>
            <CardContent>
                <RadioGroup
                    className="gap-6"
                    defaultValue={selectedMethod}
                    onValueChange={(value) => setSelectedMethod(value as "email" | "phone")}
                >
                    {userInfo.email && (
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="email" id="email" />
                            <Label htmlFor="email" className="flex flex-1 items-center justify-between p-4 cursor-pointer">
                                <div className="flex items-center space-x-3">
                                    <Mail className="h-5 w-5 text-muted-foreground" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">Email</p>
                                        <p className="text-sm text-muted-foreground">{userInfo.email}</p>
                                    </div>
                                </div>
                            </Label>
                        </div>
                    )}
                    {userInfo.phone && (
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="phone" id="phone" />
                            <Label htmlFor="phone" className="flex flex-1 items-center justify-between p-4 cursor-pointer">
                                <div className="flex items-center space-x-3">
                                    <Phone className="h-5 w-5 text-muted-foreground" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">SMS</p>
                                        <p className="text-sm text-muted-foreground">{userInfo.phone}</p>
                                    </div>
                                </div>
                            </Label>
                        </div>
                    )}
                </RadioGroup>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
                <Button
                    className="w-full bg-black hover:bg-gray-900 text-white"
                    onClick={() => onNext(selectedMethod)}
                    disabled={isLoading}
                >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continue
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