"use client";

import React from "react";
import Image from "next/legacy/image";
import { Calendar, Clock, User, ArrowRight, ArrowLeft } from "lucide-react";
import { BlogPost } from "@/types/blog";
import { LocalizedLink } from "../shared/LocalizedLink";

interface BlogLayoutProps {
  post: BlogPost;
  children: React.ReactNode;
}

const BlogLayout: React.FC<BlogLayoutProps> = ({ post, children }) => {
  return (
    <div className="bg-gray-50 min-h-screen pt-24 pb-12">
      <article className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 text-sm text-green-600 mb-2">
            {post.category.map((cat) => (
              <span key={cat} className="bg-green-50 px-3 py-1 rounded-full">
                {cat}
              </span>
            ))}
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{post.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{post.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{post.readTime}</span>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        <div className="mb-8 relative w-full h-[400px] rounded-xl overflow-hidden">
          <Image
            src={post.image}
            alt={post.title}
            layout="fill"
            objectFit="cover"
            className="rounded-xl"
            priority
          />
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none">{children}</div>

        {/* Navigation */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          {post.previousPost && (
            <LocalizedLink
              href={post.previousPost.slug}
              className="group bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition"
            >
              <div className="flex items-center text-gray-500 mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous Article
              </div>
              <h4 className="font-bold text-lg mb-2 group-hover:text-green-600 transition">
                {post.previousPost.title}
              </h4>
              <p className="text-gray-600 text-sm line-clamp-2">
                {post.previousPost.description}
              </p>
            </LocalizedLink>
          )}

          {post.nextPost && (
            <LocalizedLink
              href={post.nextPost.slug}
              className="group bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition"
            >
              <div className="flex items-center justify-end text-gray-500 mb-2">
                Next Article
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
              <h4 className="font-bold text-lg mb-2 group-hover:text-green-600 transition">
                {post.nextPost.title}
              </h4>
              <p className="text-gray-600 text-sm line-clamp-2">
                {post.nextPost.description}
              </p>
            </LocalizedLink>
          )}
        </div>
      </article>
    </div>
  );
};

export default BlogLayout;
