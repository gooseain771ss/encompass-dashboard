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
  {
    label: 'Amazon',
    subcategories: [
      'Auto & Automotive',
      'Baby & Kids',
      'Beauty & Personal Care',
      'Books & Media',
      'Clothing & Apparel',
      'Electronics & Tech',
      'Groceries & Food',
      'Health & Supplements',
      'Home & Kitchen',
      'Office & School Supplies',
      'Pet Supplies',
      'Sports & Outdoors',
      'Tools & Hardware',
      'Toys & Games',
      'Other',
    ],
  },
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

  // Shopping — Prime must come before generic 'amazon' so it wins the match
  { keywords: ['amazon prime', 'prime membership'], category: 'Subscriptions', subcategory: '' },
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

export const AMAZON_PRODUCT_CATEGORY_MAP: Array<{
  keywords: string[]
  subcategory: string
}> = [
  // Electronics & Tech
  { keywords: ['headphone', 'earbud', 'airpod', 'speaker', 'bluetooth', 'hdmi', 'usb', 'cable', 'charger', 'adapter', 'monitor', 'keyboard', 'mouse', 'webcam', 'microphone', 'laptop', 'tablet', 'ipad', 'kindle', 'fire tv', 'echo', 'alexa', 'ring ', 'camera', 'battery', 'power bank', 'surge protector', 'router', 'hard drive', 'ssd', 'flash drive', 'memory card', 'printer', 'ink cartridge', 'smart home', 'light bulb', 'led strip', 'smart plug', 'tv mount'], subcategory: 'Electronics & Tech' },
  // Pet Supplies
  { keywords: ['dog food', 'cat food', 'pet food', 'kibble', 'purina', 'royal canin', 'blue buffalo', 'hills science', 'iams', 'pedigree', 'dog treat', 'cat treat', 'pet treat', 'dog toy', 'cat toy', 'pet toy', 'leash', 'collar', 'harness', 'dog bed', 'cat bed', 'pet bed', 'litter', 'cat litter', 'flea', 'tick', 'heartworm', 'pet shampoo', 'dog grooming', 'cat grooming', 'fish food', 'aquarium', 'bird seed', 'pet carrier', 'crate'], subcategory: 'Pet Supplies' },
  // Health & Supplements
  { keywords: ['protein powder', 'whey protein', 'creatine', 'pre-workout', 'preworkout', 'bcaa', 'amino acid', 'vitamin', 'supplement', 'fish oil', 'omega', 'probiotic', 'collagen', 'biotin', 'melatonin', 'magnesium', 'zinc', 'iron supplement', 'calcium supplement', 'multivitamin', 'testosterone', 'health supplement', 'greens powder', 'electrolyte', 'optimum nutrition', 'garden of life', 'nature made', 'now foods', 'gnc', 'phenq', 'weight loss', 'protein bar', 'quest bar', 'rx bar'], subcategory: 'Health & Supplements' },
  // Home & Kitchen
  { keywords: ['cookware', 'pan', 'pot ', 'knife', 'cutting board', 'blender', 'air fryer', 'instant pot', 'coffee maker', 'toaster', 'microwave', 'vacuum', 'mop', 'broom', 'cleaning', 'paper towel', 'trash bag', 'storage bin', 'organizer', 'shelf', 'drawer', 'candle', 'diffuser', 'pillow', 'sheet', 'blanket', 'towel', 'shower curtain', 'bath mat', 'laundry', 'detergent', 'dish soap', 'sponge', 'food storage', 'tupperware', 'mason jar', 'picture frame', 'wall art', 'curtain', 'rug', 'mattress', 'bedding', 'duvet', 'furniture'], subcategory: 'Home & Kitchen' },
  // Groceries & Food
  { keywords: ['coffee', 'tea ', 'snack', 'chips', 'nuts', 'trail mix', 'granola', 'cereal', 'pasta', 'sauce', 'olive oil', 'seasoning', 'spice', 'condiment', 'ketchup', 'hot sauce', 'honey', 'peanut butter', 'almond butter', 'jerky', 'dried fruit', 'candy', 'chocolate', 'sparkling water', 'energy drink', 'protein drink', 'meal kit', 'food delivery'], subcategory: 'Groceries & Food' },
  // Clothing & Apparel
  { keywords: ['shirt', 't-shirt', 'pants', 'shorts', 'jeans', 'jacket', 'hoodie', 'sweatshirt', 'dress', 'skirt', 'socks', 'underwear', 'bra', 'sneaker', 'shoe', 'boot', 'sandal', 'hat', 'cap', 'beanie', 'glove', 'scarf', 'belt', 'wallet', 'bag', 'backpack', 'tote', 'luggage', 'swimsuit', 'activewear', 'legging', 'athletic'], subcategory: 'Clothing & Apparel' },
  // Sports & Outdoors
  { keywords: ['dumbbell', 'weight', 'resistance band', 'yoga mat', 'foam roller', 'jump rope', 'pull-up bar', 'bench press', 'barbell', 'kettlebell', 'treadmill', 'bike ', 'bicycle', 'helmet', 'camping', 'hiking', 'tent', 'sleeping bag', 'fishing', 'golf', 'tennis', 'basketball', 'football', 'soccer', 'baseball', 'ski ', 'skiing', 'snowboard', 'workout', 'gym'], subcategory: 'Sports & Outdoors' },
  // Books & Media
  { keywords: ['book', 'novel', 'textbook', 'paperback', 'hardcover', 'audiobook', 'dvd', 'blu-ray', 'vinyl', 'record', 'magazine', 'journal'], subcategory: 'Books & Media' },
  // Beauty & Personal Care
  { keywords: ['shampoo', 'conditioner', 'body wash', 'lotion', 'moisturizer', 'sunscreen', 'face wash', 'face cream', 'serum', 'toner', 'makeup', 'foundation', 'mascara', 'lipstick', 'nail polish', 'razor', 'shaving', 'cologne', 'perfume', 'deodorant', 'toothbrush', 'toothpaste', 'floss', 'mouthwash', 'hair dryer', 'straightener', 'curling iron', 'electric shaver', 'trimmer', 'beard'], subcategory: 'Beauty & Personal Care' },
  // Baby & Kids
  { keywords: ['diaper', 'wipes', 'formula', 'baby food', 'baby bottle', 'pacifier', 'stroller', 'car seat', 'baby monitor', 'crib', 'playpen', 'baby gate', 'lego', 'barbie', 'hot wheels', 'playdoh', 'kids toy', 'board game', 'puzzle', 'stuffed animal', 'action figure'], subcategory: 'Baby & Kids' },
  // Office & School Supplies
  { keywords: ['pen', 'pencil', 'notebook', 'binder', 'folder', 'stapler', 'tape', 'scissors', 'marker', 'highlighter', 'post-it', 'sticky note', 'printer paper', 'envelopes', 'desk', 'office chair', 'monitor stand', 'paper shredder', 'calculator', 'planner', 'calendar'], subcategory: 'Office & School Supplies' },
  // Auto & Automotive
  { keywords: ['car wax', 'car wash', 'motor oil', 'windshield', 'floor mat', 'seat cover', 'car charger', 'jump starter', 'tire pressure', 'car vacuum', 'dash cam', 'car cover', 'auto part', 'oil filter', 'air filter', 'wiper blade', 'brake pad'], subcategory: 'Auto & Automotive' },
  // Tools & Hardware
  { keywords: ['drill', 'screwdriver', 'wrench', 'pliers', 'hammer', 'saw', 'level', 'measuring tape', 'tool set', 'power tool', 'extension cord', 'outlet', 'switch', 'paint', 'paintbrush', 'caulk', 'weather strip', 'lock', 'hinge', 'screw', 'nail ', 'bolt', 'anchor'], subcategory: 'Tools & Hardware' },
  // Toys & Games
  { keywords: ['toy', 'game', 'puzzle', 'lego', 'playset', 'action figure', 'doll', 'remote control', 'rc car', 'train set', 'building set', 'card game', 'video game', 'gaming', 'console', 'controller', 'playstation', 'xbox', 'nintendo', 'switch '], subcategory: 'Toys & Games' },
]

export function guessAmazonSubcategory(productTitle: string): { subcategory: string; confidence: number } {
  const lower = (productTitle || '').toLowerCase()
  for (const rule of AMAZON_PRODUCT_CATEGORY_MAP) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return { subcategory: rule.subcategory, confidence: 0.75 }
      }
    }
  }
  return { subcategory: 'Other', confidence: 0.4 }
}

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
