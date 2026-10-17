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
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;

        async function loadSensors() {
            setIsRefreshing(true);
            try {
                const response = await fetch(
                    `/api/sensors?scenario=${scenario}`,
                    {
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error("โหลดข้อมูลเซ็นเซอร์ไม่สำเร็จ");
                }

                const result: SensorApiResponse =
                    await response.json();

                if (!controller.signal.aborted) {
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
                if (!controller.signal.aborted) {
                    setError("อ่านข้อมูลเซ็นเซอร์ไม่ได้ กำลังลองเชื่อมต่อใหม่…");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsRefreshing(false);
                    timer = setTimeout(loadSensors, 5000);
                }
            }
        }

        loadSensors();


        return () => {
            controller.abort();
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
