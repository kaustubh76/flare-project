Option AMM
==========

Overview
--------

The Option AMM is an advanced decentralized application (dApp) built on the **Flare Network**, designed to provide a robust platform for **options trading and liquidity management** using decentralized finance (DeFi) principles. Liquidity constraint is always there in option because of too many strike price for solution of this we use linear formula to calculate other strike option contract using just 2 option strike liquidity position which gives us more batter experience, for getting price feed flare network which give live data feed decentralized way also this helpful in settlement of contract time web3auth is used for login and handling of position.

Features
--------

*   **Blockchain Interaction:**
    
    *   Supports multiple RPC providers (**Ethers.js, Viem, Web3.js**) for interacting with smart contracts on Flare Network.
        
*   **Decentralized Options Trading:**
    
    *   Allows traders to buy and sell call/put options using the **OptionAMM smart contract**.
        
    *   Enables risk management with different strike prices and liquidity pools.
        
*   **Automated Liquidity Management:**
    
    *   Users can add or remove liquidity dynamically.
        
    *   Liquidity providers earn fees from the options market.
        
*   **Advanced Pricing & Settlement:**
    
    *   Uses **FTSO** price feeds to settle trades efficiently.
        
    *   Automated smart contract settlement for fair execution.
        
*   **Admin Controls:**
    
    *   Admins can **start option contracts, configure strike prices, and settle trades**.
        
    *   Ensures governance and security in liquidity pools.
        

Project Structure
-----------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   flare-project/  ├── components/             # React components for UI  ├── pages/                  # Next.js pages  │   ├── index.tsx          # Main page with Web3Auth integration  │   ├── dashboard.tsx      # Dashboard for interacting with contracts  ├── utils/                  # Utility files for blockchain interaction  │   ├── ethersRPC.ts       # Ethers.js based RPC interactions  │   ├── viemRPC.ts         # Viem-based RPC interactions  │   ├── web3RPC.ts         # Web3.js based RPC interactions  ├── contracts/              # Smart contract files  │   ├── optipair.sol       # Solidity contract for options trading  ├── public/                 # Static assets  ├── styles/                 # TailwindCSS styles  └── README.md               # Project documentation   `

Installation
------------

### Prerequisites

Ensure you have the following installed:

*   **Node.js** (v16 or higher)
    
*   **NPM/Yarn**
    
*   **Metamask** or any Web3-enabled wallet
    

### Steps

1.  git clone cd flare-project
    
2.  npm install
    
3.  cp .env.example .env# Update .env with required keys
    
4.  npm run dev
    

Flow Diagram
------------

Below is the flow diagram illustrating the complete user interaction and contract logic for the **OptionAMM** protocol:

This diagram provides a visual representation of how users interact with the contract, detailing each step from option creation to settlement.

User Flow
---------

The following describes the user journey and contract interactions in the **OptionAMM** protocol:

1.  **User Creates an Option**
    
    *   Calls createOption() function in the OptionAMM contract.
        
    *   OptionAMM stores option details.
        
    *   Emits OptionCreated event.
        
2.  **User Purchases an Option**
    
    *   Calls purchaseOption() function in the OptionAMM contract.
        
    *   OptionAMM verifies option availability and calculates cost.
        
    *   Transfers USDC from user (transferFrom).
        
    *   Updates option details.
        
    *   Emits OptionPurchased event.
        
3.  **User Adds Liquidity**
    
    *   Calls addLiquidity() function in OptionAMM contract.
        
    *   Transfers USDC from user (transferFrom).
        
    *   Updates liquidity state.
        
    *   Emits LiquidityAdded event.
        
4.  **User Removes Liquidity**
    
    *   Calls removeLiquidity() function in OptionAMM contract.
        
    *   OptionAMM verifies user’s liquidity.
        
    *   Transfers USDC to user.
        
    *   Updates liquidity state.
        
    *   Emits LiquidityRemoved event.
        
5.  **User Settles an Option**
    
    *   Calls settleOption() function in OptionAMM contract.
        
    *   OptionAMM fetches latest price from FtsoV2Interface.
        
    *   If 'in the money', calculates payout.
        
    *   Transfers USDC to the user.
        
    *   Updates liquidity state.
        
    *   Emits OptionSettled event.
        

Contract Interactions
---------------------

### Functions:

*   createOption(uint strikePrice, uint expiry, uint premium) external
    
*   purchaseOption(uint optionId) external
    
*   addLiquidity(uint amount) external
    
*   removeLiquidity(uint amount) external
    
*   settleOption(uint optionId) external
    

### Events:

*   event OptionCreated(uint optionId, uint strikePrice, uint expiry, uint premium);
    
*   event OptionPurchased(uint optionId, address buyer);
    
*   event LiquidityAdded(address provider, uint amount);
    
*   event LiquidityRemoved(address provider, uint amount);
    
*   event OptionSettled(uint optionId, uint payout);
    

Usage
-----

### Creating an Option

Users can create an option with strike price, lot size, premium, expiry, and call/put type.

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   function createOption(uint _strikePrice, uint _lotSize, uint _premium, uint _expiry, bool _isCall) public {      uint _k = _lotSize * _premium;      options.push(Option({          strikePrice: _strikePrice,          lotSize: _lotSize,          premium: _premium,          k: _k,          expiry: _expiry,          isCall: _isCall,          creator: msg.sender      }));      emit OptionCreated(options.length - 1, _strikePrice, _lotSize, _premium, _expiry, _isCall);  }   `

### Purchasing an Option

Users can purchase options based on available lots.

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   function purchaseOption(uint _optionId, uint _lotAmount) public {      require(_optionId < options.length, "Option does not exist");      Option storage option = options[_optionId];      require(block.timestamp < option.expiry, "Option has expired");      require(option.lotSize >= _lotAmount, "Not enough options available");      uint currentPremium = option.k / option.lotSize;      uint cost = currentPremium * _lotAmount;      require(usdc.transferFrom(msg.sender, address(this), cost), "Failed to transfer USDC");      option.lotSize -= _lotAmount;      option.premium = option.k / option.lotSize;      optionOwnership[_optionId][msg.sender] += _lotAmount;  }   `

### Adding and Removing Liquidity

Liquidity providers can contribute and withdraw liquidity.

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   function addLiquidity(uint _amount) public {      require(usdc.transferFrom(msg.sender, address(this), _amount), "Failed to transfer USDC");      liquidityContributions[msg.sender] += _amount;      totalLiquidity += _amount;      emit LiquidityAdded(msg.sender, _amount);  }   `

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   function removeLiquidity(uint _amount) public {  require(liquidityContributions[msg.sender] >= _amount, "Insufficient liquidity");  require(usdc.transfer(msg.sender, _amount), "Transfer failed");  liquidityContributions[msg.sender] -= _amount;  totalLiquidity -= _amount;  emit LiquidityRemoved(msg.sender, _amount);  }   `

Acknowledgments
---------------

Special thanks to:

*   **Flare Network** for its **scalable blockchain infrastructure**.
    
*   **Web3Auth** for authentication integration.
    
*   **FTSO Data Providers** for real-time pricing information.
    

This **Flare-integrated options trading platform** ensures a **decentralized, transparent, and secure trading experience** for DeFi users worldwide! 🚀
