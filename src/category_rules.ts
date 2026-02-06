export const CATEGORY_RULES: [RegExp, string][] = [
  // Grocery
  [/TRADER JOE/i, "Grocery"],
  [/WHOLE FOODS/i, "Grocery"],
  [/SAFEWAY/i, "Grocery"],
  [/KROGER/i, "Grocery"],
  [/ALDI/i, "Grocery"],
  [/PUBLIX/i, "Grocery"],
  [/SPROUTS/i, "Grocery"],
  [/H-E-B/i, "Grocery"],
  [/WEGMANS/i, "Grocery"],
  [/FOOD LION/i, "Grocery"],
  [/PIGGLY WIGGLY/i, "Grocery"],

  // Superstore
  [/WAL-?MART/i, "Superstore"],
  [/SUPERCENTER/i, "Superstore"],
  [/FRED-?MEYER/i, "Superstore"],
  [/TARGET/i, "Superstore"],
  [/COSTCO/i, "Superstore"],
  [/SAM'?S CLUB/i, "Superstore"],

  // Restaurant / Dining
  [/MCDONALD/i, "Dining"],
  [/COFFEE/i, "Dining"],
  [/CAFE/i, "Dining"],
  [/CHIPOTLE/i, "Dining"],
  [/CHICK-FIL-A/i, "Dining"],
  [/DUNKIN/i, "Dining"],
  [/SUBWAY/i, "Dining"],
  [/PANERA/i, "Dining"],
  [/TACO BELL/i, "Dining"],
  [/WENDY'?S/i, "Dining"],
  [/BURGER KING/i, "Dining"],
  [/DOORDASH/i, "Dining"],
  [/UBER EATS/i, "Dining"],
  [/GRUBHUB/i, "Dining"],

  // Gas / Fuel
  [/SHELL OIL/i, "Gas"],
  [/CHEVRON/i, "Gas"],
  [/EXXONMOBIL/i, "Gas"],
  [/BP #/i, "Gas"],
  [/CIRCLE K/i, "Gas"],
  [/WAWA/i, "Gas"],
  [/SPEEDWAY/i, "Gas"],
  [/7-ELEVEN/i, "Gas"],

  // Rideshare / Transit
  [/UBER(?! EATS)/i, "Transit"],
  [/LYFT/i, "Transit"],

  // Subscriptions / Streaming
  [/NETFLIX/i, "Subscription"],
  [/GYM/i, "Subscription"],
  [/SPOTIFY/i, "Subscription"],
  [/HULU/i, "Subscription"],
  [/DISNEY\+/i, "Subscription"],
  [/APPLE\.COM/i, "Subscription"],
  [/AMAZON PRIME/i, "Subscription"],
  [/HBO MAX/i, "Subscription"],
  [/YOUTUBE PREMIUM/i, "Subscription"],

  // Shopping
  [/AMAZON\.COM/i, "Shopping"],
  [/AMZN/i, "Shopping"],
  [/BEST BUY/i, "Shopping"],
  [/HOME DEPOT/i, "Shopping"],
  [/LOWE'?S/i, "Shopping"],
  [/IKEA/i, "Shopping"],

  // Utilities
  [/COMCAST/i, "Utilities"],
  [/XFINITY/i, "Utilities"],
  [/AT&?T/i, "Utilities"],
  [/VERIZON/i, "Utilities"],
  [/T-MOBILE/i, "Utilities"],
  [/ELECTRIC/i, "Utilities"],
  [/WATER BILL/i, "Utilities"],
  [/GAS BILL/i, "Utilities"],

  // Health
  [/CVS/i, "Health"],
  [/WALGREENS/i, "Health"],
  [/PHARMACY/i, "Health"],

  // Travel
  [/AIRLINE/i, "Travel"],
  [/DELTA AIR/i, "Travel"],
  [/UNITED AIR/i, "Travel"],
  [/SOUTHWEST/i, "Travel"],
  [/AIRBNB/i, "Travel"],
  [/HOTEL/i, "Travel"],
  [/MARRIOTT/i, "Travel"],
  [/HILTON/i, "Travel"],

  // Transfer / Payment
  [/VENMO/i, "Transfer"],
  [/REWARD/i, "Transfer"],
  [/PYMT/i, "Transfer"],
  [/ZELLE/i, "Transfer"],
  [/PAYPAL/i, "Transfer"],
  [/CASH APP/i, "Transfer"],

  // Entertainment
  [/TEBEX/i, "Entertainment"],
  [/MODERN WARRIORS/i, "Entertainment"],
];
