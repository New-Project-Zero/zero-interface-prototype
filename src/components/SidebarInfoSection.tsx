interface WalletInfo {
    pubkey: number;
    lamports: number;
    SPLholdings: [];
}

interface TokenInfo {
    symbol: string;
    contractAddress: number;
    icon: ImageBitmap;
    price: number;
}

export function SidebarInfoSection({})