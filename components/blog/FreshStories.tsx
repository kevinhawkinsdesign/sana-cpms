"use client";

import React, { useEffect, useState } from "react";
import Image from "next/legacy/image";

interface Post {
  id: string;
  title: string;
  category: string;
  author: string;
  date: string;
  imageUrl: string;
}

const freshStories: Post[] = [
  {
    id: "1",
    title: "The Future of Electric Cars: What's Next?",
    category: "Technology",
    author: "Alex Green",
    date: "2 days ago",
    imageUrl: "/images/future-ev.jpg",
  },
  {
    id: "2",
    title: "Electric vs. Gasoline: Which is Right for You?",
    category: "Lifestyle",
    author: "Jordan White",
    date: "5 days ago",
    imageUrl: "/images/ev-vs-gas.jpg",
  },
  {
    id: "3",
    title: "How Charging Stations are Evolving",
    category: "Infrastructure",
    author: "Morgan Lee",
    date: "1 week ago",
    imageUrl: "/images/charging-stations.jpg",
  },
  {
    id: "4",
    title: "Top 5 Electric Cars to Watch in 2024",
    category: "Reviews",
    author: "Taylor Brown",
    date: "3 days ago",
    imageUrl: "/images/top-ev-2024.jpg",
  },
  {
    id: "5",
    title: "The Economic Impact of Electric Vehicles",
    category: "Economy",
    author: "Jamie Wilson",
    date: "4 days ago",
    imageUrl: "/images/economic-impact.jpg",
  },
  {
    id: "6",
    title: "Electric Cars and the Environment",
    category: "Environment",
    author: "Sam Green",
    date: "2 days ago",
    imageUrl: "/images/ev-environment.jpg",
  },
  {
    id: "7",
    title: "Battery Technology Innovations in EVs",
    category: "Technology",
    author: "Taylor Brown",
    date: "3 days ago",
    imageUrl: "/images/battery-tech.jpg",
  },
  {
    id: "8",
    title: "A Guide to EV Maintenance",
    category: "Maintenance",
    author: "Alex Green",
    date: "5 days ago",
    imageUrl: "/images/ev-maintenance.jpg",
  },
];

const POSTS_PER_PAGE = 4;

const FreshStories: React.FC = () => {
  const [state, setState] = useState({
    currentPage: 1,
    currentPosts: freshStories.slice(0, POSTS_PER_PAGE),
  });

  const totalPages = Math.ceil(freshStories.length / POSTS_PER_PAGE);

  const handlePageChange = (pageNumber: number) => {
    const indexOfLastPost = pageNumber * POSTS_PER_PAGE;
    const indexOfFirstPost = indexOfLastPost - POSTS_PER_PAGE;
    setState({
      currentPage: pageNumber,
      currentPosts: freshStories.slice(indexOfFirstPost, indexOfLastPost),
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setState((prevState) => {
        const nextPage =
          prevState.currentPage === totalPages ? 1 : prevState.currentPage + 1;
        const indexOfLastPost = nextPage * POSTS_PER_PAGE;
        const indexOfFirstPost = indexOfLastPost - POSTS_PER_PAGE;

        return {
          currentPage: nextPage,
          currentPosts: freshStories.slice(indexOfFirstPost, indexOfLastPost),
        };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [totalPages]);

  return (
    <section className="py-4 sm:py-8 md:py-16 px-4 sm:px-8 md:px-16 lg:px-20 max-w-7xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 md:mb-12 text-center text-gray-800">
        Fresh Electric Car Stories
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
        {state.currentPosts.map((post) => (
          <article
            key={post.id}
            className="group cursor-pointer bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <div className="relative mb-3 overflow-hidden rounded-t-lg">
              <div className="aspect-w-4 aspect-h-3">
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  layout="responsive"
                  width={300}
                  height={200}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </div>
            <div className="p-4 space-y-2">
              <div className="text-xs sm:text-sm font-medium text-green-600">
                {post.category}
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 line-clamp-2 group-hover:text-gray-600 transition-colors">
                {post.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 flex flex-wrap items-center gap-1">
                <span>by {post.author}</span>
                <span className="hidden sm:inline">|</span>
                <span>{post.date}</span>
              </p>
            </div>
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-6 sm:mt-8 space-x-2">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => handlePageChange(index + 1)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                state.currentPage === index + 1
                  ? "bg-gray-800 w-4"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default FreshStories;
