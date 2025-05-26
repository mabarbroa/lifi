export const config = {
  // LI.FI API Configuration
  lifiApiKey: process.env.LIFI_API_KEY || "",
  
  // Wallet Configuration
  wallets: [
    {
      name: "wallet1",
      privateKey: process.env.PRIVATE_KEY_1 || "",
    },
    {
      name: "wallet2", 
      privateKey: process.env.PRIVATE_KEY_2 || "",
    },
    {
      name: "wallet3",
      privateKey: process.env.PRIVATE_KEY_3 || "",
    }
  ],

  // Network Configuration (Removed Ethereum L1, Added Unichain)
  networks: {
    unichain: {
      chainId: 1301,
      name: "Unichain",
      symbol: "ETH",
      rpc: "https://sepolia.unichain.org",
      nativeToken: "0x0000000000000000000000000000000000000000"
    },
    polygon: {
      chainId: 137,
      name: "Polygon", 
      symbol: "MATIC",
      rpc: "https://polygon.llamarpc.com",
      nativeToken: "0x0000000000000000000000000000000000000000"
    },
    arbitrum: {
      chainId: 42161,
      name: "Arbitrum",
      symbol: "ETH",
      rpc: "https://arbitrum.llamarpc.com",
      nativeToken: "0x0000000000000000000000000000000000000000"
    },
    optimism: {
      chainId: 10,
      name: "Optimism",
      symbol: "ETH",
      rpc: "https://optimism.llamarpc.com",
      nativeToken: "0x0000000000000000000000000000000000000000"
    },
    base: {
      chainId: 8453,
      name: "Base",
      symbol: "ETH",
      rpc: "https://base.llamarpc.com",
      nativeToken: "0x0000000000000000000000000000000000000000"
    },
    ink: {
      chainId: 57073,
      name: "Ink",
      symbol: "ETH",
      rpc: "https://rpc-gel.inkonchain.com",
      nativeToken: "0x0000000000000000000000000000000000000000"
    }
  },

  // Bridge Configuration
  bridgeSettings: {
    minAmount: "0.001", // ETH
    maxAmount: "0.01",  // ETH
    delayBetweenTx: 60000, // 60 seconds
    maxRetries: 3,
    loopMode: true, // Enable continuous looping
    maxTransactions: 0, // 0 = unlimited, set number to limit
    randomizeAmount: true,
    randomizeDelay: true,
    delayRange: {
      min: 30000, // 30 seconds
      max: 120000 // 2 minutes
    }
  },

  // Loop Bridge Routes (Updated without ETH L1, focused on L2s and Unichain)
  bridgeRoutes: [
    // Unichain as main hub (Priority 1 - Highest)
    { from: "unichain", to: "arbitrum", priority: 1 },
    { from: "unichain", to: "optimism", priority: 1 },
    { from: "unichain", to: "base", priority: 1 },
    { from: "arbitrum", to: "unichain", priority: 1 },
    { from: "optimism", to: "unichain", priority: 1 },
    { from: "base", to: "unichain", priority: 1 },
    
    // L2 to L2 bridges (Priority 1 - High volume routes)
    { from: "arbitrum", to: "base", priority: 1 },
    { from: "arbitrum", to: "optimism", priority: 1 },
    { from: "optimism", to: "base", priority: 1 },
    { from: "base", to: "arbitrum", priority: 1 },
    { from: "base", to: "optimism", priority: 1 },
    { from: "optimism", to: "arbitrum", priority: 1 },
    
    // Polygon bridges (Priority 2 - Medium)
    { from: "unichain", to: "polygon", priority: 2 },
    { from: "polygon", to: "unichain", priority: 2 },
    { from: "polygon", to: "arbitrum", priority: 2 },
    { from: "polygon", to: "base", priority: 2 },
    { from: "arbitrum", to: "polygon", priority: 2 },
    { from: "base", to: "polygon", priority: 2 },
    
    // Ink chain bridges (Priority 3 - Emerging)
    { from: "unichain", to: "ink", priority: 3 },
    { from: "ink", to: "unichain", priority: 3 },
    { from: "ink", to: "base", priority: 3 },
    { from: "ink", to: "arbitrum", priority: 3 },
    { from: "base", to: "ink", priority: 3 },
    { from: "arbitrum", to: "ink", priority: 3 }
  ]
};
