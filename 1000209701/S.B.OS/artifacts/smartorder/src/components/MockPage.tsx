import { type ReactNode } from "react";
import { Construction } from "lucide-react";

interface MockPageProps {
  title: string;
  description?: string;
  badge?: string;
  children?: ReactNode;
  stats?: { label: string; value: string; sub?: string }[];
}

export default function MockPage({ title, description, badge, children, stats }: MockPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold font-serif">{title}</h2>
            {badge && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <span className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
          <Construction className="w-3.5 h-3.5" />
          Données mockées
        </span>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
              {s.sub && <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {children ?? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center py-20 gap-3">
          <Construction className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground font-medium">Interface en cours de construction</p>
          <p className="text-xs text-muted-foreground/60">Connecter au backend pour activer</p>
        </div>
      )}
    </div>
  );
}
