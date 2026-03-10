// Personal Finance Category System

export interface CategoryDef {
  label: string
  subcategories: string[]
  isIncome?: boolean
}

export const INCOME_CATEGORIES: CategoryDef[] = [
  { label: 'Vertical Alliance Income', subcategories: [], isIncome: true },
  { label: 'Encompass Aviation Income', subcategories: [], isIncome: true },
  { label: 'Home Storage Rentals', subcategories: [], isIncome: true },
  { label: 'Interest', subcategories: [], isIncome: true },
  { label: 'Miscellaneous', subcategories: [], isIncome: true },
]

export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { label: 'Auto', subcategories: ['Fuel', 'Maintenance/Upkeep', 'State Fees'] },
  { label: 'Cash/ATM', subcategories: [] },
  { label: 'Charity', subcategories: [] },
  { label: 'Dining & Drinks', subcategories: [] },
  { label: 'Entertainment', subcategories: ['Aviation', 'Skiing', 'Other'] },
  { label: 'Bank & CC Fees', subcategories: [] },
  { label: 'Insurance', subcategories: ['Life', 'Home & Auto'] },
  { label: 'Groceries', subcategories: ['Aldi', 'Kroger', 'Misc. Store'] },
  { label: 'Supplements/Vitamins', subcategories: [] },
  { label: 'Gifts', subcategories: [] },
  { label: 'Medical', subcategories: ['Dentist', 'Eye Doctor', 'Primary Care', 'Surgery', 'Pharmacy', 'Testosterone/Hormone', 'Over The Counter'] },
  { label: 'Home', subcategories: ['Furnishings', 'Interior Improvement/Maintenance', 'Exterior Improvement/Maintenance', 'HOA Dues', 'Security'] },
  { label: 'Subscriptions', subcategories: ['Streaming Services'] },
  { label: 'Shopping', subcategories: ['Nutrition', 'Warranty', 'Clothes', 'Electronics', 'Miscellaneous'] },
  { label: 'Mortgage', subcategories: ['Interest', 'Principal', 'Escrow'] },
  { label: 'Personal Care', subcategories: ['Spa/Massage', 'Nails', 'Hair'] },
  { label: 'Pets', subcategories: ['Food', 'Grooming', 'Vet', 'Dog Sitter'] },
  { label: 'Taxes', subcategories: ['State', 'Federal', 'Local', 'Other'] },
  { label: 'Travel', subcategories: ['Airfare', 'Lodging', 'Ground Transport', 'Food/Drinks', 'Entertainment'] },
  { label: 'Utilities', subcategories: ['Internet', 'Gas', 'Electric', 'Water', 'Trash', 'Security', 'Phone'] },
  { label: 'Uncategorized', subcategories: [] },
]

export const ALL_CATEGORIES: CategoryDef[] = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]

export function getCategoryDef(category: string): CategoryDef | undefined {
  return ALL_CATEGORIES.find(c => c.label === category)
}

// Merchant keyword → category mapping for auto-categorization
export const MERCHANT_CATEGORY_MAP: Array<{ keywords: string[]; category: string; subcategory?: string }> = [
  // Groceries
  { keywords: ['aldi', 'aldis'], category: 'Groceries', subcategory: 'Aldi' },
  { keywords: ['kroger', 'krogers'], category: 'Groceries', subcategory: 'Kroger' },
  { keywords: ['walmart', 'sam\'s club', 'sams club', 'target', 'costco', 'meijer', 'publix', 'safeway', 'whole foods', 'trader joe'], category: 'Groceries', subcategory: 'Misc. Store' },

  // Dining
  { keywords: ['mcdonald', 'burger king', 'wendy', 'taco bell', 'chick-fil', 'chickfila', 'subway', 'domino', 'pizza hut', 'papa john', 'chipotle', 'panera', 'starbucks', 'dunkin', 'denny', 'ihop', 'olive garden', 'applebee', 'chili\'s', 'red lobster', 'cracker barrel', 'doordash', 'grubhub', 'ubereats', 'instacart'], category: 'Dining & Drinks' },

  // Auto Fuel
  { keywords: ['shell', 'bp ', 'exxon', 'mobil', 'chevron', 'valvoline', 'sunoco', 'marathon', 'circle k', 'quicktrip', 'qt ', 'speedway', 'pilot flying', 'loves travel', 'kwik trip', 'casey\'s'], category: 'Auto', subcategory: 'Fuel' },

  // Auto Maintenance
  { keywords: ['jiffy lube', 'firestone', 'pep boys', 'autozone', 'o\'reilly', 'advance auto', 'napa auto', 'goodyear', 'discount tire', 'mr tire', 'midas', 'brake masters'], category: 'Auto', subcategory: 'Maintenance/Upkeep' },

  // Utilities
  { keywords: ['at&t', 'verizon', 't-mobile', 'sprint', 'xfinity', 'comcast', 'spectrum', 'cox comm', 'dish network', 'directv', 'hulu', 'netflix', 'amazon prime', 'disney+', 'spotify', 'apple music'], category: 'Utilities' },
  { keywords: ['netflix'], category: 'Subscriptions', subcategory: 'Streaming Services' },
  { keywords: ['hulu', 'disney+', 'apple tv', 'peacock', 'paramount+', 'hbo max', 'max '], category: 'Subscriptions', subcategory: 'Streaming Services' },
  { keywords: ['spotify', 'apple music', 'youtube premium'], category: 'Subscriptions' },

  // Medical
  { keywords: ['cvs', 'walgreen', 'rite aid', 'walmart pharmacy', 'costco pharmacy'], category: 'Medical', subcategory: 'Pharmacy' },
  { keywords: ['hospital', 'medical center', 'urgent care', 'clinic', 'health system'], category: 'Medical', subcategory: 'Primary Care' },
  { keywords: ['dental', 'dentist', 'orthodon'], category: 'Medical', subcategory: 'Dentist' },
  { keywords: ['vision', 'lenscrafters', 'pearle vision', 'america\'s best', 'eye care'], category: 'Medical', subcategory: 'Eye Doctor' },

  // Shopping
  { keywords: ['amazon', 'ebay', 'etsy', 'wayfair', 'chewy'], category: 'Shopping', subcategory: 'Miscellaneous' },
  { keywords: ['best buy', 'apple store', 'microsoft', 'newegg', 'b&h photo'], category: 'Shopping', subcategory: 'Electronics' },
  { keywords: ['gap', 'old navy', 'h&m', 'zara', 'express', 'banana republic', 'nordstrom', 'tj maxx', 'marshalls', 'ross'], category: 'Shopping', subcategory: 'Clothes' },

  // Home
  { keywords: ['home depot', 'lowe\'s', 'lowes', 'menards', 'ace hardware', 'true value'], category: 'Home', subcategory: 'Interior Improvement/Maintenance' },
  { keywords: ['ikea', 'ashley furniture', 'wayfair furniture', 'rooms to go', 'pottery barn', 'west elm', 'crate & barrel'], category: 'Home', subcategory: 'Furnishings' },

  // Pet
  { keywords: ['petco', 'petsmart', 'pet supplies', 'chewy'], category: 'Pets', subcategory: 'Food' },
  { keywords: ['veterinar', 'animal hospital', 'animal clinic', 'vca '], category: 'Pets', subcategory: 'Vet' },

  // Entertainment
  { keywords: ['cinemark', 'amc theater', 'regal cinema', 'movie theater', 'fandango'], category: 'Entertainment', subcategory: 'Other' },
  { keywords: ['ski', 'vail', 'breckenridge', 'keystone', 'steamboat', 'park city', 'aspen'], category: 'Entertainment', subcategory: 'Skiing' },

  // Travel
  { keywords: ['delta', 'united', 'american airlines', 'southwest', 'spirit airlines', 'frontier', 'jetblue', 'allegiant'], category: 'Travel', subcategory: 'Airfare' },
  { keywords: ['marriott', 'hilton', 'hyatt', 'ihg', 'holiday inn', 'hampton inn', 'airbnb', 'vrbo', 'expedia hotels', 'booking.com'], category: 'Travel', subcategory: 'Lodging' },
  { keywords: ['uber', 'lyft', 'hertz', 'enterprise', 'avis', 'budget rental', 'national car'], category: 'Travel', subcategory: 'Ground Transport' },

  // Personal Care
  { keywords: ['salon', 'hair', 'spa ', 'massage', 'great clips', 'sport clips', 'fantastic sams', 'supercuts'], category: 'Personal Care' },
  { keywords: ['nail', 'manicure', 'pedicure'], category: 'Personal Care', subcategory: 'Nails' },

  // Insurance
  { keywords: ['state farm', 'allstate', 'geico', 'progressive', 'usaa', 'nationwide', 'liberty mutual', 'farmers'], category: 'Insurance', subcategory: 'Home & Auto' },

  // Charity
  { keywords: ['goodwill', 'salvation army', 'red cross', 'united way', 'church offering', 'tithe'], category: 'Charity' },

  // Cash
  { keywords: ['atm', 'cash withdrawal', 'cash advance'], category: 'Cash/ATM' },
]

export function guessCategoryFromMerchant(merchantOrDesc: string): { category: string; subcategory?: string; confidence: number } {
  const lower = (merchantOrDesc || '').toLowerCase()
  for (const rule of MERCHANT_CATEGORY_MAP) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return { category: rule.category, subcategory: rule.subcategory, confidence: 0.75 }
      }
    }
  }
  return { category: 'Uncategorized', confidence: 0.1 }
}
