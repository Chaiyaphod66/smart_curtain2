import { getSensorSource } from "@/lib/sensors/get-sensor-source";

export async function GET (request: Request) {
  const url = new URL(request.url);
  const scenario = url.searchParams.get("scenario") ?? "random";

  if (
    scenario !== "random" &&
    scenario !== "dim" &&
    scenario !== "normal" &&
    scenario !== "bright" &&
    scenario !== "offline"
  ) {
    return Response.json (
      { error: "สถานการณ์ต้องเป็น random, dim, normal, bright หรือ offline" },
      { status: 400 }
    );
  }

  try {
    const reading = await getSensorSource(scenario).read();

    return Response.json(
      {
        source: process.env.SENSOR_SOURCE ?? "mock",
        data: reading,
      },
      {
        headers: { "Cache-Control": "no-store"},
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to read sensors";
    
      return Response.json(
        { error: message },
        { status: 503 }
      );
  }
}