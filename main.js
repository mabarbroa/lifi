import dotenv from 'dotenv';
import { WalletManager } from './utils/wallet.js';
import { BridgeManager } from './utils/bridge.js';
import { config } from './config.js';

// Load environment variables
dotenv.config();

class LiFiBridgeBot {
  constructor() {
    this.walletManager = new WalletManager();
    this.bridgeManager = new BridgeManager();
    this.isRunning = false;
    this.startTime = null;
  }

  async start() {
    console.log('🚀 Starting LI.FI L2 Loop Bridge Bot...\n');
    console.log('🔗 Focus: Layer 2 Networks + Unichain Hub\n');
    
    if (!config.lifiApiKey) {
      console.error('❌ Please set LIFI_API_KEY in your .env file');
      return;
    }

    const wallets = this.walletManager.listWallets();
    if (wallets.length === 0) {
      console.error('❌ No wallets loaded. Please check your private keys in .env file');
      return;
    }

    console.log(`📊 Configuration:`);
    console.log(`   Wallets: ${wallets.length}`);
    console.log(`   Networks: ${Object.keys(config.networks).join(', ').toUpperCase()}`);
    console.log(`   Bridge Routes: ${config.bridgeRoutes.length}`);
    console.log(`   Main Hub: UNICHAIN 🦄`);
    console.log(`   Loop Mode: ${config.bridgeSettings.loopMode ? 'ON' : 'OFF'}`);
    console.log(`   Max Transactions: ${config.bridgeSettings.maxTransactions || 'Unlimited'}`);
    console.log(`   Amount Range: ${config.bridgeSettings.minAmount} - ${config.bridgeSettings.maxAmount} ETH`);
    console.log(`   Delay Range: ${config.bridgeSettings.delayRange.min / 1000}s - ${config.bridgeSettings.delayRange.max / 1000}s\n`);

    this.startTime = Date.now();
    this.isRunning = true;

    if (config.bridgeSettings.loopMode) {
      await this.runContinuousLoop();
    } else {
      await this.runSingleBridge();
    }
  }

  async runContinuousLoop() {
    console.log('🔄 Starting continuous L2 bridge loop...\n');
    
    while (this.isRunning) {
      try {
        // Check if we've reached max transactions
        if (config.bridgeSettings.maxTransactions > 0 && 
            this.bridgeManager.transactionCount >= config.bridgeSettings.maxTransactions) {
          console.log(`🎯 Reached maximum transactions limit (${config.bridgeSettings.maxTransactions})`);
          break;
        }

        await this.executeSingleBridge();
        
        // Generate random delay
        const delay = this.bridgeManager.generateRandomDelay();
        const delaySeconds = (delay / 1000).toFixed(1);
        
        console.log(`⏳ Waiting ${delaySeconds}s before next L2 bridge...`);
        
        // Show enhanced stats every 5 transactions
        if (this.bridgeManager.transactionCount % 5 === 0) {
          this.printNetworkStats();
        } else {
          console.log(`📈 Stats: ${JSON.stringify(this.bridgeManager.getStats())}`);
        }
        console.log('');
        
        await this.bridgeManager.delay(delay);

      } catch (error) {
        console.error('❌ Loop iteration failed:', error.message);
        
        // Wait before retry on error
        console.log('⏳ Waiting 30s before retry...\n');
        await this.bridgeManager.delay(30000);
      }
    }
    
    this.printFinalStats();
  }

  async runSingleBridge() {
    console.log('🎯 Executing single L2 bridge transaction...\n');
    
    try {
      await this.executeSingleBridge();
      this.printFinalStats();
    } catch (error) {
      console.error('❌ Single bridge failed:', error.message);
    }
  }

  async executeSingleBridge() {
    // Select random wallet
    const wallets = this.walletManager.listWallets();
    const randomWallet = wallets[Math.floor(Math.random() * wallets.length)];
    
    // Select bridge route
    const route = this.bridgeManager.selectBridgeRoute();
    
    console.log(`=== L2 Bridge Transaction ${this.bridgeManager.transactionCount + 1} ===`);
    console.log(`👛 Wallet: ${randomWallet} (${this.walletManager.getAddress(randomWallet)})`);
    console.log(`🌉 Route: ${route.from.toUpperCase()} → ${route.to.toUpperCase()}`);
    console.log(`⭐ Priority: ${route.priority} ${route.from === 'unichain' || route.to === 'unichain' ? '🦄' : ''}`);

    // Get wallet address
    const walletAddress = this.walletManager.getAddress(randomWallet);
    
    // Generate random amount
    const amount = this.bridgeManager.generateRandomAmount();
    const ethAmount = (parseInt(amount) / 1e18).toFixed(6);
    
    console.log(`💰 Amount: ${ethAmount} ETH`);

    // Get native token addresses for the networks
    const fromToken = config.networks[route.from].nativeToken;
    const toToken = config.networks[route.to].nativeToken;

    // Get quote
    const quote = await this.bridgeManager.getQuote(
      route.from,
      route.to,
      fromToken,
      toToken,
      amount,
      walletAddress
    );

    if (quote && quote.estimate) {
      const outputAmount = (parseInt(quote.estimate.toAmount) / 1e18).toFixed(6);
      const gasEstimate = quote.estimate.gasCosts?.[0]?.amount || 'N/A';
      const gasCostEth = gasEstimate !== 'N/A' ? (parseInt(gasEstimate) / 1e18).toFixed(6) : 'N/A';
      
      console.log(`📈 Expected output: ${outputAmount} ${quote.action.toToken.symbol}`);
      console.log(`⛽ Gas estimate: ${gasCostEth} ETH (L2 optimized)`);
      console.log(`🕐 Duration: ${quote.estimate.executionDuration || 'N/A'}s`);
      console.log(`🔧 Tools: ${quote.toolDetails?.map(t => t.name).join(', ') || 'N/A'}`);
      
      // Execute bridge
      await this.bridgeManager.executeBridge(quote, randomWallet);
    } else {
      throw new Error('Invalid quote received');
    }
  }

  printNetworkStats() {
    const networkStats = this.bridgeManager.getNetworkStats();
    console.log('\n📊 Network Usage Statistics:');
    
    Object.entries(networkStats)
      .sort((a, b) => b[1].total - a[1].total)
      .forEach(([network, stats]) => {
        const emoji = network === 'unichain' ? '🦄' : network === 'base' ? '🔵' : 
                     network === 'arbitrum' ? '🔴' : network === 'optimism' ? '🔴' :
                     network === 'polygon' ? '🟣' : network === 'ink' ? '⚫' : '🌐';
        console.log(`   ${emoji} ${stats.network}: ${stats.total} total (↗️${stats.sent} sent, ↘️${stats.received} received)`);
      });
  }

  printFinalStats() {
    const stats = this.bridgeManager.getStats();
    const runtime = this.startTime ? ((Date.now() - this.startTime) / 1000 / 60).toFixed(1) : 0;
    
    console.log('\n=== Final L2 Bridge Statistics ===');
    console.log(`⏱️  Runtime: ${runtime} minutes`);
    console.log(`📊 Total Transactions: ${stats.total}`);
    console.log(`✅ Successful: ${stats.success}`);
    console.log(`❌ Failed: ${stats.failed}`);
    console.log(`📈 Success Rate: ${stats.successRate}%`);
    console.log(`🌐 L2 Networks Used: ${Object.keys(config.networks).length}`);
    console.log(`🔄 Bridge Routes: ${config.bridgeRoutes.length}`);
    console.log(`🦄 Unichain Hub Focus: Active`);
    
    this.printNetworkStats();
  }

  stop() {
    console.log('\n🛑 Stopping L2 bridge bot...');
    this.isRunning = false;
  }

  addCustomRoute(from, to, priority = 2) {
    if (this.bridgeManager.isNetworkSupported(from) && this.bridgeManager.isNetworkSupported(to)) {
      config.bridgeRoutes.push({ from, to, priority });
      console.log(`✅ Added custom L2 route: ${from} → ${to}`);
    } else {
      console.log(`❌ Invalid networks: ${from} or ${to}`);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      stats: this.bridgeManager.getStats(),
      networkStats: this.bridgeManager.getNetworkStats(),
      runtime: this.startTime ? ((Date.now() - this.startTime) / 1000 / 60).toFixed(1) : 0,
      supportedNetworks: this.bridgeManager.getSupportedNetworks(),
      focus: 'Layer 2 + Unichain Hub'
    };
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start the bot
async function main() {
  const bot = new LiFiBridgeBot();
  
  // Example: Add custom routes focusing on Unichain
  // bot.addCustomRoute('unichain', 'polygon', 2);
  
  await bot.start();
}

main().catch(console.error);
