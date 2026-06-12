/** Vehicle history: up to 5 ✓/✗ rows from the crawled user_history_des booleans. */
import { Check, X, Shield } from "lucide-react";

interface Props {
  clean_title?: boolean | null;
  one_owner?: boolean | null;
  // accidents_damage comes from the API as a string ("Yes"/"No"/null) or boolean — normalize.
  accidents_damage?: string | boolean | null;
  has_open_recall?: boolean | null;
  is_personal_use?: boolean | null;
}

function asBool(v: unknown): boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["yes", "true", "1"].includes(s)) return true;
  if (["no", "false", "0", "none reported", "none"].includes(s)) return false;
  return null;
}

const Row = ({ ok, label }: { ok: boolean; label: string }) => (
  <div className="flex items-center gap-2 text-sm">
    {ok ? (
      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    )}
    <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
  </div>
);

const VehicleHistory = (p: Props) => {
  const cleanTitle = asBool(p.clean_title);
  const oneOwner = asBool(p.one_owner);
  const accidents = asBool(p.accidents_damage);   // true = HAS accidents
  const recall = asBool(p.has_open_recall);        // true = HAS open recall
  const personal = asBool(p.is_personal_use);

  const rows: { ok: boolean; label: string }[] = [];
  if (cleanTitle !== null) rows.push({ ok: cleanTitle, label: "Clean Title" });
  if (oneOwner !== null) rows.push({ ok: oneOwner, label: "One Owner" });
  if (accidents !== null) rows.push({ ok: !accidents, label: "No Accidents or Damage" });
  if (recall !== null) rows.push({ ok: !recall, label: "No Open Recall" });
  if (personal !== null) rows.push({ ok: personal, label: "Personal Use Only" });

  if (rows.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="font-heading text-2xl font-semibold text-foreground mb-6 flex items-center gap-2">
        <Shield className="h-6 w-6 text-accent" /> Vehicle History
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-card border border-border rounded-xl p-5">
        {rows.map((r) => (
          <Row key={r.label} ok={r.ok} label={r.label} />
        ))}
      </div>
    </div>
  );
};

export default VehicleHistory;
