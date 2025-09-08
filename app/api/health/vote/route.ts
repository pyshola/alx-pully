
import { createServerSupabase } from "@/lib/supabase-server";
import { Redis } from "ioredis";
import { NextRequest, NextResponse } from "next/server";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Check Redis connection
    const redisHealthy = (await redis.ping()) === "PONG";

    // Check database response time
    const supabase = createServerSupabase();
    const dbStart = Date.now();
    await supabase.from("polls").select("id").limit(1);
    const dbResponseTime = Date.now() - dbStart;

    const metrics = {
      redis_connected: redisHealthy,
      database_response_time: dbResponseTime,
      active_connections: 0, // This would need to be implemented based on your connection pool
    };

    let status: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (!redisHealthy || dbResponseTime > 1000) {
      status = "unhealthy";
    } else if (dbResponseTime > 500) {
      status = "degraded";
    }

    return NextResponse.json({ status, metrics });

  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        metrics: {
          redis_connected: false,
          database_response_time: Date.now() - startTime,
          active_connections: 0,
        },
      },
      { status: 500 },
    );
  }
}
