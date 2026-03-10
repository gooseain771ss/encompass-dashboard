/**
 * Avinode Email Parser & Trip Scoring Engine
 * Parses broker request emails and scores trips by fit, availability, and profitability
 */

import { haversineNm, AIRPORT_COORDS } from './calculator'
import type { Aircraft } from '@/types/database'

export interface ParsedBrokerRequest {
  origin_icao: string | null
  destination_icao: string | null
  departure_date: string | null
  return_date: string | null
  pax_count: number | null
  requested_aircraft_type: string | null
  client_budget: number | null
  client_name: string | null
  notes_from_broker: string | null
}

export interface TripScore {
  total: number
  breakdown: {
    positioning: number     // 0-3: aircraft distance to departure
    availability: number    // 0-2: no conflicts
    aircraft_match: number  // 0-2: matches requested type
    route_viability: number // 0-2: within range
    budget_fit: number      // 0-1: budget covers our minimum
  }
  notes: string[]
}

export interface PricingRecommendation {
  suggested_bid: number
  min_acceptable_bid: number
  max_bid: number
  notes: string
}

/**
 * Parse common Avinode email formats to extract trip request fields
 */
export function parseAvinodeEmail(emailText: string): ParsedBrokerRequest {
  const text = emailText

  // Extract ICAO codes (4-letter uppercase, starting with K for CONUS)
  const icaoPattern = /\b([KA-Z][A-Z0-9]{3})\b/g
  const icaoCodes = Array.from(text.matchAll(icaoPattern)).map(m => m[1])

  // Extract origin/destination from common patterns
  let origin: string | null = null
  let destination: string | null = null

  const fromToMatch = text.match(/from\s+([A-Z]{4})\s+to\s+([A-Z]{4})/i)
  const routeMatch = text.match(/([A-Z]{4})\s*[-–→]\s*([A-Z]{4})/i)
  const depArrMatch = text.match(/(?:departure|depart(?:ing)?|origin|from)[:\s]+([A-Z]{4})/i)
  const arrMatch = text.match(/(?:arrival|arriv(?:ing)?|destination|to)[:\s]+([A-Z]{4})/i)

  if (fromToMatch) {
    origin = fromToMatch[1].toUpperCase()
    destination = fromToMatch[2].toUpperCase()
  } else if (routeMatch) {
    origin = routeMatch[1].toUpperCase()
    destination = routeMatch[2].toUpperCase()
  } else {
    if (depArrMatch) origin = depArrMatch[1].toUpperCase()
    if (arrMatch) destination = arrMatch[1].toUpperCase()
    // Fallback: use first two ICAO codes found
    if (!origin && icaoCodes.length >= 1) origin = icaoCodes[0]
    if (!destination && icaoCodes.length >= 2) destination = icaoCodes[1]
  }

  // Extract departure date
  let departure_date: string | null = null
  const datePatterns = [
    /(?:departure|depart|date)[:\s]+(\w+ \d{1,2},?\s*\d{4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /(\w+ \d{1,2},?\s*202\d)/i,
    /(20\d{2}-\d{2}-\d{2})/,
  ]
  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      try {
        const parsed = new Date(match[1])
        if (!isNaN(parsed.getTime())) {
          departure_date = parsed.toISOString().split('T')[0]
          break
        }
      } catch {}
    }
  }

  // Extract return date
  let return_date: string | null = null
  const returnMatch = text.match(/(?:return|back)[:\s]+(\w+ \d{1,2},?\s*202\d|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
  if (returnMatch) {
    try {
      const parsed = new Date(returnMatch[1])
      if (!isNaN(parsed.getTime())) {
        return_date = parsed.toISOString().split('T')[0]
      }
    } catch {}
  }

  // Extract pax count
  let pax_count: number | null = null
  const paxPatterns = [
    /(\d+)\s+(?:passenger|pax|person|people)/i,
    /(?:passenger|pax|person|people)[:\s]+(\d+)/i,
    /(\d+)\s*(?:pax)/i,
  ]
  for (const pattern of paxPatterns) {
    const match = text.match(pattern)
    if (match) {
      pax_count = parseInt(match[1])
      break
    }
  }

  // Extract aircraft type preference
  let requested_aircraft_type: string | null = null
  if (/phenom|embraer|emd/i.test(text)) requested_aircraft_type = 'Phenom 100'
  else if (/pilatus|pc.?12|turboprop/i.test(text)) requested_aircraft_type = 'PC-12'
  else if (/citation|cessna/i.test(text)) requested_aircraft_type = 'Citation'
  else if (/very light|vlj/i.test(text)) requested_aircraft_type = 'VLJ'
  else if (/light jet/i.test(text)) requested_aircraft_type = 'Light Jet'
  else if (/midsize|mid.size/i.test(text)) requested_aircraft_type = 'Midsize Jet'

  // Extract budget
  let client_budget: number | null = null
  const budgetPatterns = [
    /budget[:\s]+\$?([\d,]+)/i,
    /\$\s*([\d,]+)\s*(?:budget|max|total|all.?in)/i,
    /up\s+to\s+\$?([\d,]+)/i,
  ]
  for (const pattern of budgetPatterns) {
    const match = text.match(pattern)
    if (match) {
      client_budget = parseFloat(match[1].replace(/,/g, ''))
      break
    }
  }

  // Extract client name
  let client_name: string | null = null
  const clientPatterns = [
    /(?:client|passenger|guest|pax name)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/i,
    /(?:traveler|traveller)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/i,
  ]
  for (const pattern of clientPatterns) {
    const match = text.match(pattern)
    if (match) {
      client_name = match[1]
      break
    }
  }

  // Extract any broker notes (last paragraph-ish)
  const noteLines = text.split('\n').filter(l =>
    /note|comment|special|request|prefer/i.test(l) && l.length > 20
  )
  const notes_from_broker = noteLines.slice(0, 3).join(' ').trim() || null

  return {
    origin_icao: origin,
    destination_icao: destination,
    departure_date,
    return_date,
    pax_count,
    requested_aircraft_type,
    client_budget,
    client_name,
    notes_from_broker,
  }
}

/**
 * Score a trip request based on our fleet positioning and viability
 */
export function scoreTripRequest(
  request: ParsedBrokerRequest,
  aircraft: Aircraft[],
  existingTripDates: string[] = []
): TripScore {
  const notes: string[] = []
  const breakdown = {
    positioning: 0,
    availability: 0,
    aircraft_match: 0,
    route_viability: 0,
    budget_fit: 0,
  }

  if (!request.origin_icao) {
    notes.push('Could not determine departure airport')
    return { total: 0, breakdown, notes }
  }

  const originCoords = AIRPORT_COORDS[request.origin_icao]
  const destCoords = request.destination_icao ? AIRPORT_COORDS[request.destination_icao] : null

  // --- POSITIONING SCORE (0-3) ---
  // How close is our nearest aircraft to the departure airport?
  let bestPositioningDist = Infinity
  let bestPositionedAircraft: Aircraft | null = null

  for (const ac of aircraft) {
    if (!ac.base_icao) continue
    const baseCoords = AIRPORT_COORDS[ac.base_icao]
    if (!baseCoords || !originCoords) continue
    const dist = haversineNm(baseCoords.lat, baseCoords.lon, originCoords.lat, originCoords.lon)
    if (dist < bestPositioningDist) {
      bestPositioningDist = dist
      bestPositionedAircraft = ac
    }
  }

  if (bestPositioningDist < 50) {
    breakdown.positioning = 3
    notes.push(`✓ ${bestPositionedAircraft?.name} is positioned ${Math.round(bestPositioningDist)}nm from departure`)
  } else if (bestPositioningDist < 200) {
    breakdown.positioning = 2
    notes.push(`~ ${bestPositionedAircraft?.name} is ${Math.round(bestPositioningDist)}nm from departure (short ferry)`)
  } else if (bestPositioningDist < 500) {
    breakdown.positioning = 1
    notes.push(`! ${bestPositionedAircraft?.name} is ${Math.round(bestPositioningDist)}nm from departure (significant ferry)`)
  } else {
    breakdown.positioning = 0
    notes.push(`✗ Nearest aircraft is ${Math.round(bestPositioningDist)}nm from departure`)
  }

  // --- AVAILABILITY SCORE (0-2) ---
  if (!request.departure_date) {
    breakdown.availability = 1
    notes.push('Departure date unknown — cannot confirm availability')
  } else {
    const dateStr = request.departure_date
    const hasConflict = existingTripDates.includes(dateStr)
    if (!hasConflict) {
      breakdown.availability = 2
      notes.push(`✓ ${dateStr} appears available`)
    } else {
      breakdown.availability = 0
      notes.push(`✗ Possible conflict on ${dateStr}`)
    }
  }

  // --- AIRCRAFT MATCH SCORE (0-2) ---
  if (!request.requested_aircraft_type) {
    breakdown.aircraft_match = 1
    notes.push('No specific aircraft type requested')
  } else {
    const requested = request.requested_aircraft_type.toLowerCase()
    const canFly =
      (requested.includes('phenom') && aircraft.some(a => a.aircraft_type === 'phenom_100')) ||
      (requested.includes('pc-12') && aircraft.some(a => a.aircraft_type === 'pc12')) ||
      requested.includes('light jet') ||
      requested.includes('vlj')

    if (canFly) {
      breakdown.aircraft_match = 2
      notes.push(`✓ Have aircraft matching ${request.requested_aircraft_type}`)
    } else {
      breakdown.aircraft_match = 0
      notes.push(`✗ Requested ${request.requested_aircraft_type} — not in fleet`)
    }
  }

  // --- ROUTE VIABILITY SCORE (0-2) ---
  if (!destCoords || !originCoords) {
    breakdown.route_viability = 1
    notes.push('Cannot calculate route distance')
  } else {
    const routeDist = haversineNm(originCoords.lat, originCoords.lon, destCoords.lat, destCoords.lon)
    const maxRange = Math.max(...aircraft.map(a => a.max_range_nm || 0))

    if (routeDist <= maxRange * 0.9) {
      breakdown.route_viability = 2
      notes.push(`✓ Route is ${Math.round(routeDist)}nm — within range`)
    } else if (routeDist <= maxRange) {
      breakdown.route_viability = 1
      notes.push(`~ Route is ${Math.round(routeDist)}nm — near maximum range`)
    } else {
      breakdown.route_viability = 0
      notes.push(`✗ Route is ${Math.round(routeDist)}nm — exceeds range (${maxRange}nm max)`)
    }
  }

  // --- BUDGET FIT SCORE (0-1) ---
  if (!request.client_budget) {
    breakdown.budget_fit = 1
    notes.push('No budget stated')
  } else {
    // Estimate minimum price using cheapest aircraft
    const cheapestRate = Math.min(...aircraft.map(a => a.hourly_rate))
    const estDist = originCoords && destCoords
      ? haversineNm(originCoords.lat, originCoords.lon, destCoords.lat, destCoords.lon)
      : 500
    const estHours = estDist / 350 + 0.3
    const estMin = estHours * cheapestRate

    if (request.client_budget >= estMin * 1.1) {
      breakdown.budget_fit = 1
      notes.push(`✓ Budget $${request.client_budget.toLocaleString()} covers estimated $${Math.round(estMin).toLocaleString()}`)
    } else if (request.client_budget >= estMin * 0.85) {
      breakdown.budget_fit = 0.5
      notes.push(`~ Budget is tight — may need to negotiate`)
    } else {
      breakdown.budget_fit = 0
      notes.push(`✗ Budget $${request.client_budget.toLocaleString()} likely below our minimum ~$${Math.round(estMin).toLocaleString()}`)
    }
  }

  const total = Math.round(
    (breakdown.positioning + breakdown.availability + breakdown.aircraft_match +
      breakdown.route_viability + breakdown.budget_fit) * 10
  ) / 10

  return { total, breakdown, notes }
}

/**
 * Generate a pricing recommendation for a bid
 */
export function generatePricingRecommendation(
  request: ParsedBrokerRequest,
  aircraft: Aircraft[],
  score: TripScore,
  winRateHistory: { bid_amount: number; won: boolean }[] = []
): PricingRecommendation {
  const originCoords = request.origin_icao ? AIRPORT_COORDS[request.origin_icao] : null
  const destCoords = request.destination_icao ? AIRPORT_COORDS[request.destination_icao] : null

  // Pick best aircraft for the trip
  const bestAircraft = aircraft[0]
  const hourlyRate = bestAircraft?.hourly_rate || 2500
  const cruiseSpeed = bestAircraft?.cruise_speed_ktas || 380

  // Calculate base route cost
  let routeDist = 500
  if (originCoords && destCoords) {
    routeDist = haversineNm(originCoords.lat, originCoords.lon, destCoords.lat, destCoords.lon)
  }
  const flightHours = routeDist / cruiseSpeed + 0.3
  const baseCost = flightHours * hourlyRate

  // Ferry cost if positioning needed
  const ferryCost = score.breakdown.positioning < 2 ? baseCost * 0.3 : 0
  const minCost = baseCost + ferryCost + 500 // $500 fixed minimum for fees

  // Market analysis from win rate history
  let marketMultiplier = 1.15 // default 15% markup
  if (winRateHistory.length >= 5) {
    const won = winRateHistory.filter(h => h.won)
    const lost = winRateHistory.filter(h => !h.won)
    if (won.length > 0 && lost.length > 0) {
      const avgWin = won.reduce((s, h) => s + h.bid_amount, 0) / won.length
      const avgLost = lost.reduce((s, h) => s + h.bid_amount, 0) / lost.length
      // Bid slightly below average losing bids
      marketMultiplier = (avgWin / minCost + (avgLost * 0.95) / minCost) / 2
    }
  }

  // Adjust for fit score
  if (score.total >= 8) {
    marketMultiplier *= 1.1  // great fit — we can charge more
  } else if (score.total < 5) {
    marketMultiplier *= 0.95 // poor fit — lower margin to win
  }

  const suggestedBid = Math.round(minCost * marketMultiplier / 100) * 100
  const maxBid = request.client_budget ? Math.min(request.client_budget * 0.95, suggestedBid * 1.3) : suggestedBid * 1.3

  const notes = [
    `Base flight cost: ~$${Math.round(baseCost).toLocaleString()}`,
    ferryCost > 0 ? `Ferry allowance: ~$${Math.round(ferryCost).toLocaleString()}` : null,
    `Fit score ${score.total}/10 — ${score.total >= 7 ? 'strong position to bid' : score.total >= 5 ? 'viable trip' : 'marginal fit'}`,
    winRateHistory.length > 0 ? `Based on ${winRateHistory.length} historical bids` : 'Limited bid history',
  ].filter(Boolean).join('. ')

  return {
    suggested_bid: suggestedBid,
    min_acceptable_bid: Math.round(minCost * 1.05 / 100) * 100,
    max_bid: Math.round(maxBid / 100) * 100,
    notes,
  }
}
