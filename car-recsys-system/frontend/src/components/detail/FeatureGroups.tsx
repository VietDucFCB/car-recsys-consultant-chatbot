/** Features grouped by category (Safety, Convenience, Entertainment, …). */
import { Check } from "lucide-react";

interface Props {
  grouped?: Record<string, string[]>;
  flat?: string[];
}

const FeatureGroups = ({ grouped, flat }: Props) => {
  const groups =
    grouped && Object.keys(grouped).length > 0
      ? grouped
      : flat && flat.length > 0
      ? { Features: flat }
      : null;
  if (!groups) return null;

  return (
    <div className="mt-12">
      <h2 className="font-heading text-2xl font-semibold text-foreground mb-6">Features &amp; specs</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(groups).map(([category, items]) => (
          <div key={category} className="bg-card border border-border rounded-xl p-5">
            <p className="font-semibold text-foreground mb-3">{category}</p>
            <ul className="space-y-2">
              {items.map((name) => (
                <li key={name} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-accent flex-shrink-0" />
                  {name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeatureGroups;
