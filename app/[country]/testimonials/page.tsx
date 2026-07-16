import { Suspense } from 'react';
import { TestimonialsGrid } from '@/components/testimonials/TestimonialsGrid';

export const metadata = {
    title: 'Customer Stories | Kabisa',
    description: 'Real stories from real customers who made the switch to electric mobility with Kabisa.',
};

export default function TestimonialsPage() {
    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="pt-32 pb-20 md:pt-44 md:pb-28">
                <div className="container mx-auto px-4 md:px-6 lg:px-8">
                    <div className="max-w-4xl">
                        <p className="text-sm font-medium text-primary uppercase tracking-widest mb-4">
                            Customer Stories
                        </p>
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                            Real people.
                            <br />
                            <span className="text-gray-400">Real impact.</span>
                        </h1>
                        <p className="mt-8 text-xl text-gray-500 max-w-2xl leading-relaxed">
                            Discover how our customers are transforming their daily commute and businesses with sustainable electric mobility.
                        </p>
                    </div>
                </div>
            </section>

            {/* Divider */}
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
                <div className="h-px bg-gray-100" />
            </div>

            {/* Testimonials Section */}
            <section className="py-20 md:py-28">
                <div className="container mx-auto px-4 md:px-6 lg:px-8">
                    <Suspense fallback={<TestimonialsSkeleton />}>
                        <TestimonialsGrid />
                    </Suspense>
                </div>
            </section>
        </div>
    );
}

function TestimonialsSkeleton() {
    return (
        <div className="space-y-32">
            <div className="w-full aspect-[21/9] bg-gray-100 rounded-3xl animate-pulse" />
            <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-4">
                    <div className="h-8 bg-gray-100 rounded animate-pulse" />
                    <div className="h-8 w-3/4 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="aspect-[4/5] bg-gray-100 rounded-3xl animate-pulse" />
            </div>
        </div>
    );
}
