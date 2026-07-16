"use client";

import React, { useState } from "react";
import Image from "next/legacy/image";

const NewsletterSubscription: React.FC = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      // Simulate an API call for newsletter subscription
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStatus("success");
      setEmail("");
    } catch (error) {
      setStatus("error");
    }
  };

  return (
    <section className="py-8 sm:py-12 md:py-16 relative">
      {/* Background Image */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/newsletter-bg.jpg"
          alt="Newsletter Background"
          layout="fill"
          objectFit="cover"
          priority
        />
        <div className="absolute inset-0 bg-white/90 sm:bg-white/95"></div>
      </div>

      <div className="relative w-full max-w-4xl mx-auto text-center px-4 sm:px-6 md:px-8">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
          Join Our Newsletter
        </h2>
        <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8 max-w-2xl mx-auto">
          Sign up for our free newsletters to receive the latest news. Don't
          worry we won't do spam.
        </p>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-3 sm:gap-0 max-w-2xl mx-auto"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your Email Address"
            className="flex-1 px-4 sm:px-6 py-3 border sm:border-r-0 border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 rounded sm:rounded-r-none"
            required
          />
          <button
            type="submit"
            className="px-6 sm:px-8 py-3 bg-green-500 text-white font-medium hover:bg-green-600 transition-colors whitespace-nowrap rounded sm:rounded-l-none text-sm sm:text-base"
          >
            SUBSCRIBE
          </button>
        </form>

        {status === "success" && (
          <p className="mt-4 text-green-600">Subscription successful!</p>
        )}
        {status === "error" && (
          <p className="mt-4 text-red-600">Failed to subscribe. Please try again.</p>
        )}

        {/* Optional additional text that only shows on larger screens */}
        <p className="mt-4 text-xs sm:text-sm text-gray-400 max-w-lg mx-auto">
          By subscribing, you agree to our privacy policy and consent to receive
          updates.
        </p>
      </div>
    </section>
  );
};

export default NewsletterSubscription;
