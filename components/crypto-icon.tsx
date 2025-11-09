import Image from 'next/image';

interface CryptoIconProps {
  coin: string;
  size?: number;
  className?: string;
}

export function CryptoIcon({ coin, size = 16, className = '' }: CryptoIconProps) {
  const iconMap: Record<string, string> = {
    BTC: '/icons/crypto/btc.svg',
    ETH: '/icons/crypto/eth.svg',
    BNB: '/icons/crypto/bnb.svg',
    XRP: '/icons/crypto/xrp.svg',
    SOL: '/icons/crypto/sol.svg',
  };

  const iconPath = iconMap[coin];

  if (!iconPath) {
    return null;
  }

  return (
    <Image
      src={iconPath}
      alt={coin}
      width={size}
      height={size}
      className={`inline-block ${className}`}
    />
  );
}
