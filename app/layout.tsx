```tsx
import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.sindhuindian.com"),

  title: {
    default: "Sindhu Indian Cuisine | Indian Restaurant in East Lansing, MI",
    template: "%s | Sindhu Indian Cuisine",
  },

  description:
    "Enjoy authentic Indian cuisine in East Lansing, Michigan at Sindhu Indian Cuisine. Fresh curries, biryani, vegetarian dishes, tandoori specialties, dine-in, takeout, and online ordering.",

  keywords: [
    "Indian restaurant East Lansing",
    "Indian food East Lansing",
    "Indian restaurant near MSU",
    "Indian cuisine East Lansing MI",
    "Sindhu Indian Cuisine",
    "Indian takeout East Lansing",
    "Indian restaurant Lansing",
    "biryani East Lansing",
    "vegetarian Indian food East Lansing",
    "Food near me"
     ],

  authors: [{ name: "Sindhu Indian Cuisine" }],
  creator: "Sindhu Indian Cuisine",
  publisher: "Sindhu Indian Cuisine",

  alternates: {
    canonical: "https://www.sindhuindian.com",
  },

  openGraph: {
    title: "Sindhu Indian Cuisine | East Lansing, MI",
    description:
      "Authentic Indian cuisine in East Lansing, Michigan. Dine in, order takeout, or order online from Sindhu Indian Cuisine.",
    url: "https://www.sindhuindian.com",
    siteName: "Sindhu Indian Cuisine",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/images/hero.jpg",
        width: 1200,
        height: 630,
        alt: "Sindhu Indian Cuisine in East Lansing, Michigan",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Sindhu Indian Cuisine | East Lansing, MI",
    description:
      "Authentic Indian cuisine in East Lansing, Michigan. Dine in, takeout, and online ordering.",
    images: ["/images/hero.jpg"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  category: "restaurant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
```
