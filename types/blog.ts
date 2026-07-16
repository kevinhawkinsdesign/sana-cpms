export interface BlogPost {
    id: string;
    title: string;
    date: string;
    author: string;
    readTime: string;
    category: string[];
    image: string;
    slug: string;
    description: string;
    nextPost?: {
      title: string;
      slug: string;
      description: string;
      image: string;
      category: string[];
    };
    previousPost?: {
      title: string;
      slug: string;
      description: string;
      image: string;
      category: string[];
    };
  }
  
  export const BLOG_ROUTES = {
    MAINTAIN_EV: '/blog/how-to-maintain-your-ev',
    EVS_VS_HYBRIDS: '/blog/evs-vs-hybrids',
    BUSTING_MYTHS: '/blog/busting-ev-myths',
  };