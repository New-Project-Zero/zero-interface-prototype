import { useEffect, useState } from 'react';

interface AgentStatusProps {
  walletKey: string;
}

interface AgentInfo {
  model: string;
  tools: string[];
  memory: string;
}

export function AgentStatus({ walletKey }: AgentStatusProps) {
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);

  useEffect(() => {
    const fetchAgentInfo = async () => {
      try {
        const response = await fetch(`/api/agent-info?walletKey=${walletKey}`);
        if (response.ok) {
          const data = await response.json();
          setAgentInfo(data);
        }
      } catch (error) {
        console.error('Error fetching agent info:', error);
      }
    };

    if (walletKey) {
      fetchAgentInfo();
    }
  }, [walletKey]);

  if (!agentInfo) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 mt-4 mb-4">
      <h3 className="text-xl font-semibold text-white mb-2">Your AI Agent</h3>
      <p className="text-gray-300">Model: {agentInfo.model}</p>
      <p className="text-gray-300">Tools: {agentInfo.tools.join(', ')}</p>
      <p className="text-gray-300">Memory: {agentInfo.memory}</p>
    </div>
  );
}

