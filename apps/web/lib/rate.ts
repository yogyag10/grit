/** Canadian dollars per SOL, shown next to every SOL amount. Devnet SOL has no value; this is what the same amount would be worth. Set NEXT_PUBLIC_SOL_CAD_RATE to update it (CoinGecko, Nov 8 2026: 125.68). */
export const SOL_CAD_RATE = Number(process.env.NEXT_PUBLIC_SOL_CAD_RATE) || 125.68;
