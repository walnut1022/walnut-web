// components/TokenBalance.tsx
import { WalnutIcon } from "./WalnutIcon";

export default function TokenBalance({ balance }: { balance: number }) {
  return (
    <div className="flex items-center gap-3 bg-orange-50/80 px-6 py-3 rounded-full border border-orange-200">
      <WalnutIcon className="w-6 h-6 text-orange-600" />
      <span className="font-black text-xl text-orange-900">
        {balance.toLocaleString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
      </span>
      <span className="text-orange-700 font-medium">토큰</span>
    </div>
  );
}