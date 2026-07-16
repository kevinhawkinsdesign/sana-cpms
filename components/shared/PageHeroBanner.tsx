import React from "react";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeroBannerProps {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  backgroundImage?: string;
  height?: "small" | "medium" | "large";
  overlay?: "light" | "medium" | "dark";
  align?: "left" | "center";
}

const PageHeroBanner: React.FC<PageHeroBannerProps> = ({
  title,
  breadcrumbs,
  backgroundImage = "https://electrifynews.com/wp-content/uploads/2024/05/in-a-comparison-of-a-cheap-tesla-vs-chinese-electric-cars-tesla-loses-BYD_SEAL-ElectrifyNews.jpg",
  height = "medium",
  overlay = "medium",
  align = "center",
}) => {
  const heightClasses = {
    small: "h-[200px] sm:h-[250px]",
    medium: "h-[250px] sm:h-[300px] md:h-[350px]",
    large: "h-[300px] sm:h-[400px] md:h-[450px]",
  };

  const overlayClasses = {
    light: "bg-black/30",
    medium: "bg-black/50",
    dark: "bg-black/70",
  };

  const alignClasses = {
    left: "items-start text-left",
    center: "items-center text-center",
  };

  return (
    <div className="relative w-full overflow-hidden pt-16">
      <div className={`relative ${heightClasses[height]} bg-gray-900`}>
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        >
          <div className={`absolute inset-0 ${overlayClasses[overlay]}`} />
        </div>

        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 25px 25px, white 2%, transparent 0%)",
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        {/* Content */}
        <div
          className={`relative h-full flex flex-col justify-center ${alignClasses[align]} px-4 sm:px-6 lg:px-8 container mx-auto`}
        >
          {/* Title with animated background */}
          <div className="relative">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight">
              {title}
            </h1>
            <div className="absolute -bottom-2 left-0 w-24 h-1 bg-green-500 rounded-full">
              <div className="absolute top-0 left-0 w-full h-full bg-white/30 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Breadcrumb Navigation */}
          {breadcrumbs.length > 0 && (
            <div className="mt-6 flex items-center gap-2 text-sm sm:text-base text-white/90">
              {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;

                return (
                  <React.Fragment key={index}>
                    {item.href ? (
                      <a
                        href={item.href}
                        className="hover:text-green-400 transition-all duration-300 hover:scale-105"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <span className="text-green-400 font-medium">
                        {item.label}
                      </span>
                    )}

                    {!isLast && (
                      <ChevronRight className="w-4 h-4 text-white/50" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Gradient */}
        <div
          className="absolute bottom-0 left-0 w-full h-16"
          style={{
            background:
              "linear-gradient(to top, rgba(255,255,255,0.1), transparent)",
          }}
        />
      </div>
    </div>
  );
};

export default PageHeroBanner;
