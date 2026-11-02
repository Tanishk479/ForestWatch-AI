export const regions = [
  "Western Ghats",
  "Amazon Basin",
  "Borneo Highlands",
] as const;
export type Region = (typeof regions)[number];
export const sites: Record<
  Region,
  { center: [number, number]; area: string; canopy: string; change: string }
> = {
  "Western Ghats": {
    center: [11.58, 76.05],
    area: "24,580",
    canopy: "92.4",
    change: "18.6",
  },
  "Amazon Basin": {
    center: [-3.45, -62.2],
    area: "48,210",
    canopy: "88.7",
    change: "32.1",
  },
  "Borneo Highlands": {
    center: [1.15, 114.2],
    area: "18,940",
    canopy: "90.2",
    change: "12.4",
  },
};
export const alerts = [
  {
    id: "FW-2041",
    title: "Canopy loss detected",
    detail:
      "Unusual clearing in the northern buffer zone. Satellite confidence: 94%.",
    location: "Sector N-04",
    time: "14:32",
    severity: "Critical",
    offset: [0.045, 0.025],
  },
  {
    id: "FW-2040",
    title: "Elevated temperature",
    detail:
      "Temperature is 4.2°C above the seasonal baseline. Review fire risk.",
    location: "Sector E-12",
    time: "13:48",
    severity: "Warning",
    offset: [-0.025, 0.055],
  },
  {
    id: "FW-2039",
    title: "Acoustic anomaly",
    detail: "Sample acoustic classifier flagged a possible mechanical sound.",
    location: "Sector W-08",
    time: "12:15",
    severity: "Warning",
    offset: [0.015, -0.055],
  },
  {
    id: "FW-2038",
    title: "Patrol check-in complete",
    detail: "Southern corridor survey completed. No changes reported.",
    location: "Sector S-02",
    time: "11:06",
    severity: "Info",
    offset: [-0.055, -0.025],
  },
];
export const devices = [
  {
    id: "FW-S01",
    name: "Northern canopy",
    kind: "Environmental sensor",
    status: "Online",
    battery: 92,
    signal: -62,
    seen: "2 min ago",
    offset: [0.045, 0.025],
  },
  {
    id: "FW-S02",
    name: "River corridor",
    kind: "Acoustic sensor",
    status: "Online",
    battery: 78,
    signal: -68,
    seen: "1 min ago",
    offset: [-0.025, 0.055],
  },
  {
    id: "FW-C03",
    name: "Eastern trail",
    kind: "Camera trap",
    status: "Online",
    battery: 64,
    signal: -71,
    seen: "4 min ago",
    offset: [0.015, -0.055],
  },
  {
    id: "FW-S04",
    name: "Southern ridge",
    kind: "Environmental sensor",
    status: "Low battery",
    battery: 18,
    signal: -79,
    seen: "6 min ago",
    offset: [-0.055, -0.025],
  },
  {
    id: "FW-C05",
    name: "Buffer checkpoint",
    kind: "Camera trap",
    status: "Offline",
    battery: 0,
    signal: 0,
    seen: "3 hours ago",
    offset: [0.065, -0.04],
  },
  {
    id: "FW-S06",
    name: "Valley station",
    kind: "Environmental sensor",
    status: "Online",
    battery: 86,
    signal: -59,
    seen: "1 min ago",
    offset: [-0.04, 0.005],
  },
];
export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => '"' + String(cell).replaceAll('"', '""') + '"')
        .join(","),
    )
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
