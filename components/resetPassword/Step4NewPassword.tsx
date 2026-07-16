'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, EyeIcon, EyeOffIcon, Loader2 } from "lucide-react";
import { useState } from "react";

interface Step4Props {
    onSubmit: (password: string) => void;
    onBack: () => void;
    isLoading: boolean;
}

export const Step4NewPassword = ({ onSubmit, onBack, isLoading }: Step4Props) => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const PasswordStrengthIndicator = ({ password }: { password: string }) => {
        const getStrength = () => {
            let strength = 0;
            if (password.length >= 8) strength++;
            if (password.match(/[A-Z]/)) strength++;
            if (password.match(/[0-9]/)) strength++;
            if (password.match(/[^A-Za-z0-9]/)) strength++;
            return strength;
        };

        const strength = getStrength();

        return (
            <div className="space-y-2">
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 ${strength === 0 ? "w-0" :
                                strength <= 2 ? "w-1/3 bg-red-500" :
                                    strength === 3 ? "w-2/3 bg-yellow-500" :
                                        "w-full bg-green-500"
                            }`}
                    />
                </div>
                {password && (
                    <p className={`text-sm ${strength <= 2 ? "text-red-500" :
                            strength === 3 ? "text-yellow-500" :
                                "text-green-500"
                        }`}>
                        {strength <= 2 ? "Weak" : strength === 3 ? "Good" : "Strong"} password
                    </p>
                )}
            </div>
        );
    };

    return (
        <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
                <CardTitle>Create New Password</CardTitle>
                <CardDescription>
                    Your new password must be different from previous passwords
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="relative">
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="New password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pr-10"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? (
                                <EyeOffIcon className="h-4 w-4 text-gray-400" />
                            ) : (
                                <EyeIcon className="h-4 w-4 text-gray-400" />
                            )}
                        </Button>
                    </div>
                    <PasswordStrengthIndicator password={password} />
                </div>

                <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />

                {confirmPassword && password !== confirmPassword && (
                    <Alert variant="destructive">
                        <AlertDescription>
                            Passwords don&apos;t match
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
                <Button
                    className="w-full bg-black hover:bg-gray-900 text-white"
                    onClick={() => onSubmit(password)}
                    disabled={
                        !password ||
                        password.length < 8 ||
                        password !== confirmPassword ||
                        isLoading
                    }
                >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reset Password
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