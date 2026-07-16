import React, { useState, useEffect } from "react";
import Image from "next/legacy/image";
import Link from "next/link";
import { Calendar, MessageCircle, ArrowUpRight } from "lucide-react";

interface Post {
  id: string;
  title: string;
  category: string;
  date: string;
  comments: number;
  imageUrl: string;
  excerpt?: string;
}

// Mock Data (Replace with getStaticProps or getServerSideProps in production)
const trendingPosts: Post[] = [
  {
    id: "1",
    title: "The Future of Electric Vehicles: A New Era of Innovation",
    category: "ELECTRIC CARS",
    date: "3 days ago",
    comments: 12,
    imageUrl:
      "https://www.topgear.com/sites/default/files/2024/02/KIA-EV9-gtline-blueglossy-dynamic-hires-008.jpeg",
    excerpt:
      "Discover how electric vehicles are reshaping the automotive industry with cutting-edge technology and sustainable solutions.",
  },
  {
    id: "2",
    title: "Top 10 Electric Cars to Watch Out for in 2024",
    category: "ELECTRIC CARS",
    date: "5 days ago",
    comments: 7,
    imageUrl:
      "https://www.topgear.com/sites/default/files/2024/02/KIA-EV9-gtline-blueglossy-dynamic-hires-008.jpeg",
    excerpt:
      "An exciting lineup of new electric cars is hitting the market in 2024, each offering unique features and capabilities.",
  },
];

const categories = ["ALL", "ELECTRIC CARS", "TECHNOLOGY", "INDUSTRY NEWS"];

const TrendingPosts: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);

  // Auto-advance slides
  useEffect(() => {
    if (!isAutoplayPaused) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % trendingPosts.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isAutoplayPaused]);

  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-6">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold text-gray-900">Trending Posts</h2>
            <div className="h-1 w-24 bg-green-500"></div>
          </div>
          <div className="flex gap-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`text-sm font-medium transition-colors duration-300
                  ${
                    activeCategory === category
                      ? "text-green-500"
                      : "text-gray-500 hover:text-green-500"
                  }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Slider */}
          <div
            className="lg:w-2/3 relative rounded-xl overflow-hidden"
            onMouseEnter={() => setIsAutoplayPaused(true)}
            onMouseLeave={() => setIsAutoplayPaused(false)}
          >
            <div className="relative h-[480px] group">
              <Image
                src={trendingPosts[currentSlide].imageUrl}
                alt={trendingPosts[currentSlide].title}
                layout="fill"
                objectFit="cover"
                className="transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent">
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <div className="space-y-4">
                    <span className="inline-block px-4 py-1 bg-green-500 text-white text-sm rounded-full">
                      {trendingPosts[currentSlide].category}
                    </span>
                    <h3 className="text-3xl font-bold text-white">
                      {trendingPosts[currentSlide].title}
                    </h3>
                    <p className="text-white/80 line-clamp-2">
                      {trendingPosts[currentSlide].excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-white/80 text-sm gap-4">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          {trendingPosts[currentSlide].date}
                        </div>
                        <div className="flex items-center">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          {trendingPosts[currentSlide].comments} comments
                        </div>
                      </div>
                      <Link href="#">
                        <button className="text-white flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          Read More <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Slider Navigation */}
            <div className="absolute bottom-6 right-8 flex gap-2">
              {trendingPosts.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 
                    ${
                      currentSlide === index
                        ? "w-8 bg-white"
                        : "w-2 bg-white/50 hover:bg-white/70"
                    }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Right Side Posts */}
          <div className="lg:w-1/3 space-y-8">
            {trendingPosts.slice(1, 5).map((post) => (
              <article key={post.id} className="group cursor-pointer">
                <h3 className="text-xl font-semibold text-gray-900 group-hover:text-green-500 transition-colors duration-300">
                  {post.title}
                </h3>
                <div className="text-gray-500 text-sm">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  {post.date}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrendingPosts;
