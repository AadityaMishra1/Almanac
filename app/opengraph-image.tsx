import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Almanac — Syllabus to Calendar";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #fef7ee 0%, #fad6a5 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <div
            style={{
              fontSize: "80px",
              fontWeight: 700,
              color: "#df6008",
              letterSpacing: "-0.03em",
            }}
          >
            Almanac
          </div>
          <div
            style={{
              fontSize: "28px",
              color: "#6b6961",
              maxWidth: "600px",
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            Upload a syllabus. Every deadline lands on your Google Calendar in
            seconds.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
