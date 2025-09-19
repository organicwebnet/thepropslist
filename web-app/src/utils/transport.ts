export type TransportSymbolKey =
  | 'fragile'
  | 'handleWithCare'
  | 'thisWayUp'
  | 'keepDry'
  | 'doNotTilt'
  | 'doNotStack'
  | 'stackLimit'
  | 'heavy'
  | 'twoPersonLift'
  | 'contentsWeight'
  | 'batteryHazard';

export interface TransportSymbolDescriptor {
  key: TransportSymbolKey;
  label: string;
  // Optional icon URL (PNG/SVG). If undefined, render text chip fallback.
  url?: string;
  // Optional numeric value for stackLimit or contentsWeight
  value?: number;
}

export interface Thresholds {
  heavyKg?: number; // default 15
  twoPersonKg?: number; // default 25
}

export function getSymbolUrl(key: TransportSymbolKey): string | undefined {
  // Prefer PNGs placed under /images/transport; EPS is not browser-friendly
  // We ship SVGs in web-app/public/images/transport/*.svg.
  const base = '/images/transport';
  const map: Partial<Record<TransportSymbolKey, string>> = {
    fragile: `${base}/Fragile-Symbol.svg`,
    handleWithCare: `${base}/Handle-With-Care-Symbol.svg`,
    thisWayUp: `${base}/This-Way-Up-Symbol.svg`,
    keepDry: `${base}/Keep-Dry-Symbol.svg`,
    doNotTilt: `${base}/Do-Not-Tilt-Symbol.svg`,
    doNotStack: `${base}/Do-Not-Stack-Symbol.svg`,
    heavy: `${base}/Heavy-Symbol.svg`,
    twoPersonLift: `${base}/Two-Person-Lift-Symbol.svg`,
    contentsWeight: `${base}/Contents-Weight-Symbol.svg`,
    batteryHazard: `${base}/Battery-Hazard-Symbol.svg`,
  };
  return map[key];
}

export function symbolLabel(key: TransportSymbolKey, value?: number): string {
  switch (key) {
    case 'fragile': return 'Fragile';
    case 'handleWithCare': return 'Handle with care';
    case 'thisWayUp': return 'This way up';
    case 'keepDry': return 'Keep dry';
    case 'doNotTilt': return 'Do not tilt';
    case 'doNotStack': return 'Do not stack';
    case 'stackLimit': return `Stack limit ${value ?? ''}`.trim();
    case 'heavy': return 'Heavy';
    case 'twoPersonLift': return '2‑person lift';
    case 'contentsWeight': return `Contents ${value ?? 0} kg`;
    case 'batteryHazard': return 'Battery hazard';
  }
}


