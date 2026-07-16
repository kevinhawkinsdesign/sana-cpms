import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface VideoPost {
  id: string;
  title: string;
  category: string;
  date: string;
  videoId: string;
}

// Mock Data - Replace with `getStaticProps` or API fetch in production
const videoData: VideoPost[] = [
  {
    id: "1",
    title: "The Future of Electric Cars",
    category: "TECH",
    date: "2 days ago",
    videoId: "Iyp_X3mwE1w",
  },
  {
    id: "2",
    title: "How Electric Cars are Changing the World",
    category: "ENVIRONMENT",
    date: "2 days ago",
    videoId: "GHGXy_sjbgQ",
  },
  {
    id: "3",
    title: "Electric Car Maintenance Tips",
    category: "AUTOMOTIVE",
    date: "2 days ago",
    videoId: "CWulQ1ZSE3c",
  },
  {
    id: "4",
    title: "Top 10 Electric Cars in 2024",
    category: "TECH",
    date: "2 days ago",
    videoId: "Iyp_X3mwE1w",
  },
];

const PopularVideo: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = videoData.length;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <section className="relative py-16 bg-gray-900">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70"></div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-white mb-12 text-center">
          Popular Electric Car Videos
        </h2>

        {/* Video Slider */}
        <div className="relative">
          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white/50 hover:text-white transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white/50 hover:text-white transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          {/* Slider */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {videoData.map((video, index) => (
                <div
                  key={video.id}
                  className={`w-full flex-shrink-0 px-4 transition-opacity duration-300 ${
                    currentSlide === index ? "opacity-100" : "opacity-50"
                  }`}
                >
                  <div className="relative group cursor-pointer">
                    {/* Embedded YouTube Video */}
                    <div className="relative aspect-video overflow-hidden">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${video.videoId}?autoplay=0&controls=1`}
                        title={video.title}
                        loading="lazy"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>

                    {/* Content */}
                    <div className="mt-4 text-center">
                      <span className="text-green-500 text-sm font-medium uppercase">
                        {video.category}
                      </span>
                      <h3 className="text-white text-lg font-semibold mt-2 group-hover:text-green-500 transition-colors">
                        {video.title}
                      </h3>
                      <p className="text-gray-400 text-sm mt-2">{video.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dots Navigation */}
          <div className="flex justify-center gap-2 mt-8">
            {videoData.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? "bg-white w-6"
                    : "bg-white/30 hover:bg-white/50"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PopularVideo;
