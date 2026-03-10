/**
 * Aviation Calculator
 * Handles great-circle distance, flight time, and pricing calculations
 */

export interface AirportCoords {
  icao: string
  lat: number
  lon: number
}

export interface FlightCalculation {
  distanceNm: number
  flightTimeHrs: number
  baseRate: number
  fuelSurcharge: number
  pilotCost: number
  subtotal: number
  totalWithFees: number
}

/**
 * Calculate great-circle distance between two points using Haversine formula
 * Returns distance in nautical miles
 */
export function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065 // Earth radius in nautical miles
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Calculate flight time in hours from distance and cruise speed
 * Adds 0.3 hrs (18 min) for taxi, departure, approach, and landing
 */
export function calculateFlightTime(distanceNm: number, cruiseSpeedKtas: number): number {
  const enrouteHrs = distanceNm / cruiseSpeedKtas
  const overheadHrs = 0.3 // departure + arrival overhead
  return Math.round((enrouteHrs + overheadHrs) * 10) / 10
}

/**
 * Calculate base trip cost (hourly rate × flight time)
 */
export function calculateBaseRate(flightTimeHrs: number, hourlyRate: number): number {
  return Math.round(flightTimeHrs * hourlyRate * 100) / 100
}

/**
 * Calculate fuel surcharge (typically a percentage of base fuel cost above wet rate)
 * For simplicity, accepts an override; default 0 since wet rate includes fuel
 */
export function calculateFuelSurcharge(
  flightTimeHrs: number,
  fuelBurnGph: number,
  fuelPricePerGallon: number,
  fuelIncludedInRate: number
): number {
  const totalFuelCost = flightTimeHrs * fuelBurnGph * fuelPricePerGallon
  const includedFuelValue = flightTimeHrs * fuelIncludedInRate
  return Math.max(0, Math.round((totalFuelCost - includedFuelValue) * 100) / 100)
}

/**
 * Get typical fuel burn rate by aircraft type (gallons/hour)
 */
export function getFuelBurnGph(aircraftType: string): number {
  const rates: Record<string, number> = {
    phenom_100: 80, // ~80 GPH for Phenom 100EV
    pc12: 65,       // ~65 GPH for PC-12/47E
  }
  return rates[aircraftType] || 80
}

/**
 * Calculate empty leg discount
 */
export function calculateEmptyLegDiscount(basePrice: number, discountPct: number = 50): number {
  return Math.round(basePrice * (discountPct / 100) * 100) / 100
}

/**
 * Full trip price calculation
 */
export function calculateTripPrice(params: {
  distanceNm: number
  cruiseSpeedKtas: number
  hourlyRate: number
  airportFees: number
  fuelSurcharge: number
  pilotDailyRate: number
  pilotDays: number
  cateringCost: number
  groundTransport: number
  otherFees: number
  isEmptyLeg: boolean
  emptyLegDiscountPct: number
  isRoundTrip: boolean
}): {
  flightTimeHrs: number
  baseRate: number
  pilotCost: number
  discountAmount: number
  total: number
} {
  const multiplier = params.isRoundTrip ? 2 : 1
  const flightTimeHrs = calculateFlightTime(params.distanceNm, params.cruiseSpeedKtas) * multiplier
  const baseRate = calculateBaseRate(flightTimeHrs, params.hourlyRate)
  const pilotCost = params.pilotDailyRate * params.pilotDays

  const subtotal =
    baseRate +
    params.fuelSurcharge +
    params.airportFees +
    pilotCost +
    params.cateringCost +
    params.groundTransport +
    params.otherFees

  const discountAmount = params.isEmptyLeg
    ? calculateEmptyLegDiscount(subtotal, params.emptyLegDiscountPct)
    : 0

  return {
    flightTimeHrs,
    baseRate,
    pilotCost,
    discountAmount,
    total: Math.round((subtotal - discountAmount) * 100) / 100,
  }
}

/**
 * Format flight time as hours and minutes string
 */
export function formatFlightTime(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Common US airport coordinates for quick lookup
 * This is a subset; the full list lives in the database
 */
export const AIRPORT_COORDS: Record<string, { lat: number; lon: number }> = {
  KCCO: { lat: 33.3154, lon: -84.7697 },
  KCGI: { lat: 37.2253, lon: -89.5708 },
  KATL: { lat: 33.6407, lon: -84.4277 },
  KORD: { lat: 41.9742, lon: -87.9073 },
  KDFW: { lat: 32.8998, lon: -97.0403 },
  KLAX: { lat: 33.9425, lon: -118.4081 },
  KJFK: { lat: 40.6413, lon: -73.7781 },
  KMIA: { lat: 25.7959, lon: -80.2870 },
  KBNA: { lat: 36.1245, lon: -86.6782 },
  KMEM: { lat: 35.0424, lon: -89.9767 },
  KSTL: { lat: 38.7487, lon: -90.3700 },
  KTEB: { lat: 40.8499, lon: -74.0608 },
  KDEN: { lat: 39.8561, lon: -104.6737 },
  KPHX: { lat: 33.4373, lon: -112.0078 },
  KSEA: { lat: 47.4502, lon: -122.3088 },
  KSFO: { lat: 37.6213, lon: -122.3790 },
  KBOS: { lat: 42.3656, lon: -71.0096 },
  KIAD: { lat: 38.9531, lon: -77.4565 },
  KPHL: { lat: 39.8729, lon: -75.2437 },
  KFLL: { lat: 26.0726, lon: -80.1527 },
  KMCO: { lat: 28.4294, lon: -81.3089 },
}
