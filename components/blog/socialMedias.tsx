import Image from "next/legacy/image";
import Link from "next/link";
import { Instagram } from "lucide-react";

interface InstagramPost {
  id: string;
  imageUrl: string;
  link: string;
  description: string;
}

// Mock Data
const instagramPosts: InstagramPost[] = [
  {
    id: "1",
    imageUrl:
      "https://daze.eu/wp-content/uploads/2023/03/auto-elettrica-cosa-ne-pensano-i-giovani-scaled-1-1536x1025.jpeg",
    link: "https://www.instagram.com/p/DCZlfl9OQNh/",
    description: "Young people and electric cars",
  },
  {
    id: "2",
    imageUrl:
      "https://english.news.cn/20230708/331e2f095b424f2e8c496f006d6adbc5/20230708331e2f095b424f2e8c496f006d6adbc5_db8922ef-4b7c-4bd2-97c1-4530ddee50b7.jpg",
    link: "https://www.instagram.com/livinginkigali/reel/DBOTFDsA9KO/",
    description: "Electric mobility advancements",
  },
  {
    id: "3",
    imageUrl:
      "https://media.licdn.com/dms/image/v2/D4D12AQHjA6CMVkGLWg/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1724312080565?e=2147483647&v=beta&t=p-KD0uFZ9kzA2VEyYgoKwvPaG-nIB4dVIJtMnACQFZw",
    link: "https://instagram.com/gokabisa/p/4",
    description: "Sustainable electric initiatives",
  },
  {
    id: "4",
    imageUrl:
      "https://www.scb.co.th/content/media/personal-banking/stories-tips/ev-car-mega-trend/bn.jpg",
    link: "https://instagram.com/gokabisa/p/5",
    description: "EV mega trends",
  },
];

const SocialFeed: React.FC = () => {
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Our Latest Instagram Posts
          </h2>
          <Link
            href="https://www.instagram.com/gokabisa/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            @gokabisa
          </Link>
        </div>

        {/* Instagram Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {instagramPosts.map((post) => (
            <a
              key={post.id}
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="relative group block aspect-square overflow-hidden rounded-lg"
            >
              <Image
                src={post.imageUrl}
                alt={post.description}
                layout="fill"
                objectFit="cover"
                className="transition-transform duration-500 group-hover:scale-110"
              />

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                <Instagram className="text-white opacity-0 group-hover:opacity-100 transform scale-0 group-hover:scale-100 transition-all duration-300" />
              </div>
            </a>
          ))}
        </div>

        {/* Follow Button */}
        <div className="text-center mt-12">
          <Link
            href="https://instagram.com/gokabisa/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-2 border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white transition-colors duration-300 font-medium rounded-lg"
          >
            FOLLOW US
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SocialFeed;
