"use client";

import { useEffect, useRef, useState } from "react";
import type { SensorReading, SensorScenario } from "@/types/sensor";
import {
    INITIAL_AUTO_PREVIEW_STATE,
    advanceAutoPreview,
} from "@/lib/curtain/auto-preview";
type SensorSourceName = "mock" | "esp32";

type SensorApiResponse = {
    source: SensorSourceName;
    data: SensorReading;
};

export default function useSensorData(
    scenario: SensorScenario = "random"
) {
    const [readings, setReadings] = useState<SensorReading | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(true);
    const [source, setSource] =
        useState<SensorSourceName | null>(null);
    const [autoPreview, setAutoPreview] = useState(
        INITIAL_AUTO_PREVIEW_STATE,
    );
    const lastPreviewSampleId = useRef<string | null>(null);

    useEffect(() => {
        let disposed = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        async function loadSensors() {
            setIsRefreshing(true);
            try {
                const requestUrl = new URL(
                    "/api/sensors",
                    window.location.origin,
                );
                requestUrl.searchParams.set("scenario", scenario);
                requestUrl.searchParams.set("_ts", Date.now().toString());

                const response = await Promise.race([
                    fetch(requestUrl, {
                        cache: "no-store",
                        headers: { Accept: "application/json" },
                    }),
                    new Promise<never>((_, reject) => {
                        window.setTimeout(
                            () => reject(new Error("Sensor request timed out")),
                            8_000,
                        );
                    }),
                ]);

                if (!response.ok) {
                    throw new Error("โหลดข้อมูลเซ็นเซอร์ไม่สำเร็จ");
                }

                const result: SensorApiResponse =
                    await response.json();

                if (!disposed) {
                    setReadings(result.data);
                    setSource(result.source);
                    setError(null);

                    if (
                        lastPreviewSampleId.current !==
                        result.data.recordedAt
                    ) {
                        lastPreviewSampleId.current =
                            result.data.recordedAt;
                        setAutoPreview((current) =>
                            advanceAutoPreview(
                                current,
                                result.data.lightLux,
                            ),
                        );
                    }
                }
            } catch {
                if (!disposed) {
                    setError("อ่านข้อมูลเซ็นเซอร์ไม่ได้ กำลังลองเชื่อมต่อใหม่…");
                }
            } finally {
                if (!disposed) {
                    setIsRefreshing(false);
                    timer = setTimeout(loadSensors, 5000);
                }
            }
        }

        loadSensors();


        return () => {
            disposed = true;
            clearTimeout(timer);
        };
    }, [refreshVersion, scenario]);
    function refresh() {
        setRefreshVersion((current) => current + 1);
    };
    return {
        readings,
        source,
        autoPreview,
        error,
        isRefreshing,
        refresh,
    };
}
