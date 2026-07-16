import React from 'react';

const getPasswordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { label: 'Weak', color: 'bg-red-500' };
  if (score === 3) return { label: 'Medium', color: 'bg-yellow-500' };
  if (score >= 4) return { label: 'Strong', color: 'bg-green-600' };
  return { label: '', color: 'bg-gray-200' };
};

interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
  const { label, color } = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="mt-1">
      <div className="flex items-center gap-2">
        <div className={`h-2 w-20 rounded ${color} transition-all duration-300`} />
        <span className="text-xs font-medium text-gray-700">{label}</span>
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;