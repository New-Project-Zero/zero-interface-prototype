import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"

interface Tool {
  name: string;
  action: string;
}

interface agentToolProps {
  toolList: Tool[];
}

interface SPLHolding {
    symbol: string;
    mint_address: string;
    balance: number;
    balanceValue: number;
    price: number; 
  }

const placeholderMap = {
    contract: "Enter contract address",
    publicKey: "Enter public key",
    //more mappings as needed
  } as const;

  // Get the placeholder or fallback to a default value
const getPlaceholder = (action: string) => {
    return placeholderMap[action as keyof typeof placeholderMap] || `Enter ${action} input`;
  };

export function SidebarButtons({ toolList }: agentToolProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [inputValues, setInputValues] = useState<{ [key: string]: string }>({});
    const [info, setInfo] = useState<any>(null); // State to store info from API

  
    const handleCustomAction = async (action: string, inputValue: string) => {
        setIsLoading(true);
        try {
            //sanitize input here
          const response = await fetch(`/api/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, inputValue }),
          });
          if (response.ok) {
            const data = await response.json(); // Get JSON data from response
        setInfo(data); // Update info state with API response
            console.log('Action performed successfully');
          } else {
            console.error('Failed to perform action');
          }
        } catch (error) {
          console.error('Error performing action:', error);
        } finally {
          setIsLoading(false);
          // Find the toolName corresponding to the action
        const tool = toolList.find((t) => t.action === action);
        if (tool) {
            // Reset the input value for this tool
            setInputValues((prev) => ({
            ...prev,
            [tool.name]: '', // Reset to empty string
            }));
         }
        }
      };
  
    const handleInputChange = (toolName: string, value: string) => {
      setInputValues((prev) => ({
        ...prev,
        [toolName]: value,
      }));
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, action: string, inputValue: string) => {
        if (event.key === 'Enter') {
          handleCustomAction(action, inputValue);
        }
      };

    return (
      <div className="flex flex-col space-y-4 info-section"> {/* Added space-y-4 for consistent spacing */}
        {toolList.map((tool) => (
          <div key={tool.name} className="flex flex-col "> {/* Wrapper for button and input */}
            <Input
             placeholder={getPlaceholder(tool.action)}
             value={inputValues[tool.name] || ''}
              onChange={(e) => handleInputChange(tool.name, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, tool.action, inputValues[tool.name] || '')}
              className="w-full" // Ensure input takes full width
            />
            <Button
              onClick={() => handleCustomAction(tool.action, inputValues[tool.name] || '')}
              disabled={isLoading}
              className="w-full" // Ensure button takes full width
            >
              {tool.name}
            </Button>
          </div>
        ))}

        {/* Info Section */}
        <div className='info-section-display'>
        {info ? ( // Check if info exists at all
        info.mintAddr ? (
            <div className="text-center">
            <div style={{ padding: '4px 0' }}>
                <b>Image:</b>
                <div className='justify-center'>  
                <a
                href={info.imageLink}
                target="_blank"
                rel="noopener noreferrer"
                >Images can be dangerous! Click here to visit the image site.</a> 
                </div>
            </div>
            <div style={{ padding: '4px 0' }}>
                <b>Symbol:</b> {info.symbol}
            </div>
            <div style={{ padding: '4px 0' }}>
                <b>Mint Address:</b>
                <a
                href={`https://solscan.io/token/${info.mintAddr}`}
                target="_blank"
                rel="noopener noreferrer"
                >
                {`${info.mintAddr.slice(0, 5)}...${info.mintAddr.slice(-5)}`}
                </a>
            </div>
            <div style={{ padding: '4px 0' }}>
                <b>Price USD:</b> {info.price}
            </div>
            </div>
        ) : ( // Wallet information
            <div className= "text-center">
            <div style={{ padding: '4px 0' }}>
                <b>Public Key:</b> 
                <a
                href={`https://solscan.io/account/${info.pubkey}`}
                target="_blank"
                rel="noopener noreferrer"
                >
                {`${info.pubkey.slice(0, 5)}...${info.pubkey.slice(-5)}`}</a>
            </div>
            <div style={{ padding: '4px 0' }}>
                <b>Balance:</b> {info.balance} SOL
            </div>
            {/* Render owned tokens if available */}
            {info.SPLholdings && (
            <div style={{ padding: '4px 0' }}>
                <b>Owned Tokens:</b>
                <ul style={{
                  maxHeight: '300px', /* Adjust this value as needed - this sets the max height of the container */
                  overflowY: 'auto',  /* Or overflow: 'auto'; for both horizontal and vertical */
                  border: '1px solid #ccc', /* Just for visual container, you can remove this if you don't want border */
                  //padding: '10px'      /* Just for visual container */
              }}>
                {info.SPLholdings.map((token: SPLHolding) => (
                    <li key={token.mint_address} style={{
                      borderBottom: '1px solid #eeee',
                      padding: '8px 0'
                  }}>
                    {token.symbol} - {token.balance.toFixed(5)}
                    <div>
                        Price: {token.price.toFixed(5)} 
                    </div>
                    <div>
                        $ {(token.balanceValue)} 
                    </div>
                    </li>
                ))}
                </ul>
            </div>
            )}
            </div>
        )
        ) : (
        <div className='text-center'>Input a Solana Token contract address or wallet public key to retreive information.</div> //fallback
        )}
        </div>
        </div>
    );
  }