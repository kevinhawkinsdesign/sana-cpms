"use client";

import React from "react";
import Image from "next/image";
import {
  Calendar,
  User,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Suspense } from 'react';
import { LocalizedLink } from "@/components/shared/LocalizedLink";

// Cloudflare Image Transformation URL helper
const cloudflareUrl = (imagePath: string, width: number, quality: number = 80): string => 
  `https://next.gokabisa.com/cdn-cgi/image/width=${width},quality=${quality},format=webp${imagePath}`;

function EvsVsHybridsPostContent() {
  return (
    <div className="bg-gray-50 min-h-screen pt-24 pb-12 mt-10">
      <article className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 text-sm text-green-600 mb-2">
            <span className="bg-green-50 px-3 py-1 rounded-full">
              Commercial EV
            </span>
            <span className="bg-green-50 px-3 py-1 rounded-full">Market</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            EVs v Hybrids: what's the difference, and which one is right for you?
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>June 26, 2024</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Sylvie Sugira</span>
            </div>
          </div>
        </div>

        {/* Featured Image - Using Cloudflare */}
        <div className="relative w-full h-[400px] mb-8">
          <Image
            src={cloudflareUrl('/images/difference.webp', 1200)}
            alt="EVs vs Hybrids"
            fill
            priority
            className="rounded-xl object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            unoptimized={true}
          />
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <p className="lead text-lg text-gray-700 mb-8">
            In this blog, we'll compare EVs and hybrids side-by-side, in the
            Rwandan context, so you can make an informed decision about which
            type of vehicle is right for you.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            Key concepts
          </h2>
          <div className="bg-blue-50 p-6 rounded-lg my-8">
            <h3 className="font-bold text-blue-900 mb-4">
              Vehicle Types Overview:
            </h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-blue-800">
                  EVs (Fully Electric)
                </h4>
                <p className="text-blue-700">
                  Gets its power only from its electric motor and the
                  electricity stored in its rechargeable battery, and doesn't
                  use any petrol or diesel.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800">Plug-in Hybrid</h4>
                <p className="text-blue-700">
                  Has a petrol engine as well as a large, chargeable battery. It
                  can run on the battery alone, and switch to fuel when the
                  battery is low.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800">
                  Non Plug-in Hybrid
                </h4>
                <p className="text-blue-700">
                  Has a petrol engine and an electric motor that uses energy
                  stored in a battery. That battery can't be charged up like a
                  PHEV or EV.
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            Cost to buy
          </h2>
          <p className="text-gray-700 mb-6">
            This is likely to be your first question, and we wish it was easier
            to answer! The price of each Kabisa EV (and the breakdown of costs
            that go into those prices) is here on our website.
          </p>

          <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg my-8">
            <h3 className="font-bold text-gray-900 mb-4">
              Important Note on Incentives:
            </h3>
            <p className="text-gray-700">
              Right now, the GoR offers the same generous tax breaks for both
              EVs and hybrids. But like any tax exemption, they won't last
              forever.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">
            Refuelling and recharging
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="font-bold text-gray-900 mb-3">EV Costs</h4>
              <p className="text-gray-700">
                Driving a fully electric vehicle in Rwanda will usually cost
                one-sixth of petrol vehicle costs.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="font-bold text-gray-900 mb-3">Hybrid Costs</h4>
              <p className="text-gray-700">
                A hybrid costs you less to run than a petrol vehicle but more
                than an EV because diesel and petrol cost more than electricity.
              </p>
            </div>
          </div>

          <div className="bg-green-50 p-8 rounded-xl my-12">
            <h3 className="text-xl font-bold text-green-900 mb-4">
              Ready to make your choice?
            </h3>
            <p className="text-green-800 mb-6">
              If it looks like an EV would suit your needs, contact us today to
              arrange your test drive.
            </p>
            <LocalizedLink
              href="/test-drive"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Book a Test Drive
              <ArrowRight className="ml-2 w-4 h-4" />
            </LocalizedLink>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-12">
          <LocalizedLink href="/blog/how-to-maintain-your-ev" className="group bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition">
            <ArrowLeft className="w-4 h-4 mr-2" /> How to maintain your EV
          </LocalizedLink>
          <LocalizedLink href="/blog/busting-ev-myths" className="group bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition">
            EVs in Rwanda: Busting 4 big myths <ArrowRight className="ml-2 w-4 h-4" />
          </LocalizedLink>
        </div>
      </article>
    </div>
  );
}

export default function EvsVsHybridsPost() {
  return (
    <Suspense>
      <EvsVsHybridsPostContent />
    </Suspense>
  );
}