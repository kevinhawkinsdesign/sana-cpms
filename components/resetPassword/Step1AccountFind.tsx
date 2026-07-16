'use client';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { useState } from "react";

interface Step1Props {
    onNext: (identifier: string) => void;
    onBack: () => void;
    isLoading: boolean;
}

export const Step1AccountFind = ({ onNext, onBack, isLoading }: Step1Props) => {
    const [identifier, setIdentifier] = useState("");

    return (
        <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
                <CardTitle>Find Your Account</CardTitle>
                <CardDescription>
                    Enter your email, phone number, or username
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search your account"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
                <Button
                    className="w-full bg-black hover:bg-gray-900 text-white"
                    onClick={() => onNext(identifier)}
                    disabled={!identifier.trim() || isLoading}
                >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Search
                </Button>
                <Button
                    variant="ghost"
                    className="w-full"
                    onClick={onBack}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                </Button>
            </CardFooter>
        </Card>
    );
};