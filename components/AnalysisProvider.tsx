"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Analysis, api, Risk } from "@/lib/analysis";
type Snapshot = {
  analyses: Analysis[];
  detections: { id: string; loss_area_ha: number }[];
  areas: { id: string; name: string }[];
  risks: (Risk & { id: string })[];
};
const empty: Snapshot = { analyses: [], detections: [], areas: [], risks: [] };
const Context = createContext<{
  status: "loading" | "online" | "offline";
  error: string;
  snapshot: Snapshot;
  selected: Analysis | undefined;
  select: (id: string) => void;
  reload: (preferred?: string) => Promise<void>;
} | null>(null);
export function useAnalysis() {
  const value = useContext(Context);
  if (!value) throw new Error("AnalysisProvider missing");
  return value;
}
export default function AnalysisProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<"loading" | "online" | "offline">(
    "loading",
  );
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot>(empty);
  const [selectedId, select] = useState("");
  const generation = useRef(0);
  const reload = useCallback(async (preferred?: string) => {
    const current = ++generation.current;
    setStatus("loading");
    try {
      const [health, analyses, detections, areas, risks] = await Promise.all([
        api<{ status: string }>("/health"),
        api<Analysis[]>("/analyses"),
        api<Snapshot["detections"]>("/detections"),
        api<Snapshot["areas"]>("/monitoring-areas"),
        api<Snapshot["risks"]>("/risk-scores"),
      ]);
      if (
        health.status !== "ok" ||
        ![analyses, detections, areas, risks].every(Array.isArray)
      )
        throw new Error("Unexpected backend response");
      if (current !== generation.current) return;
      setSnapshot({ analyses, detections, areas, risks });
      select(
        (id) =>
          preferred ??
          (analyses.some((a) => a.id === id) ? id : (analyses[0]?.id ?? "")),
      );
      setStatus("online");
      setError("");
    } catch (e) {
      if (current !== generation.current) return;
      setSnapshot(empty);
      select("");
      setStatus("offline");
      setError(e instanceof Error ? e.message : "Backend unavailable");
    }
  }, []);
  useEffect(() => {
    const requestGeneration = generation;
    void reload();
    return () => {
      requestGeneration.current++;
    };
  }, [reload]);
  return (
    <Context.Provider
      value={{
        status,
        error,
        snapshot,
        selected:
          status === "online"
            ? snapshot.analyses.find((a) => a.id === selectedId)
            : undefined,
        select,
        reload,
      }}
    >
      {children}
    </Context.Provider>
  );
}
