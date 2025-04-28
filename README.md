Option AMM
==========

A simple and extensible **Options Automated Market Maker (OptionAMM)** built on Flare.This project simulates a decentralized options trading platform where users can buy call or put options using a stablecoin (USDC) and settle based on an oracle-driven price feed.

🚀 Deployed Contracts (for testing)
-----------------------------------

ContractAddress**USDC(Mock):** 0x828A4f80312F62D4BbAbCD9438Dc3B6fD1d69A34**OptionAMM:** 0x170D1256a2CB057dAcDEEBBCcB6DDd0b19f660Fe

🧠 Project Overview
-------------------

*   **USDC**: A mock ERC20 token used for payment (premium) and settlement.
    
*   **OptionAMM**: Core contract that allows:
    
    *   Buying call and put options.
        
    *   Pricing based on oracle data.
        
    *   Settling options when they expire.
        
    *   Handling option premiums and payouts.
        

The AMM automatically calculates option premiums based on simple heuristics (later extendable to real-world implied volatility models).

📂 File Structure
-----------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   flare-project/  ├── contracts/  │   ├──── MockUSDC.sol         # Simple ERC20 mock token (USDC)  │   ├──—— OptionAMM.sol            # Main Options AMM contract  │  ├── deploy/  │   ├── Config.s.sol     # Script to deploy Mock USDC  │   ├── Deploy.s.sol    # Script to deploy OptionAMM contract  │  ├── script/  │   └── Deploy.s.sol             # Deployment helper script  │  ├── test/  │   ├── OptionAMM.t.sol          # Unit tests for OptionAMM  │   ├── MockUSDC.t.sol           # Unit tests for MockUSDC  │  ├── foundry.toml                 # Foundry project configuration  └── README.md                    # This file   `

🔥 Core Contract: OptionAMM.sol
-------------------------------

### Key Concepts

*   **Options**: Users can buy **call** (right to buy) or **put** (right to sell) options.
    
*   **Oracle Price**: The contract depends on an external oracle (mocked for now) to get the asset price.
    
*   **Expiration**: Each option has a maturity timestamp. Settlements can only happen after expiry.
    
*   **Premium**: Users pay a premium (option price) upfront when buying an option.
    
*   **Payout**: After expiry:
    
    *   Call Option: max(0, Settlement Price - Strike Price)
        
    *   Put Option: max(0, Strike Price - Settlement Price)
        

### Contract State Variables

VariableTypePurposetokenIERC20The payment token (USDC) used for premiums and payouts.oracleaddressAddress providing the underlying asset's price.optionCounteruint256ID counter for tracking issued options.optionsmapping(uint256 => Option)Mapping of option ID to option details.

### Structs

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   struct Option {      address buyer;      bool isCall;           // true => call option, false => put option      uint256 strikePrice;      uint256 amount;        // Size of the option      uint256 premium;       // Cost paid to buy      uint256 expiry;        // Timestamp after which settlement is possible      bool settled;          // Whether the option has been settled  }   `

### Main Functions

FunctionDescriptionbuyOption(bool isCall, uint256 strikePrice, uint256 amount, uint256 expiry)Allows users to purchase call or put options. Calculates and collects the premium in USDC.settleOption(uint256 optionId)After expiry, calculates the payout and sends funds to the option holder based on market conditions.getPrice()Fetches the current price from the oracle.calculatePremium(bool isCall, uint256 strikePrice, uint256 amount, uint256 expiry)Internal function to determine premium based on simplistic rules (can be upgraded).

### Example Workflow

1.  **User buys** a call or put option via buyOption.
    
2.  **User pays** a premium in USDC at purchase.
    
3.  **After expiry**, the user calls settleOption.
    
4.  **The contract compares** strike price with oracle price and sends the appropriate payout in USDC.
    

🛠️ Development
---------------

### Install Dependencies

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   forge install   `

### Build

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   forge build   `

### Test

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   forge test   `

### Deploy Locally (Anvil)

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   forge script script/Deploy.s.sol --rpc-url $RPC_URL —private-key $PRIVATE_KEY --broadcast   `

📈 Future Extensions
--------------------

*   Liquidity providers (AMM selling options dynamically).
    
*   Advanced option types (American, Bermudan, exotic).
    

👨‍💻 Author
------------

*   [Kaushtubh Agrawal](https://github.com/kaustubh76)
    

📜 License
----------

This project is licensed under the [MIT License](https://chatgpt.com/c/LICENSE).

Would you also like me to prepare a badge layout at the top (like "build passing", "license MIT", "tests 100% coverage") to make it even more professional? 🚀I can do that too if you want!
