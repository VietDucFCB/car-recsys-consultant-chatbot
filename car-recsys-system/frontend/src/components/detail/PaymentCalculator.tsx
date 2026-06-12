/** Client-side monthly-payment estimator (standard amortization). No API. */
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const PaymentCalculator = ({ price }: { price: number }) => {
  const [down, setDown] = useState(0);
  const [term, setTerm] = useState(72);
  const [apr, setApr] = useState(5);

  const { monthly, totalInterest } = useMemo(() => {
    const principal = Math.max(price - down, 0);
    const r = apr / 100 / 12;
    const n = term;
    if (principal <= 0 || n <= 0) return { monthly: 0, totalInterest: 0 };
    const m = r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
    return { monthly: m, totalInterest: m * n - principal };
  }, [price, down, term, apr]);

  return (
    <div className="mt-12">
      <h2 className="font-heading text-2xl font-semibold text-foreground mb-6">Estimate payments</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card border border-border rounded-xl p-6">
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="text-muted-foreground">Down payment</span>
            <Input type="number" min={0} value={down} onChange={(e) => setDown(Number(e.target.value) || 0)} className="mt-1" />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Loan term (months)</span>
            <Input type="number" min={12} max={96} value={term} onChange={(e) => setTerm(Number(e.target.value) || 0)} className="mt-1" />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">APR (%)</span>
            <Input type="number" min={0} max={30} step={0.1} value={apr} onChange={(e) => setApr(Number(e.target.value) || 0)} className="mt-1" />
          </label>
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-3xl font-bold text-foreground">{fmt(monthly)}<span className="text-base font-normal text-muted-foreground">/mo</span></p>
          <div className="mt-4 space-y-1 text-sm text-muted-foreground">
            <p className="flex justify-between"><span>Vehicle price</span><span>{fmt(price)}</span></p>
            <p className="flex justify-between"><span>Down payment</span><span>-{fmt(down)}</span></p>
            <p className="flex justify-between"><span>Total interest</span><span>{fmt(totalInterest)}</span></p>
            <p className="flex justify-between font-medium text-foreground border-t border-border pt-1 mt-1">
              <span>Total cost</span><span>{fmt(price - down + totalInterest)}</span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Estimate only. Excludes taxes, fees, and registration.</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentCalculator;
