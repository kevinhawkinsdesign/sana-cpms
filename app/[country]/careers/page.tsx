"use client"

import React from "react";
import {
  ArrowRight,
  BriefcaseIcon,
  BuildingIcon,
  BatteryChargingIcon,
  HomeIcon,
  ComputerIcon,
  WrenchIcon,
} from "lucide-react";
import PageHeroBanner from "@/components/shared/PageHeroBanner";

interface JobCategory {
  title: string;
  icon: React.ElementType;
  positions: { title: string; link: string }[];
}

const JOB_CATEGORIES: JobCategory[] = [

  {
    title: "Sales",
    icon: BuildingIcon,
    positions: [
      {
        title: "Sales Executive",
        link: "https://forms.gle/jRFiwBp1ELkmpXTW7",
      },

      {
        title: "Consumer Sales Representative",
        link: "https://docs.google.com/forms/d/e/1FAIpQLSeEsquvlcJNbQvGBTwTKsRipR2gdkDLV2WeMUTyb16_L_4xfw/viewform?usp=sf_link",
      },
    ],
  },
  {
    title: "Charging",
    icon: BatteryChargingIcon,
    positions: [
      {
        title: "EV Charging Station Technician",
        link: "https://docs.google.com/forms/d/e/1FAIpQLSfLKc3bDAxRAlUIU50qVKf3RF92bbosBpUiTbDZQaM5hZfn6g/viewform?usp=sf_link",
      }, 
    ],
  },
  {
    title: "Systems",
    icon: ComputerIcon,
    positions: [
      {
        title: "Data Mangement Intern",
        link: "https://docs.google.com/forms/d/e/1FAIpQLSfWQqD8RFrxbhODeln-GC4A5zVCZxy5KI4ndXhOoq9LYeLQwQ/viewform?usp=dialog",
      },
    ],
  },
  {
    title: "Maintenance",
    icon: WrenchIcon,
    positions: [
      {
        title: "Junior EV Mechanical Personnel",
        link: "https://airtable.com/appRHx1xnOly0uleM/pagohbLYyaMMIH0aZ/form",
      },
      {
        title: "EV Maintenance & Diagnostics Intern",
        link: "https://airtable.com/appRHx1xnOly0uleM/pagOMPL15tDYzeyNA/form",
      },
      {
        title: "EV Battery Systems Intern",
        link: "https://airtable.com/appRHx1xnOly0uleM/pagW3Y83OkMZtE6FX/form",
      },
      {
        title: "EV Charging & Electrical Systems Intern",
        link: "https://airtable.com/appRHx1xnOly0uleM/pagayh8ghWWSGZYYI/form",
      },
      {
        title: "EV Garage Operations Intern",
        link: "https://airtable.com/appRHx1xnOly0uleM/pagAzM20pFRpAXXC7/form",
      },
    ],
  },
  {
    title: "Head Office",
    icon: HomeIcon,
    positions: [
      {
        title: "Grant Writer",
        link: "https://docs.google.com/forms/d/e/1FAIpQLSevot5dBxTVFoEeYAfPL61yZMxXpbDAwTuyLZcyK6gxHbLEgQ/viewform?usp=sf_link",
      },
      {
        title: "Accountant",
        link: "https://docs.google.com/forms/d/e/1FAIpQLSeMocBof4QjwSG2L5h0VHgdnxVGzNL7cjZddF6L9_oZaUPdJQ/viewform?usp=sharing&ouid=107405091598123458074",
      },
    ],
  },
];

const JobCategoryCard: React.FC<{ category: JobCategory }> = ({ category }) => (
  <div className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
    <div className="flex items-center gap-4 mb-6">
      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
        <category.icon className="w-6 h-6 text-gray-700" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900">{category.title}</h2>
    </div>
    <div className="space-y-4">
      {category.positions.map((position) => (
        <a
          key={position.title}
          href={position.link}
          className="group block py-3 px-4 rounded-lg hover:bg-white transition-all duration-200"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="flex items-center justify-between">
            <span className="text-gray-700 font-medium hover:text-black underline-offset-4 hover:underline">
              {position.title}
            </span>
            <ArrowRight className="w-4 h-4 text-gray-700 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-black transition-all duration-200" />
          </div>
        </a>
      ))}
    </div>
  </div>
);

const CareersPage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <PageHeroBanner
        title="Careers"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Join the movement" },
        ]}
        backgroundImage="/images/career.png"
        height="medium"
        overlay="medium"
        align="center"
      />

      {/* Info Banner */}
      <div className="container mx-auto px-4 lg:px-8 mt-16 mb-8">
        <div className="flex items-start gap-4">
          <div className="rounded-full p-2">
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">How to Apply</h3>
            <p className="mt-1 text-gray-600">
              Click on any position below to be redirected to the application
              form. Make sure to fill out all required information for your
              application to be considered.
            </p>
          </div>
        </div>
      </div>

      {/* Job Categories Section */}
      <div className="py-20 bg-white" id="openings">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {JOB_CATEGORIES.map((category) => (
              <JobCategoryCard key={category.title} category={category} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareersPage;
