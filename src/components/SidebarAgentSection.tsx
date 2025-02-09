import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SidebarAgentSectionProps {
    walletKey: string
}

export function SidebarAgentSection({ walletKey }: SidebarAgentSectionProps) {

    //const [isLoading, setIsLoading] = useState(false);    
    const [info, setInfo] = useState<string[]>([]); // State to store info from API

    const retrieveHomunculus = async () => {
        try {
            //sanitize input here
          const response = await fetch(`/api/load-homunculus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletKey }),
          });
          if (response.ok) {
            const data = await response.json(); // Get JSON data from response
            console.log('Homunculus retrieved: ', data);

            if (data.characterizationOutput && Array.isArray(data.characterizationOutput)) {
                setInfo(data.characterizationOutput); // Access the array from the response
            }
          } else {
            console.error('Failed to retrieve Homunculus');
          }
        } catch (error) {
          console.error('Retrieval error:', error);
        } finally {
          //setIsLoading(false);
        }
      };

      const storeHomunculus = async () => {
        try {
            //sanitize input here
          const response = await fetch(`/api/store-homunculus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletKey }),
          });
          if (response.ok) {
            const data = await response.json(); // Get JSON data from response
            console.log('Homunculus stored: ', data);
            if (data.characterizationOutput && Array.isArray(data.characterizationOutput)) {
              setInfo(data.characterizationOutput); // Access the array from the response
            }

          } else {
            console.error('Failed to store Homunculus');
          }
        } catch (error) {
          console.error('storage error:', error);
        } finally {
          //setIsLoading(false);
        }
      };

      return (
        <div className="flex flex-col space-y-4 agent-section"> {
            <Button
              onClick={() => retrieveHomunculus()}
              className="w-full"
            >
                Load Homunculus
            </Button>
            }
            <div>
            <Button
              onClick={() => storeHomunculus()}
              className="w-full"
            >
                Save Homunculus
            </Button>
            </div>
            {/* Conditional rendering for debugging log (TypeScript-friendly) */}
            {(() => {
                console.log("Info state RIGHT BEFORE <ul> render:", info); // Side effect log
                return null; // Return null because we don't want to render anything here
            })()}
            <div className="text-center">Homunculus Profile:</div>
            <ul style={{
                  maxHeight: '200px', /* Adjust this value as needed - this sets the max height of the container */
                  overflowY: 'auto',  /* Or overflow: 'auto'; for both horizontal and vertical */
                  border: '1px solid #ccc', /* Just for visual container, you can remove this if you don't want border */
                  //padding: '10px'      /* Just for visual container */
              }}>
            {info.map((item, index) => (
            <li className="text-center" key={index}>{item}</li>
            ))}
            </ul>
        </div>
      );
}