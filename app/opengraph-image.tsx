import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#17130f",
          color: "#f4ecdf",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 28, height: 28, borderRadius: 20, background: "#f0a202" }} />
          <div style={{ fontSize: 28, letterSpacing: 4, color: "#ffd89a" }}>RIFFRIG DEALS</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 76, lineHeight: 1, letterSpacing: -2 }}>Prices we have actually checked.</div>
          <div style={{ fontSize: 32, color: "#cbbba6" }}>Guitar plugins across genres. Metal is a filter.</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
