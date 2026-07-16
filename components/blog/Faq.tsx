"use client";

import React, { JSX, useState } from "react";
import {
  Plus,
  Minus,
  Battery,
  Timer,
  Zap,
  Car,
  DollarSign,
  Wrench,
} from "lucide-react";
import { LocalizedLink } from "../shared/LocalizedLink";

interface FAQItem {
  id: number;
  icon: JSX.Element;
  category: string;
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    id: 1,
    icon: <Battery className="w-6 h-6" />,
    category: "Battery & Range",
    question: "What's the typical range of an electric vehicle in Rwanda?",
    answer:
      "Most modern EVs offer a range between 200-300 kilometers on a single charge. However, actual range can vary based on factors like driving style, terrain, and weather conditions.",
  },
  {
    id: 2,
    icon: <Timer className="w-6 h-6" />,
    category: "Charging",
    question: "How long does it take to charge an electric car?",
    answer:
      "Charging time varies depending on the charging method. With a home Level 2 charger, you can fully charge in 6-8 hours overnight.",
  },
  {
    id: 3,
    icon: <DollarSign className="w-6 h-6" />,
    category: "Cost",
    question:
      "Are electric vehicles more expensive to maintain than petrol cars?",
    answer:
      "No, EVs typically have lower maintenance costs. They have fewer moving parts, no oil changes, and regenerative braking reduces wear on brake pads.",
  },
  {
    id: 4,
    icon: <Zap className="w-6 h-6" />,
    category: "Performance",
    question: "How do electric cars perform compared to petrol vehicles?",
    answer:
      "Electric vehicles often outperform traditional cars in acceleration and torque.",
  },
  {
    id: 5,
    icon: <Wrench className="w-6 h-6" />,
    category: "Maintenance",
    question: "What kind of maintenance do electric vehicles need?",
    answer:
      "EVs require less routine maintenance than conventional vehicles. Regular checks include tire rotation, brake fluid, and coolant levels.",
  },
  {
    id: 6,
    icon: <Car className="w-6 h-6" />,
    category: "Practicality",
    question: "Are electric vehicles practical for everyday use in Rwanda?",
    answer:
      "Yes, EVs are increasingly practical in Rwanda. With growing charging infrastructure, sufficient range, and lower operating costs.",
  },
];

const EVFAQSection: React.FC = () => {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = ["all", ...new Set(faqData.map((item) => item.category))];

  const filteredFAQs =
    activeCategory === "all"
      ? faqData
      : faqData.filter((item) => item.category === activeCategory);

  return (
    <section className="py-20 bg-gray-50 mt-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600">
            Get answers to common questions about electric vehicles in Rwanda
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                ${
                  activeCategory === category
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/20"
                    : "bg-white text-gray-600 hover:bg-green-50"
                }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* FAQ Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {filteredFAQs.map((faq) => (
            <div
              key={faq.id}
              className={`bg-white rounded-2xl shadow-lg transition-all duration-500
                ${
                  activeId === faq.id ? "ring-2 ring-green-500 shadow-xl" : ""
                }`}
            >
              <button
                onClick={() => setActiveId(activeId === faq.id ? null : faq.id)}
                className="w-full text-left p-6"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-lg transition-colors duration-300
                    ${
                      activeId === faq.id
                        ? "bg-green-500 text-white"
                        : "bg-green-50 text-green-500"
                    }`}
                  >
                    {faq.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-sm font-medium text-green-500">
                        {faq.category}
                      </span>
                      {activeId === faq.id ? (
                        <Minus className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Plus className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mt-1 text-gray-900">
                      {faq.question}
                    </h3>
                  </div>
                </div>
                {/* Answer */}
                <div
                  className={`mt-4 text-gray-600 transition-all duration-500 overflow-hidden
                  ${
                    activeId === faq.id
                      ? "max-h-96 opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="pl-16">{faq.answer}</div>
                </div>
              </button>
            </div>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            Still have questions about electric vehicles?
          </p>
          <LocalizedLink href="/contact">
            <button
              className="bg-green-500 text-white px-8 py-3 rounded-full 
            hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
            >
              Contact Our EV Specialists
            </button>
          </LocalizedLink>
        </div>
      </div>
    </section>
  );
};

export default EVFAQSection;
