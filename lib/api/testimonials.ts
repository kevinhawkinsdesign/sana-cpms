import axios from 'axios';
import { BlocksContent } from '@strapi/blocks-react-renderer';
import { parseStrapiImage, parseStrapiImages, getStrapiAttributes, getStrapiId, getStrapiDocumentId, StrapiImage } from './strapi-utils';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://cms.k8s.gokabisa.com';
export type TestimonialImage = StrapiImage;

export interface Testimonial {
    id: string;
    documentId?: string;
    customerName: string;
    testimonialContent: BlocksContent;
    customerAvatar?: TestimonialImage;
    photos?: TestimonialImage[];
    rating?: number;
    service?: string;
    vehicleModel?: string;
    location?: string;
    companyName?: string;
    jobTitle?: string;
    videoUrl?: string;
    isFeatured?: boolean;
    purchaseDate?: string;
    useCase?: 'personal' | 'business' | 'fleet' | 'delivery' | 'other';
    previousVehicle?: string;
    monthlySavings?: number;
    createdAt: string;
    publishedAt: string;
}

export const getTestimonials = async (): Promise<Testimonial[]> => {
    try {
        const response = await axios.get(`${STRAPI_URL}/api/testimonials?populate=*&sort[0]=isFeatured:desc&sort[1]=createdAt:desc`);

        const data = (response.data && response.data.data) || [];

        if (!Array.isArray(data)) return [];

        return data.map((item: unknown) => {
            const attrs = getStrapiAttributes(item);

            return {
                id: getStrapiId(item),
                documentId: getStrapiDocumentId(item),
                customerName: (attrs['customerName'] as string) || 'Anonymous',
                testimonialContent: (attrs['testimonialContent'] as BlocksContent) || [],
                customerAvatar: parseStrapiImage(attrs['customerAvatar']) ?? undefined,
                photos: parseStrapiImages(attrs['photos']),
                rating: attrs['rating'] as number | undefined,
                service: (attrs['service'] as string) || (attrs['Service'] as string) || undefined,
                vehicleModel: attrs['vehicleModel'] as string | undefined,
                location: attrs['location'] as string | undefined,
                companyName: attrs['companyName'] as string | undefined,
                jobTitle: attrs['jobTitle'] as string | undefined,
                videoUrl: attrs['videoUrl'] as string | undefined,
                isFeatured: attrs['isFeatured'] as boolean | undefined,
                purchaseDate: attrs['purchaseDate'] as string | undefined,
                useCase: attrs['useCase'] as Testimonial['useCase'] | undefined,
                previousVehicle: attrs['previousVehicle'] as string | undefined,
                monthlySavings: attrs['monthlySavings'] as number | undefined,
                createdAt: (attrs['createdAt'] as string) || new Date().toISOString(),
                publishedAt: (attrs['publishedAt'] as string) || new Date().toISOString()
            };
        });
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        throw error;
    }
};
