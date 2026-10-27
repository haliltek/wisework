// Docker healthcheck / Gatus izleme için herkese açık, veri içermeyen sağlık ucu
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ durum: "ok" });
}
