"use client";

import React from "react";
import Image from "next/image";
import {
  Calendar,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { Suspense } from 'react';
import { LocalizedLink } from "@/components/shared/LocalizedLink";
import { withBasePath } from '@/lib/utils/assetPath';

function BustingMythsPostContent() {
  return (
    <div className="bg-gray-50 min-h-screen pt-24 pb-12 mt-10">
      <article className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 text-sm text-green-600 mb-2">
            <span className="bg-green-50 px-3 py-1 rounded-full">
              Electric Car
            </span>
            <span className="bg-green-50 px-3 py-1 rounded-full">Retail</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            EVs in Rwanda: Busting 4 big myths
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>May 2, 2024</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Sylvie Sugira</span>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        <div className="relative w-full h-[400px] mb-8">
          <Image
            src={withBasePath("/images/busting.webp")}
            alt="Busting EV Myths"
            fill
            priority
            className="rounded-xl object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            unoptimized={true}
          />
        </div>

        {/* Introduction */}
        <div className="prose prose-lg max-w-none">
          <p className="lead text-lg text-gray-700 mb-8">
            At Kabisa, we know that you know EVs are the future. So, what's
            stopping you from taking the plunge? Maybe you've heard one of these
            myths about EVs in Rwanda. We're here to set the record straight and
            help you make an informed decision about whether an EV is right for
            you or your business.
          </p>

          {/* Myth 1 */}
          <div className="bg-white rounded-xl shadow-lg p-8 my-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="text-green-600 mr-3">1</span>
              EVs are expensive
            </h2>
            <p className="text-gray-700 mb-6">
              The idea that EVs are expensive is one of the biggest myths and
              also one of the easiest to bust. But first we have to break this
              idea down into two parts, which will add up to give you the total
              cost of ownership for an EV.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Purchase Cost
                </h3>
                <p className="text-gray-700 text-sm">
                  Right now there are generous tax exemptions on imported EVs
                  (you'll pay over 48% less in VAT, import duties and
                  withholding tax).
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Running Costs
                </h3>
                <p className="text-gray-700 text-sm">
                  Take the RWF you're spending on petrol and divide it by 6, and
                  that's what you'll be paying to run your EV.
                </p>
              </div>
            </div>
          </div>

          {/* Myth 2 */}
          <div className="bg-white rounded-xl shadow-lg p-8 my-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="text-green-600 mr-3">2</span>
              EVs are hard to get serviced in Rwanda
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-1" />
                <p className="text-gray-700">
                  Because of having far fewer moving parts than an ICE vehicle,
                  your EV is less prone to faults in the first place.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-1" />
                <p className="text-gray-700">
                  Kabisa has a team of EV engineers and is building an EV Centre
                  for Excellence in Rwanda.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-green-50 p-8 rounded-xl my-12">
            <h3 className="text-xl font-bold text-green-900 mb-4">
              Ready to experience an EV?
            </h3>
            <p className="text-green-800 mb-6">
              If you're ready to see what an EV can do, why not book a test
              drive today?
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
       <div className="mt-16 border-t pt-12">
          <LocalizedLink
            href="/blog/evs-vs-hybrids"
            className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition block"
          >
            <div className="p-6">
              <div className="flex items-center text-gray-500 mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous Article
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-green-600 transition">
                EVs v Hybrids: what's the difference, and which one is right for
                you?
              </h4>
              <p className="text-gray-600 text-sm">
                Compare EVs and hybrids side-by-side in the Rwandan context.
              </p>
            </div>
          </LocalizedLink>
        </div>
      </article>
    </div>
  );
}

export default function BustingMythsPost() {
  return (
    <Suspense>
      <BustingMythsPostContent />
    </Suspense>
  );
}