import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Almanac",
    short_name: "Almanac",
    description:
      "Upload a syllabus PDF, AI extracts deadlines and exams, sync to Google Calendar.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#df6008",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
