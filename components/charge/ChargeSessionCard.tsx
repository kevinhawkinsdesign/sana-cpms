'use client'

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Battery, CreditCard, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/lib/utils/formatters';

interface ChargeSession {
    date: string;
    chargeDuration: string;
    endSoc: number;
    paymentMethod: string;
    revenue: number;
}

interface ChargeHistoryProps {
    chargeHistory: {
        status: boolean;
        info: ChargeSession[];
    } | null;
}

const ChargeHistory: React.FC<ChargeHistoryProps> = ({ chargeHistory }) => {
    if (!chargeHistory || !chargeHistory.status) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-8"
        >
            <Card className="overflow-hidden">
                <div className="bg-blue-600 text-white px-6 py-4">
                    <h2 className="text-2xl font-bold">Charge History</h2>
                </div>
                <div className="divide-y divide-gray-200">
                    {chargeHistory.info.map((session, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-6 hover:bg-gray-50 transition duration-150 ease-in-out"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                                <div className="flex items-center">
                                    <Calendar className="w-5 h-5 text-blue-500 mr-2" />
                                    <span className="text-gray-600">Date:</span>
                                    <span className="ml-2 font-semibold">{formatDate(session.date)}</span>
                                </div>
                                <div className="flex items-center">
                                    <Clock className="w-5 h-5 text-blue-500 mr-2" />
                                    <span className="text-gray-600">Duration:</span>
                                    <span className="ml-2 font-semibold">{session.chargeDuration}</span>
                                </div>
                                <div className="flex items-center">
                                    <Battery className="w-5 h-5 text-blue-500 mr-2" />
                                    <span className="text-gray-600">End SOC:</span>
                                    <span className="ml-2 font-semibold">{(session.endSoc * 100).toFixed(0) || "-"}%</span>
                                </div>
                                <div className="flex items-center">
                                    <CreditCard className="w-5 h-5 text-blue-500 mr-2" />
                                    <span className="text-gray-600">Payment Method:</span>
                                    <span className="ml-2 font-semibold">{session.paymentMethod || "-"}</span>
                                </div>
                                <div className="flex items-center">
                                    <DollarSign className="w-5 h-5 text-blue-500 mr-2" />
                                    <span className="text-gray-600">Cost:</span>
                                    <span className="ml-2 font-semibold">{Number(session.revenue || 0).toLocaleString()} RWF</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </Card>
        </motion.div>
    );
};

export default ChargeHistory;