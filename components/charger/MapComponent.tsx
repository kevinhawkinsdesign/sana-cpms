// 'use client'

// import { useState, useEffect } from 'react'
// import Image from 'next/image'

// // Cloudflare Image Transformation URL helper
// const cloudflareUrl = (imagePath: string, width: number, quality: number = 80): string => 
//   `https://next.gokabisa.com/cdn-cgi/image/width=${width},quality=${quality},format=webp${imagePath}`;

// interface MapComponentProps {
//   center: { lat: number; lng: number }
//   chargers: any[]
//   selectedCharger: any | null
//   setSelectedCharger: (charger: any | null) => void
//   setCenter: (center: { lat: number; lng: number }) => void
//   useDark?: boolean
// }

// export default function MapComponent({
//   center,
//   chargers,
//   selectedCharger,
//   setSelectedCharger,
//   setCenter,
//   useDark = true
// }: MapComponentProps) {
//   const [isLoaded, setIsLoaded] = useState(false)

//   useEffect(() => {
//     // Simulate loading the map
//     const timer = setTimeout(() => {
//       setIsLoaded(true)
//     }, 1000)

//     return () => clearTimeout(timer)
//   }, [])

//   if (!isLoaded) {
//     return (
//       <div className="w-full h-[calc(100vh-80px)] bg-gray-100 flex items-center justify-center">
//         <div className="text-gray-500 animate-pulse">Loading map...</div>
//       </div>
//     )
//   }

//   return (
//     <div className="relative w-full h-[calc(100vh-80px)] bg-gray-100">
//       {/* Placeholder for the map */}
//       <div className="absolute inset-0 flex items-center justify-center">
//         <p className="text-lg text-gray-500">
//           Rwanda Charging Network - {chargers.length} Locations
//         </p>
//       </div>

//       {/* Display markers in a grid layout for demonstration */}
//       <div className="absolute inset-0 p-8">
//         <div className="grid grid-cols-4 gap-4 h-full">
//           {chargers.slice(0, 16).map((charger) => (
//             <div 
//               key={charger["Kabisa ID"]}
//               className={`
//                 flex items-center justify-center rounded-lg cursor-pointer
//                 ${selectedCharger?.["Kabisa ID"] === charger["Kabisa ID"] 
//                   ? "bg-blue-100 shadow-md" 
//                   : "bg-white hover:bg-gray-50"}
//                 transition-colors
//               `}
//               onClick={() => {
//                 setSelectedCharger(charger)
//                 setCenter({ lat: charger.Latitude, lng: charger.Longitude })
//               }}
//             >
//               <div className="text-center p-2">
//                 <div className="flex justify-center mb-2">
//                   <div className="relative w-8 h-8">
//                     <Image 
//                       src={cloudflareUrl('/images/charger/2.png', 32)}
//                       alt="Charger" 
//                       fill
//                       className="object-contain"
//                       unoptimized={true}
//                     />
//                   </div>
//                 </div>
//                 <p className="text-xs font-medium truncate max-w-[90px]">
//                   {charger.Name || "Charging Station"}
//                 </p>
//                 <div 
//                   className={`w-2 h-2 rounded-full mx-auto mt-1 ${
//                     charger["Charging Status"]?.toLowerCase() === "available" 
//                       ? "bg-green-500" 
//                       : charger["Charging Status"]?.toLowerCase() === "in use"
//                       ? "bg-yellow-500"
//                       : "bg-red-500"
//                   }`}
//                 />
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   )
// }