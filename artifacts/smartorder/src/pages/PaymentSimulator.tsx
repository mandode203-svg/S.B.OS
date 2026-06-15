import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Smartphone, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { formatFCFA } from "@/lib/utils";

const PLAN_LABELS: Record<string, string> = {
  starter:  "Starter",
  business: "Business",
  pro:      "Pro / Premium",
};

export default function PaymentSimulator() {
  const [, navigate] = useLocation();
  const params     = new URLSearchParams(window.location.search);

  const invoiceId  = params.get("invoice")    ?? "";
  const amount     = Number(params.get("amount")     ?? 0);
  const plan       = params.get("plan")       ?? "";
  const storeName  = params.get("storeName")  ?? "Boutique";
  const returnUrl  = params.get("returnUrl")  ?? "/admin";
  const cancelUrl  = params.get("cancelUrl")  ?? "/admin";
  const notifUrl   = params.get("notifUrl")   ?? "";
  const notifToken = params.get("notifToken") ?? "";

  const [phase, setPhase]   = useState<"form" | "processing" | "done" | "failed">("form");
  const [phone, setPhone]   = useState("");
  const [error, setError]   = useState("");

  const handleConfirm = async () => {
    if (!phone.trim() || phone.replace(/\s/g, "").length < 8) {
      setError("Veuillez saisir un numéro Orange Money valide (8 chiffres minimum).");
      return;
    }
    setError("");
    setPhase("processing");

    await new Promise(r => setTimeout(r, 2200));

    if (notifUrl) {
      try {
        await fetch(notifUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status:      "SUCCESS",
            txnid:       `SIM-${Date.now()}`,
            orderid:     invoiceId,
            notif_token: notifToken,
            amount:      amount,
            currency:    "OUV",
          }),
        });
      } catch {
        // silently ignore network errors in sim mode
      }
    }

    setPhase("done");
    await new Promise(r => setTimeout(r, 1800));
    window.location.href = returnUrl;
  };

  const handleCancel = () => {
    window.location.href = cancelUrl;
  };

  return (
    <div className="min-h-screen bg-[#FF6600] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* ── Orange Money Header ── */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-3 shadow-lg">
            <Smartphone className="w-8 h-8 text-[#FF6600]" />
          </div>
          <h1 className="text-white text-xl font-bold tracking-wide">Orange Money</h1>
          <p className="text-white/70 text-xs mt-1 uppercase tracking-widest">Paiement sécurisé</p>

          <div className="mt-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-pulse" />
            <span className="text-white text-[11px] font-semibold">MODE SIMULATION</span>
          </div>
        </div>

        {/* ── Card ── */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* Amount banner */}
          <div className="bg-[#FF6600]/8 border-b border-[#FF6600]/15 px-6 py-4 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Montant à payer</p>
            <p className="text-3xl font-bold text-[#FF6600]">{formatFCFA(amount)}</p>
            <p className="text-xs text-gray-400 mt-1">
              Forfait {PLAN_LABELS[plan] ?? plan} · {storeName}
            </p>
          </div>

          <div className="px-6 py-5">

            {phase === "form" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Numéro Orange Money
                  </label>
                  <input
                    type="tel"
                    placeholder="07 00 00 00 00"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]/40 focus:border-[#FF6600] placeholder:text-gray-300 font-mono text-lg tracking-wider"
                  />
                  {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
                </div>

                <p className="text-[11px] text-gray-400 text-center">
                  Vous recevrez une demande de confirmation sur votre téléphone Orange.
                </p>

                <button
                  onClick={handleConfirm}
                  className="w-full py-3 bg-[#FF6600] hover:bg-[#e05a00] text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmer le paiement
                </button>

                <button
                  onClick={handleCancel}
                  className="w-full py-2.5 border border-gray-200 text-gray-400 hover:bg-gray-50 font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Annuler
                </button>
              </div>
            )}

            {phase === "processing" && (
              <div className="py-6 text-center space-y-4">
                <Loader2 className="w-10 h-10 text-[#FF6600] animate-spin mx-auto" />
                <div>
                  <p className="font-semibold text-gray-700 text-sm">Traitement en cours…</p>
                  <p className="text-xs text-gray-400 mt-1">Confirmation du paiement Orange Money</p>
                </div>
                <div className="flex justify-center gap-1.5 mt-3">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-[#FF6600]"
                      style={{ animation: `bounce 1s ease-in-out ${i * 0.2}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {phase === "done" && (
              <div className="py-6 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-green-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-base">Paiement réussi !</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatFCFA(amount)} débité · Redirection…
                  </p>
                </div>
              </div>
            )}

            {phase === "failed" && (
              <div className="py-6 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                  <XCircle className="w-7 h-7 text-red-500" />
                </div>
                <p className="font-bold text-gray-800 text-base">Paiement échoué</p>
                <button onClick={() => setPhase("form")} className="text-[#FF6600] text-sm underline">
                  Réessayer
                </button>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-300" />
            <p className="text-[11px] text-gray-300">Paiement sécurisé · Simulation de test</p>
          </div>
        </div>

      </div>
    </div>
  );
}
