'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useLocalizedRouter } from '@/lib/hooks/useLocalizedRouter';

interface Article {
  id: number
  date: string
  title: string
  category: string
  author: string
  description: string
  image: string
  slug: string
}

export default function MostRecentArticles() {
  const router = useLocalizedRouter()

  const articles: Article[] = [
    {
      id: 1,
      date: "29 SEP",
      title: "How to maintain your EV",
      category: "Charger, Electric Car",
      author: "Sylvie Sugira",
      description:
        "You might already know that EVs typically require less maintenance, and cost less to maintain, than a hybrid or petrol vehicle. But you probably still have questions about EV maintenance and the availability of EV-specific servicing and parts here in Rwanda.",
      image: "/images/maintain.webp",
      slug: "/blog/how-to-maintain-your-ev",
    },
    {
      id: 2,
      date: "29 SEP",
      title: "EVs in Rwanda: Busting 4 big myths",
      category: "Electric Car, Retail",
      author: "Sylvie Sugira",
      description:
        "At Kabisa, we know that you know EVs are the future. So, what's stopping you from taking the plunge? Maybe you've heard one of these myths about EVs in Rwanda...",
      image: "/images/busting.webp",
      slug: "/blog/busting-ev-myths",
    },
    {
      id: 3,
      date: "29 SEP",
      title: "EVs v Hybrids: what's the difference, and which one is right for you?",
      category: "Commercial EV, Market",
      author: "Sylvie Sugira",
      description:
        "In this blog, we'll compare EVs and hybrids side-by-side, in the Rwandan context, so you can make an informed decision about which type of vehicle is right for you",
      image: "/images/difference.webp",
      slug: "/blog/evs-vs-hybrids",
    },
  ]

  const handleReadMore = (article: Article) => {
    router.push(article.slug)
  }

  return (
    <section className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header Section */}
        <div className="text-center mb-10">
          <span className="text-green-500 text-sm uppercase tracking-wider">
            News, Reviews, And Analysis
          </span>
          <h2 className="text-4xl font-bold mt-4 mb-6">Most Recent Articles</h2>
        </div>

        {/* Articles Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {articles.map((article) => (
            <div
              key={article.id}
              className="bg-white shadow-lg rounded-lg overflow-hidden group hover:shadow-xl transition-shadow duration-300"
            >
              <div
                className="cursor-pointer"
                onClick={() => handleReadMore(article)}
              >
                <div className="relative overflow-hidden">
                  <Image
                    src={article.image}
                    alt={article.title}
                    width={480}
                    height={240}
                    className="w-full h-48 object-cover transform transition-transform duration-500 ease-in-out group-hover:scale-105"
                    unoptimized={true}
                  />
                  <div className="absolute top-4 left-4 bg-gray-800 text-white text-sm font-bold px-3 py-1 rounded">
                    {article.date}
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-gray-500 text-sm mb-2">
                    {article.category} — {article.author}
                  </div>
                  <h3 className="text-xl font-semibold mb-4 line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 text-base line-clamp-3 mb-6">
                    {article.description}
                  </p>
                  <div className="text-green-600 font-bold hover:underline inline-flex items-center group-hover:translate-x-2 transition-transform duration-300">
                    Read More <span className="ml-2">&rarr;</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}