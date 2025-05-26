#!/usr/bin/env python3
"""
Cross-Chain Bridge Tool - Simple Version
"""

import os
import sys
import json
import requests
from web3 import Web3
from dotenv import load_dotenv

__version__ = "1.0.0"

class CrossChainBridge:
    def __init__(self):
        load_dotenv()
        self.lifi_api = "https://li.quest/v1"
        self.private_key = os.getenv('PRIVATE_KEY')
        
        if not self.private_key:
            raise ValueError("PRIVATE_KEY not found in environment")
    
    def get_chains(self):
        """Get supported chains"""
        try:
            response = requests.get(f"{self.lifi_api}/chains")
            return response.json()['chains']
        except Exception as e:
            print(f"Error getting chains: {e}")
            return []
    
    def get_quote(self, from_chain, to_chain, token, amount):
        """Get bridge quote"""
        params = {
            'fromChain': from_chain,
            'toChain': to_chain,
            'fromToken': token,
            'toToken': token,
            'fromAmount': str(int(float(amount) * 10**18))
        }
        
        try:
            response = requests.get(f"{self.lifi_api}/quote", params=params)
            return response.json()
        except Exception as e:
            print(f"Error getting quote: {e}")
            return None
    
    def run(self):
        """Simple interactive mode"""
        print("🌉 Cross-Chain Bridge Tool")
        print("=" * 30)
        
        # Get available chains
        chains = self.get_chains()
        if not chains:
            print("❌ Could not fetch chains")
            return
        
        print("\nAvailable chains:")
        for i, chain in enumerate(chains[:10], 1):  # Show first 10
            print(f"{i}. {chain['name']} ({chain['key']})")
        
        try:
            # Get user input
            from_chain = input("\nFrom chain (key): ").strip()
            to_chain = input("To chain (key): ").strip()
            token = input("Token symbol: ").strip().upper()
            amount = input("Amount: ").strip()
            
            # Get quote
            print("\n🔍 Getting quote...")
            quote = self.get_quote(from_chain, to_chain, token, amount)
            
            if quote:
                print(f"✅ Quote received!")
                print(f"Estimated gas: {quote.get('estimate', {}).get('gasCosts', 'N/A')}")
                print(f"Route found: {len(quote.get('includedSteps', []))} steps")
            else:
                print("❌ Could not get quote")
                
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
        except Exception as e:
            print(f"❌ Error: {e}")

def main():
    """Main entry point"""
    try:
        bridge = CrossChainBridge()
        bridge.run()
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
