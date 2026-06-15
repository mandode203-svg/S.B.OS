import { useEffect, useState } from "react";
import { useParams } from "wouter";
import {
  ChefHat, Loader2, Calendar, Clock, Users,
  Phone, User, MessageSquare, CheckCircle2,
  ChevronLeft, ChevronRight, Minus, Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Store {
  id: string;
  name: string;
  type: string;
  active: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_FR = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
const DAYS_FR   = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(d.getDate() + n); return r;
}
function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fmtLabel(d: Date) {
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;
}

// 30-min slots from 07:00 to 21:30
const TIME_SLOTS = Array.from({ length: 30 }, (_, i) => {
  const totalMins = 420 + i * 30; // 07:00 = 420 min
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
});

// Next 21 days (today + 20)
const DATES = Array.from({ length: 21 }, (_, i) => {
  const d = new Date(); d.setHours(0,0,0,0);
  return addDays(d, i);
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookingPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const { toast }   = useToast();

  const [store, setStore]       = useState<Store | null>(null);
  const [loading, setLoading]   = useState(true);

  // Selection state
  const [selectedDate, setSelectedDate] = useState<Date>(DATES[0]);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [partySize,    setPartySize]    = useState(2);
  const [form, setForm] = useState({ name: "", phone: "", notes: "" });

  // UI state
  const [dateOffset, setDateOffset] = useState(0); // which week of dates to show
  const [step, setStep]   = useState<"form" | "success">("form");
  const [submitting, setSubmitting] = useState(false);
  const [confirmId, setConfirmId]   = useState<string | null>(null);

  // ── Load store ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/storefront/${storeId}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: (Store & { products: unknown[] }) | null) => {
        setStore(d);
        setLoading(false);
      });
  }, [storeId]);

  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleBook = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast({ title: "Erreur", description: "Nom et téléphone requis", variant: "destructive" });
      return;
    }
    if (!selectedTime) {
      toast({ title: "Erreur", description: "Choisissez un créneau horaire", variant: "destructive" });
      return;
    }
    const dateStr = `${isoDate(selectedDate)}T${selectedTime}:00`;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          clientName:  form.name.trim(),
          clientPhone: form.phone.trim(),
          dateTime:    dateStr,
          partySize,
          notes:       form.notes.trim() || undefined,
        }),
      });
      if (res.ok) {
        const r = await res.json() as { id: string };
        setConfirmId(r.id);
        setStep("success");
      } else {
        const d = await res.json() as { error?: string };
        toast({ title: "Erreur", description: d.error ?? "Réservation impossible", variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-7 h-7 animate-spin text-primary" />
    </div>
  );
  if (!store) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <ChefHat className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold">Établissement introuvable</h2>
      <p className="text-sm text-muted-foreground">Ce lien ne correspond à aucune boutique active.</p>
    </div>
  );

  // ── Displayed date slice (7 at a time) ─────────────────────────────────────
  const visibleDates = DATES.slice(dateOffset, dateOffset + 7);

  // ── Success screen ──────────────────────────────────────────────────────────

  if (step === "success") {
    const dt = new Date(`${isoDate(selectedDate)}T${selectedTime}:00`);
    const dtStr = dt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-serif font-bold mb-2">Réservation confirmée !</h2>
        <p className="text-muted-foreground text-sm mb-1 capitalize">{dtStr}</p>
        <p className="text-[#E8A325] font-bold mb-1">{selectedTime} · {partySize} personne{partySize > 1 ? "s" : ""}</p>
        <p className="text-muted-foreground text-sm mb-6">{store.name} a reçu votre demande.</p>

        {confirmId && (
          <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 font-mono mb-8">
            Référence : {confirmId.slice(0, 8).toUpperCase()}
          </p>
        )}

        <div className="w-full max-w-xs space-y-3">
          <div className="bg-card border border-border rounded-xl p-4 text-left space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span className="capitalize">{dtStr} à {selectedTime}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span>{partySize} personne{partySize > 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span>{form.name}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground px-2">
            L'établissement va confirmer votre réservation. Gardez votre référence.
          </p>

          <button
            onClick={() => { setStep("form"); setSelectedTime(""); setForm({ name: "", phone: "", notes: "" }); }}
            className="w-full text-sm text-muted-foreground py-2 hover:text-foreground transition-colors"
          >
            Faire une autre réservation
          </button>
        </div>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────

  const canSubmit = !!selectedTime && !!form.name.trim() && !!form.phone.trim();

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">

      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-lg mx-auto px-4 pt-6 pb-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <ChefHat className="w-7 h-7 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-serif font-bold truncate">{store.name}</h1>
            <p className="text-sm text-muted-foreground capitalize">Réservation en ligne · {store.type}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">

        {/* ── Date section ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Choisir une date
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDateOffset(o => Math.max(0, o - 7))}
                disabled={dateOffset === 0}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDateOffset(o => Math.min(14, o + 7))}
                disabled={dateOffset >= 14}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {visibleDates.map(d => {
              const key     = isoDate(d);
              const isSelected = isoDate(selectedDate) === key;
              const isToday = key === isoDate(new Date());
              return (
                <button
                  key={key}
                  onClick={() => { setSelectedDate(d); setSelectedTime(""); }}
                  className={`flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl text-xs font-medium transition-all active:scale-95 ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                      : isToday
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "bg-card border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <span className="text-[10px] opacity-70">{DAYS_FR[d.getDay()]}</span>
                  <span className="text-base font-bold leading-tight">{d.getDate()}</span>
                  <span className="text-[9px] opacity-60">{MONTHS_FR[d.getMonth()]}</span>
                </button>
              );
            })}
          </div>
          {selectedDate && (
            <p className="text-xs text-center text-muted-foreground mt-2 capitalize">
              {fmtLabel(selectedDate)}
            </p>
          )}
        </section>

        {/* ── Time slots ── */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4">
            <Clock className="w-3.5 h-3.5" /> Choisir un créneau
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {TIME_SLOTS.map(slot => (
              <button
                key={slot}
                onClick={() => setSelectedTime(slot)}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                  selectedTime === slot
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                    : "bg-card border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </section>

        {/* ── Party size ── */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4">
            <Users className="w-3.5 h-3.5" /> Nombre de personnes
          </h2>
          <div className="flex items-center justify-center gap-6 bg-card border border-border rounded-2xl py-5">
            <button
              onClick={() => setPartySize(p => Math.max(1, p - 1))}
              className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/70 active:scale-95 transition-all"
            >
              <Minus className="w-5 h-5" />
            </button>
            <div className="text-center min-w-[60px]">
              <span className="text-4xl font-bold text-[#E8A325]">{partySize}</span>
              <p className="text-xs text-muted-foreground mt-1">personne{partySize > 1 ? "s" : ""}</p>
            </div>
            <button
              onClick={() => setPartySize(p => Math.min(20, p + 1))}
              className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center hover:opacity-90 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>
          {/* Quick party-size shortcuts */}
          <div className="flex gap-2 mt-3 justify-center">
            {[1, 2, 4, 6, 8, 10].map(n => (
              <button
                key={n}
                onClick={() => setPartySize(n)}
                className={`w-9 h-7 rounded-lg text-xs font-semibold transition-all ${
                  partySize === n ? "bg-primary/20 text-primary border border-primary/40" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* ── Your info ── */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <User className="w-3.5 h-3.5" /> Vos informations
          </h2>
          <div>
            <Label className="text-xs">Nom complet <span className="text-destructive">*</span></Label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={form.name}
                onChange={e => setF("name", e.target.value)}
                placeholder="ex: Amadou Traoré"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Téléphone WhatsApp <span className="text-destructive">*</span></Label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="tel"
                value={form.phone}
                onChange={e => setF("phone", e.target.value)}
                placeholder="+221 77 000 00 00"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes / demandes spéciales (optionnel)</Label>
            <div className="relative mt-1">
              <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Textarea
                value={form.notes}
                onChange={e => setF("notes", e.target.value)}
                placeholder="Allergies, anniversaire, table en terrasse…"
                rows={2}
                className="pl-9 resize-none text-sm"
              />
            </div>
          </div>
        </section>

        {/* Recap before submit */}
        {selectedTime && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-1.5">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Récapitulatif</p>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="capitalize">{fmtLabel(selectedDate)} à {selectedTime}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{partySize} personne{partySize > 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ChefHat className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{store.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border">
        <div className="max-w-lg mx-auto">
          <Button
            className="w-full h-13 text-base gap-2 rounded-xl py-3.5"
            onClick={handleBook}
            disabled={!canSubmit || submitting}
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
              : selectedTime
                ? `Réserver pour ${selectedTime} · ${partySize} pers.`
                : "Choisissez un créneau pour continuer"
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
