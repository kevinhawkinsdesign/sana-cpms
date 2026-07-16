"use client";

import React, { useState } from "react";
import Image from "next/legacy/image";
import {
  Calendar,
  ArrowRight,
  Heart,
  MessageSquare,
} from "lucide-react";
import { LocalizedLink } from "../shared/LocalizedLink";

interface Post {
  id: string;
  title: string;
  category: string;
  author: string;
  date: string;
  imageUrl: string;
  likes?: number;
  comments?: number;
  excerpt?: string;
}

const featuredPosts: Post[] = [
  {
    id: "1",
    title: "How to maintain your EV",
    category: "Electric Cars",
    author: "Jane Doe",
    date: "2 days ago",
    imageUrl: "/images/ev-maintenance.jpg",
    likes: 342,
    comments: 78,
    excerpt:
      "You might already know that EVs typically require less maintenance, and cost less to maintain, than a hybrid or petrol vehicle. But you probably still have questions about EV maintenance and the availability of EV-specific servicing and parts here in Rwanda.",
  },
  {
    id: "2",
    title: "EVs v Hybrids: what’s the difference, and which one is right for you?",
    category: "Industry News",
    author: "John Smith",
    date: "5 days ago",
    imageUrl: "/images/ev-vs-hybrid.jpg",
    likes: 289,
    comments: 65,
    excerpt:
      "In this blog, we’ll compare EVs and hybrids side-by-side, in the Rwandan context, so you can make an informed decision about which type of vehicle is right for you.",
  },
  {
    id: "3",
    title: "EVs in Rwanda: Busting 4 big myths",
    category: "Technology",
    author: "Alex Green",
    date: "1 week ago",
    imageUrl: "/images/ev-myths.jpg",
    likes: 410,
    comments: 90,
    excerpt:
      "You know EVs are the future. So what’s stopping you from taking the plunge?",
  },
];

const FeaturedPosts: React.FC = () => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold text-gray-900">
              Featured Electric Car Posts
            </h2>
            <div className="h-1 w-24 bg-green-500"></div>
          </div>
          <LocalizedLink href="/blog">
            <button className="flex items-center gap-2 text-gray-600 hover:text-green-500 transition-colors">
              <span>View All Posts</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </LocalizedLink>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuredPosts.map((post) => (
            <article
              key={post.id}
              className="group relative h-[500px] overflow-hidden rounded-lg"
              onMouseEnter={() => setHoveredId(post.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Background Image */}
              <div className="absolute inset-0">
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  // fill
                  className="w-full h-full object-cover transition-transform duration-700 
                    group-hover:scale-110"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t 
                  from-black via-black/50 to-transparent opacity-60 
                  group-hover:opacity-75 transition-opacity duration-500"
                ></div>
              </div>

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-8">
                {/* Category Badge */}
                <div
                  className="transform -translate-y-4 opacity-0 group-hover:opacity-100 
                  group-hover:translate-y-0 transition-all duration-500"
                >
                  <span
                    className="inline-block px-4 py-1 bg-green-500 text-white 
                    text-sm font-semibold rounded-full uppercase tracking-wider"
                  >
                    {post.category}
                  </span>
                </div>

                {/* Title and Meta */}
                <div
                  className="space-y-4 transform translate-y-8 group-hover:translate-y-0 
                  transition-transform duration-500"
                >
                  <h3 className="text-2xl font-bold text-white leading-tight">
                    {post.title}
                  </h3>

                  <p className="text-white/80 line-clamp-2">{post.excerpt}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-white/80 text-sm">
                      <Calendar className="w-4 h-4 mr-2" />
                      {post.date}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center text-white/80 text-sm">
                        <Heart className="w-4 h-4 mr-1" />
                        {post.likes}
                      </div>
                      <div className="flex items-center text-white/80 text-sm">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        {post.comments}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover Overlay */}
                <div
                  className={`absolute inset-0 border-4 border-white/0 
                  transition-all duration-300 rounded-lg
                  ${hoveredId === post.id ? "border-white/20" : ""}`}
                ></div>
              </div>

              {/* Read More Button (appears on hover) */}
              <div
                className="absolute top-8 right-8 transform translate-x-12 opacity-0 
                group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500"
              >
                <LocalizedLink href={`/blog/${post.id}`}>
                  <button
                    className="bg-white text-gray-900 px-6 py-2 rounded-full 
                  font-semibold hover:bg-green-500 hover:text-white transition-colors"
                  >
                    Read More
                  </button>
                </LocalizedLink>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedPosts;
