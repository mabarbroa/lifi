import axios from 'axios';
import { config } from '../config.js';

export class BridgeManager {
  constructor() {
    this.api = axios.create({
      baseURL: 'https://li.quest/v1',
      headers: {
        'Content-Type': 'application/json',
        'x-lifi-api-key': config.lifiApiKey
      },
      timeout: 30000
    });
    
    this.transactionCount = 0;
    this.successCount = 0;
    this.failCount = 0;
    this.lastRoutes = []; // Track last used routes to avoid repetition
    this.networkUsage = {}; // Track usage per network
    this.initializeNetworkUsage();
  }

  initializeNetworkUsage() {
    Object.keys(config.networks).forEach(network => {
      this.networkUsage[network] = { sent: 0, received: 0 };
    });
  }

  async getQuote(fromChain, toChain, fromToken, toToken, amount, fromAddress) {
    try {
      const params = {
        fromChain: config.networks[fromChain].chainId,
        toChain: config.networks[toChain].chainId,
        fromToken,
        toToken,
        fromAmount: amount,
        fromAddress,
        order: 'RECOMMENDED',
        allowSwitchChain: false // Focus on direct routes
      };

      console.log(`📋 Getting quote for ${fromChain.toUpperCase()} → ${toChain.toUpperCase()}...`);
      const response = await this.api.get('/quote', { params });
      
      if (response.data && response.data.estimate) {
        console.log(`✅ Quote received successfully`);
        return response.data;
      } else {
        throw new Error('Invalid quote response');
      }
    } catch (error) {
      console.error('❌ Quote error:', error.response?.data?.message || error.message);
      throw error;
    }
  }

  async executeBridge(quote, walletName) {
    try {
      this.transactionCount++;
      
      const fromNetwork = Object.keys(config.networks).find(
        key => config.networks[key].chainId === quote.action.fromChainId
      );
      const toNetwork = Object.keys(config.networks).find(
        key => config.networks[key].chainId === quote.action.toChainId
      );

      // Update network usage stats
      this.networkUsage[fromNetwork].sent++;
      this.networkUsage[toNetwork].received++;

      console.log(`🔄 [${this.transactionCount}] Executing L2 bridge for ${walletName}`);
      console.log(`   Route: ${fromNetwork.toUpperCase()} → ${toNetwork.toUpperCase()}`);
      console.log(`   Amount: ${(parseInt(quote.action.fromAmount) / 1e18).toFixed(6)} ${quote.action.fromToken.symbol}`);
      console.log(`   Expected: ${(parseInt(quote.estimate.toAmount) / 1e18).toFixed(6)} ${quote.action.toToken.symbol}`);
      
      // Show route efficiency for L2s
      const efficiency = this.calculateRouteEfficiency(quote);
      console.log(`   Efficiency: ${efficiency.toFixed(2)}% (L2 optimized)`);
      
      // Simulate transaction execution
      await this.delay(2000); // Simulate transaction time
      
      const success = Math.random() > 0.05; // 95% success rate for L2s (better than L1)
      
      if (success) {
        this.successCount++;
        const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
        console.log(`✅ L2 Bridge executed successfully`);
        console.log(`   TX Hash: ${mockTxHash}`);
        console.log(`   Success Rate: ${((this.successCount / this.transactionCount) * 100).toFixed(1)}%`);
        return { success: true, txHash: mockTxHash, fromNetwork, toNetwork };
      } else {
        throw new Error('Transaction failed (simulated)');
      }
    } catch (error) {
      this.failCount++;
      console.error(`❌ Bridge execution failed: ${error.message}`);
      console.log(`   Success Rate: ${((this.successCount / this.transactionCount) * 100).toFixed(1)}%`);
      throw error;
    }
  }

  calculateRouteEfficiency(quote) {
    const inputAmount = parseInt(quote.action.fromAmount);
    const outputAmount = parseInt(quote.estimate.toAmount);
    const gasCost = quote.estimate.gasCosts?.[0]?.amount ? parseInt(quote.estimate.gasCosts[0].amount) : 0;
    
    // Calculate efficiency (output - gas) / input * 100
    const netOutput = outputAmount - gasCost;
    return (netOutput / inputAmount) * 100;
  }

  selectBridgeRoute() {
    // Prioritize Unichain routes (as the new main hub)
    let availableRoutes = config.bridgeRoutes.filter(route => {
      const routeKey = `${route.from}-${route.to}`;
      return !this.lastRoutes.includes(routeKey);
    });

    // If all routes were used recently, reset the filter
    if (availableRoutes.length === 0) {
      availableRoutes = [...config.bridgeRoutes];
      this.lastRoutes = [];
    }

    // Prioritize Unichain routes
    const unichainRoutes = availableRoutes.filter(route => 
      route.from === 'unichain' || route.to === 'unichain'
    );

    // If we have Unichain routes and random chance, prefer them
    if (unichainRoutes.length > 0 && Math.random() > 0.3) {
      availableRoutes = unichainRoutes;
    }

    // Sort by priority (lower number = higher priority)
    availableRoutes.sort((a, b) => a.priority - b.priority);

    // Select from top priority routes with some randomness
    const topPriorityRoutes = availableRoutes.filter(
      route => route.priority === availableRoutes[0].priority
    );

    const selectedRoute = topPriorityRoutes[Math.floor(Math.random() * topPriorityRoutes.length)];
    
    // Track used route
    const routeKey = `${selectedRoute.from}-${selectedRoute.to}`;
    this.lastRoutes.push(routeKey);
    
    // Keep only last 6 routes to avoid (increased from 5 for more variety)
    if (this.lastRoutes.length > 6) {
      this.lastRoutes.shift();
    }

    return selectedRoute;
  }

  generateRandomAmount() {
    const min = parseFloat(config.bridgeSettings.minAmount);
    const max = parseFloat(config.bridgeSettings.maxAmount);
    
    if (config.bridgeSettings.randomizeAmount) {
      const amount = Math.random() * (max - min) + min;
      return (amount * 1e18).toString();
    } else {
      return (min * 1e18).toString();
    }
  }

  generateRandomDelay() {
    if (config.bridgeSettings.randomizeDelay) {
      const min = config.bridgeSettings.delayRange.min;
      const max = config.bridgeSettings.delayRange.max;
      return Math.floor(Math.random() * (max - min) + min);
    } else {
      return config.bridgeSettings.delayBetweenTx;
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      total: this.transactionCount,
      success: this.successCount,
      failed: this.failCount,
      successRate: this.transactionCount > 0 ? ((this.successCount / this.transactionCount) * 100).toFixed(1) : 0,
      networkUsage: this.networkUsage
    };
  }

  getNetworkStats() {
    const stats = {};
    Object.keys(this.networkUsage).forEach(network => {
      const usage = this.networkUsage[network];
      stats[network] = {
        sent: usage.sent,
        received: usage.received,
        total: usage.sent + usage.received,
        network: config.networks[network].name
      };
    });
    return stats;
  }

  isNetworkSupported(networkName) {
    return config.networks.hasOwnProperty(networkName);
  }

  getSupportedNetworks() {
    return Object.keys(config.networks);
  }
}
