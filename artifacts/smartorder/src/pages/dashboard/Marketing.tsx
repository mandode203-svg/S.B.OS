import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatDateTime } from "@/lib/utils";
import { Plus, Megaphone, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  name: string;
  segment: string;
  channel: string;
  message: string;
  status: string;
  scheduledAt?: string | null;
  sentCount: number;
  createdAt: string;
}

const SEGMENTS = [
  { value: "all", label: "Tous les clients" },
  { value: "vip", label: "Clients VIP (> 50 000 FCFA)" },
  { value: "inactive", label: "Inactifs (30+ jours)" },
  { value: "new", label: "Nouveaux clients" },
  { value: "frequent", label: "Clients fréquents (5+ commandes)" },
];

const CHANNELS = [
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-yellow-500/15 text-yellow-400",
  sent: "bg-green-500/15 text-green-400",
};

const AI_TEMPLATES = [
  { label: "Promo weekend", text: "🍽️ Ce weekend, profitez de -15% sur toute la carte ! Commandez maintenant via notre lien et régalez-vous. Offre valable sam-dim seulement." },
  { label: "Fidélité", text: "Merci d'être parmi nos clients fidèles 🙏 En récompense, votre prochaine commande bénéficie d'un dessert offert. Montrez ce message à la commande." },
  { label: "Nouveau plat", text: "✨ Nouveauté ! Découvrez notre nouveau plat du chef, préparé avec des ingrédients frais et locaux. Disponible dès aujourd'hui — commandez vite !" },
];

const EMPTY = { name: "", segment: "all", channel: "whatsapp", message: "", scheduledAt: "" };

export default function Marketing() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/campaigns", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => { setCampaigns(d); setLoading(false); });
  }, [token]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.message) {
      toast({ title: "Erreur", description: "Nom et message sont requis", variant: "destructive" });
      return;
    }
    setSaving(true);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, scheduledAt: form.scheduledAt || undefined }),
    });
    if (res.ok) {
      const created = await res.json();
      setCampaigns(prev => [created, ...prev]);
      toast({ title: "Campagne créée" });
      setOpen(false);
      setForm(EMPTY);
    } else {
      const d = await res.json();
      toast({ title: "Erreur", description: d.error, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">{campaigns.length} campagne{campaigns.length !== 1 ? "s" : ""}</p>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nouvelle campagne
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-card border border-border rounded animate-pulse" />)}</div>
        ) : campaigns.length === 0 ? (
          <div className="py-24 text-center">
            <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucune campagne. Créez votre première campagne.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map(c => (
              <div key={c.id} className="bg-card border border-border rounded p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-sm font-semibold">{c.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{SEGMENTS.find(s => s.value === c.segment)?.label} · {CHANNELS.find(ch => ch.value === c.channel)?.label}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[c.status] ?? "bg-muted text-muted-foreground"}`}>
                      {c.status === "draft" ? "Brouillon" : c.status === "scheduled" ? "Planifiée" : "Envoyée"}
                    </span>
                    {c.status === "sent" && (
                      <span className="text-xs text-muted-foreground">{c.sentCount} envois</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 italic">"{c.message}"</p>
                {c.scheduledAt && (
                  <p className="text-xs text-muted-foreground mt-2">📅 Planifiée le {formatDateTime(c.scheduledAt)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Nouvelle campagne</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nom de la campagne</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Promo Noël 2026" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Segment cible</Label>
                <Select value={form.segment} onValueChange={v => set("segment", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{SEGMENTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Canal</Label>
                <Select value={form.channel} onValueChange={v => set("channel", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Message</Label>
                <div className="flex gap-1">
                  {AI_TEMPLATES.map(t => (
                    <button key={t.label} onClick={() => set("message", t.text)}
                      className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors flex items-center gap-1">
                      <Wand2 className="w-2.5 h-2.5" /> {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea value={form.message} onChange={e => set("message", e.target.value)} rows={4} placeholder="Saisissez votre message ou utilisez un modèle AI..." className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">{form.message.length} caractères</p>
            </div>
            <div>
              <Label>Planifier l'envoi (optionnel)</Label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={e => set("scheduledAt", e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Création..." : "Créer la campagne"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
