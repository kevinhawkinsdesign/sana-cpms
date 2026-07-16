"use client";

import React from "react";
import Image from "next/legacy/image";
import { Calendar, User, ArrowRight } from "lucide-react";
import { LocalizedLink } from "@/components/shared/LocalizedLink";

// Cloudflare Image Transformation URL helper
const cloudflareUrl = (imagePath: string, width: number, quality: number = 80): string => 
  `https://next.gokabisa.com/cdn-cgi/image/width=${width},quality=${quality},format=webp${imagePath}`;

const MaintainEVPost = () => {
  return (
    <div className="bg-gray-50 min-h-screen pt-24 pb-12 mt-10">
      <article className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 text-sm text-green-600 mb-2">
            <span className="bg-green-50 px-3 py-1 rounded-full">Charger</span>
            <span className="bg-green-50 px-3 py-1 rounded-full">
              Electric Car
            </span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            How to maintain your EV
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

        {/* Featured Image with Cloudflare */}
        <div className="mb-8 relative w-full h-[400px] rounded-xl overflow-hidden">
          <Image
            src={cloudflareUrl('/images/maintain.webp', 1200)}
            alt="EV Maintenance"
            layout="fill"
            objectFit="cover"
            unoptimized={true}
          />
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <p className="lead text-lg text-gray-700">
            You might already know that EVs typically require less maintenance,
            and cost less to maintain, than a hybrid or petrol vehicle. But you
            probably still have questions about EV maintenance and the
            availability of EV-specific servicing and parts here in Rwanda.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
            Battery health
          </h2>
          <div className="bg-blue-50 p-6 rounded-lg my-8">
            <h3 className="font-bold text-blue-900 mb-4">Battery Care Tips:</h3>
            <ul className="list-disc pl-5 space-y-2 text-blue-800">
              <li>Stick to 20% - 80% charge</li>
              <li>Only charge up completely for long trips</li>
              <li>Slow charge when you can</li>
              <li>Run your EV regularly</li>
            </ul>
          </div>

          {/* CTA Section */}
          <div className="bg-green-50 p-8 rounded-xl my-12">
            <h3 className="text-xl font-bold text-green-900 mb-4">
              Ready to join the EV revolution?
            </h3>
            <p className="text-green-800 mb-6">
              Contact us to organize your Kabisa test drive today and experience
              the future of mobility.
            </p>
            <LocalizedLink href="/contact">
              <button
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Contact Us
                <ArrowRight className="ml-2 w-4 h-4" />
              </button>
            </LocalizedLink>
          </div>
        </div>

        {/* Next Article */}
        <div className="mt-16 border-t pt-12">
          <LocalizedLink href="/blog/evs-vs-hybrids">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition cursor-pointer">
              <div className="p-6">
                <p className="text-sm text-green-600">Next Article</p>
                <h3 className="text-xl font-bold mt-2 mb-3">
                  EVs v Hybrids: what's the difference, and which one is right
                  for you?
                </h3>
                <div className="flex items-center text-gray-600">
                  Read Next <ArrowRight className="ml-2 w-4 h-4" />
                </div>
              </div>
            </div>
          </LocalizedLink>
        </div>
      </article>
    </div>
  );
};

export default MaintainEVPost;