import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, ExternalLink, Download, Printer, QrCode, Loader2, Upload, ImageIcon, Clock, Zap, Radio, Play, Square, Wallet, Facebook, Instagram, MessageSquare, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { QRCodeCanvas } from "qrcode.react";

const QR_SIZES = [
  { label: "Petit (128px)",  value: 128 },
  { label: "Moyen (256px)",  value: 256 },
  { label: "Grand (512px)",  value: 512 },
];

const PAYOUT_METHODS = [
  { value: "wave",     label: "Wave" },
  { value: "mtn_momo", label: "MTN MoMo" },
  { value: "moov",     label: "Moov Money" },
  { value: "paystack", label: "Paystack" },
  { value: "orange_money", label: "Orange Money" },
];

export default function Parametres() {
  const { token, business, updateBusiness } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name:    business?.name    ?? "",
    type:    business?.type    ?? "",
    phone:   business?.phone   ?? "",
    address: business?.address ?? "",
    logoUrl: business?.logoUrl ?? "",
  });

  const logoFileRef    = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo]   = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [copied, setCopied]                 = useState(false);
  const [copiedBooking, setCopiedBooking]   = useState(false);
  const [qrSize, setQrSize]                 = useState(256);
  const [activeQr, setActiveQr]             = useState<"order" | "booking">("order");
  const qrRef     = useRef<HTMLDivElement>(null);
  const qrBookRef = useRef<HTMLDivElement>(null);

  const [tiktokUsername, setTiktokUsername]         = useState("");
  const [savingTiktok, setSavingTiktok]             = useState(false);
  const [tiktokConnected, setTiktokConnected]       = useState(false);
  const [tiktokConnecting, setTiktokConnecting]     = useState(false);
  const [tiktokStartedAt, setTiktokStartedAt]       = useState<string | null>(null);

  // Payout (withdrawal) settings
  const [payoutNumber, setPayoutNumber]   = useState("");
  const [payoutMethod, setPayoutMethod]   = useState("wave");
  const [savingPayout, setSavingPayout]   = useState(false);

  // Réseaux sociaux
  const [facebookUrl, setFacebookUrl]         = useState("");
  const [instagramUrl, setInstagramUrl]       = useState("");
  const [messengerUrl, setMessengerUrl]       = useState("");
  const [whatsappBusiness, setWhatsappBusiness] = useState("");
  const [savingSocial, setSavingSocial]       = useState(false);

  const [loadingConfig, setLoadingConfig] = useState(true);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const orderPageUrl  = business?.id ? `${window.location.origin}/store/${business.id}` : "";
  const bookingPageUrl = business?.id ? `${window.location.origin}/book/${business.id}` : "";

  useEffect(() => {
    if (!token) return;

    fetch("/api/store/config", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((cfg: Record<string, unknown> | null) => {
        if (cfg) {
          setTiktokUsername((cfg.tiktok_username as string) ?? "");
          const pc = cfg.payment_config as Record<string, unknown> | null;
          if (pc?.payout_details) {
            const pd = pc.payout_details as Record<string, unknown>;
            setPayoutNumber((pd.phone as string) ?? "");
            setPayoutMethod((pd.method as string) ?? "wave");
          }
          const sc = cfg.social_links as Record<string, unknown> | null;
          if (sc) {
            setFacebookUrl((sc.facebook as string) ?? "");
            setInstagramUrl((sc.instagram as string) ?? "");
            setMessengerUrl((sc.messenger as string) ?? "");
            setWhatsappBusiness((sc.whatsapp_business as string) ?? "");
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingConfig(false));

    fetch("/api/tiktok/status", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((s: { connected: boolean; username?: string; startedAt?: string } | null) => {
        if (s) { setTiktokConnected(s.connected); setTiktokStartedAt(s.startedAt ?? null); }
      })
      .catch(() => undefined);
  }, [token]);

  const handleSaveTiktok = async () => {
    setSavingTiktok(true);
    const res = await fetch("/api/store/tiktok", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tiktok_username: tiktokUsername }),
    });
    if (res.ok) toast({ title: "Nom d'utilisateur TikTok sauvegardé" });
    else {
      const d = await res.json() as { error?: string };
      toast({ title: "Erreur", description: d.error, variant: "destructive" });
    }
    setSavingTiktok(false);
  };

  const handleStartTiktok = async () => {
    setTiktokConnecting(true);
    const res = await fetch("/api/tiktok/start", {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    const d = await res.json() as { success?: boolean; error?: string };
    if (res.ok && d.success) {
      setTiktokConnected(true); setTiktokStartedAt(new Date().toISOString());
      toast({ title: "Connexion TikTok Live démarrée !" });
    } else {
      toast({ title: "Erreur", description: d.error, variant: "destructive" });
    }
    setTiktokConnecting(false);
  };

  const handleStopTiktok = async () => {
    setTiktokConnecting(true);
    const res = await fetch("/api/tiktok/stop", {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    });
    const d = await res.json() as { success?: boolean; error?: string };
    if (res.ok && d.success) {
      setTiktokConnected(false); setTiktokStartedAt(null);
      toast({ title: "Connexion TikTok Live arrêtée" });
    } else {
      toast({ title: "Erreur", description: d.error, variant: "destructive" });
    }
    setTiktokConnecting(false);
  };

  const copyLink = () => {
    if (!orderPageUrl) return;
    navigator.clipboard.writeText(orderPageUrl);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const copyBookingLink = () => {
    if (!bookingPageUrl) return;
    navigator.clipboard.writeText(bookingPageUrl);
    setCopiedBooking(true); setTimeout(() => setCopiedBooking(false), 2000);
  };

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const pad = 32; const labelH = 48;
    const off = document.createElement("canvas");
    off.width = canvas.width + pad * 2;
    off.height = canvas.height + pad * 2 + labelH;
    const ctx = off.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, off.width, off.height);
    ctx.drawImage(canvas, pad, pad);
    ctx.fillStyle = "#0B0A08";
    ctx.font = `bold ${Math.max(12, Math.round(canvas.width * 0.045))}px 'Syne', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(business?.name ?? "SmartOrder AI", off.width / 2, pad + canvas.height + labelH / 2 + 6);
    const link = document.createElement("a");
    link.download = `qrcode-${business?.slug ?? "commande"}.png`;
    link.href = off.toDataURL("image/png");
    link.click();
    toast({ title: "QR Code téléchargé", description: `${qrSize}px · PNG` });
  };

  const printQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>QR Code – ${business?.name ?? "SmartOrder AI"}</title>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
      <style>* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: 'DM Sans', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; }
      .card { text-align: center; padding: 48px; border: 2px solid #E8A325; border-radius: 16px; max-width: 480px; width: 100%; }
      .logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.4rem; color: #0B0A08; margin-bottom: 4px; } .logo span { color: #E8A325; }
      img { width: 280px; height: 280px; display: block; margin: 0 auto 24px; }
      .cta { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 1.1rem; color: #0B0A08; margin-bottom: 8px; }
      .url { font-size: 0.78rem; color: #555; word-break: break-all; } @media print { body { margin: 0; } }</style></head>
      <body><div class="card"><div class="logo">SmartOrder<span> AI</span></div>
      <img src="${dataUrl}" alt="QR Code" /><div class="cta">${business?.name ?? ""}</div><div class="url">${orderPageUrl}</div>
      </div><script>window.onload = () => { window.print(); }<\/script></body></html>`);
    win.document.close();
  };

  const downloadBookingQR = () => {
    const canvas = qrBookRef.current?.querySelector("canvas");
    if (!canvas) return;
    const pad = 32; const labelH = 48;
    const off = document.createElement("canvas");
    off.width = canvas.width + pad * 2;
    off.height = canvas.height + pad * 2 + labelH;
    const ctx = off.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, off.width, off.height);
    ctx.drawImage(canvas, pad, pad);
    ctx.fillStyle = "#0B0A08";
    ctx.font = `bold ${Math.max(12, Math.round(canvas.width * 0.045))}px 'Syne', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(business?.name ?? "SmartOrder AI", off.width / 2, pad + canvas.height + labelH / 2 + 6);
    const link = document.createElement("a");
    link.download = `qrcode-reservation-${business?.slug ?? "booking"}.png`;
    link.href = off.toDataURL("image/png");
    link.click();
    toast({ title: "QR Réservation téléchargé", description: `${qrSize}px · PNG` });
  };

  const printBookingQR = () => {
    const canvas = qrBookRef.current?.querySelector("canvas");
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Réservation – ${business?.name ?? "SmartOrder AI"}</title>
      <style>* { box-sizing: border-box; margin: 0; padding: 0; } body { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; }
      .card { text-align: center; padding: 48px; border: 2px solid #E8A325; border-radius: 16px; max-width: 480px; }
      img { width: 280px; height: 280px; display: block; margin: 0 auto 24px; }
      .cta { font-weight: 700; font-size: 1.1rem; color: #0B0A08; margin-bottom: 8px; }
      .url { font-size: 0.78rem; color: #555; word-break: break-all; } @media print { body { margin: 0; } }</style></head>
      <body><div class="card"><img src="${dataUrl}" alt="QR Code" /><div class="cta">${business?.name ?? ""}</div><div class="url">${bookingPageUrl}</div>
      </div><script>window.onload = () => { window.print(); }<\/script></body></html>`);
    win.document.close();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Fichier trop lourd", description: "Maximum 5 Mo autorisés", variant: "destructive" });
      return;
    }
    setUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl    = reader.result as string;
      const dataBase64 = dataUrl.split(",")[1];
      try {
        const res = await fetch("/api/business/logo", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ dataBase64, mimeType: file.type, fileName: file.name }),
        });
        const data = await res.json() as { logoUrl?: string; error?: string };
        if (res.ok && data.logoUrl) {
          set("logoUrl", data.logoUrl);
          updateBusiness({ ...business!, logoUrl: data.logoUrl });
          toast({ title: "Logo mis à jour !" });
        } else {
          toast({ title: "Erreur upload", description: data.error ?? "Réessayez", variant: "destructive" });
        }
      } catch {
        toast({ title: "Erreur réseau", variant: "destructive" });
      } finally {
        setUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/business", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = await res.json();
      updateBusiness(updated);
      toast({ title: "Paramètres sauvegardés" });
    } else {
      const d = await res.json();
      toast({ title: "Erreur", description: d.error, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleSavePayout = async () => {
    setSavingPayout(true);
    const res = await fetch("/api/store/payout", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ payout_number: payoutNumber, payout_method: payoutMethod }),
    });
    if (res.ok) toast({ title: "Coordonnées de retrait sauvegardées" });
    else {
      const d = await res.json();
      toast({ title: "Erreur", description: d.error, variant: "destructive" });
    }
    setSavingPayout(false);
  };

  const handleSaveSocial = async () => {
    setSavingSocial(true);
    const res = await fetch("/api/store/social", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        facebook:          facebookUrl.trim() || null,
        instagram:         instagramUrl.trim() || null,
        messenger:         messengerUrl.trim() || null,
        whatsapp_business: whatsappBusiness.trim() || null,
      }),
    });
    if (res.ok) toast({ title: "Réseaux sociaux sauvegardés ✓" });
    else toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    setSavingSocial(false);
  };

  if (loadingConfig) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-xl space-y-6">

        {/* ── Informations de la boutique ─────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold font-serif">Informations de la boutique</h2>

          {/* Logo */}
          <div>
            <Label className="text-xs mb-2 block">Logo de la boutique</Label>
            <div className="flex items-center gap-3">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Logo" className="w-14 h-14 rounded-xl object-cover border border-border" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center border border-border">
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => logoFileRef.current?.click()} disabled={uploadingLogo}>
                {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploadingLogo ? "Upload…" : "Changer le logo"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Nom de l'entreprise</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Ex : Restaurant Chez Mamie" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Secteur d'activité</Label>
              <Input value={form.type} onChange={e => set("type", e.target.value)} placeholder="Ex : Restaurant, Boulangerie, Salon de coiffure…" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Téléphone</Label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+229 00 00 00 00" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Adresse</Label>
              <Input value={form.address ?? ""} onChange={e => set("address", e.target.value)} placeholder="Cotonou, Bénin" className="h-9 text-sm" />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full h-9 text-sm gap-2">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Sauvegarder les informations
          </Button>
        </div>

        {/* ── Coordonnées de retrait ──────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold font-serif">Coordonnées de retrait</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Indiquez le numéro Mobile Money sur lequel vous souhaitez recevoir vos retraits de solde.
          </p>

          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">Numéro Mobile Money de réception des retraits</Label>
              <Input
                value={payoutNumber}
                onChange={e => setPayoutNumber(e.target.value)}
                placeholder="+229 97 00 00 00"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Méthode de retrait</Label>
              <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYOUT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSavePayout} disabled={savingPayout} variant="outline" className="w-full h-9 text-sm gap-2">
            {savingPayout ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Sauvegarder les coordonnées
          </Button>
        </div>

        {/* ── Lien de commande public ─────────────────────────────────── */}
        <div className="bg-card border border-border rounded p-5">
          <h2 className="text-sm font-semibold font-serif mb-1">Lien de commande public</h2>
          <p className="text-xs text-muted-foreground mb-3">Partagez ce lien avec vos clients pour qu'ils puissent commander directement.</p>
          <div className="flex gap-2">
            <Input value={orderPageUrl} readOnly className="text-xs" />
            <Button variant="outline" size="icon" onClick={copyLink} title="Copier">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </Button>
            <a href={orderPageUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="icon" title="Ouvrir"><ExternalLink className="w-4 h-4" /></Button>
            </a>
          </div>
        </div>

        {/* ── Lien de réservation public ──────────────────────────────── */}
        <div className="bg-card border border-border rounded p-5">
          <h2 className="text-sm font-semibold font-serif mb-1">Lien de réservation public</h2>
          <p className="text-xs text-muted-foreground mb-3">Partagez ce lien pour que vos clients puissent réserver directement.</p>
          <div className="flex gap-2">
            <Input value={bookingPageUrl} readOnly className="text-xs" />
            <Button variant="outline" size="icon" onClick={copyBookingLink} title="Copier">
              {copiedBooking ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </Button>
            <a href={bookingPageUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="icon" title="Ouvrir"><ExternalLink className="w-4 h-4" /></Button>
            </a>
          </div>
        </div>

        {/* ── QR Codes ────────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded p-5">
          <div className="flex items-center gap-2 mb-1">
            <QrCode className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold font-serif">QR Codes</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Imprimez et posez sur vos tables, menus ou comptoir.</p>

          <div className="flex gap-1 mb-5 bg-muted rounded-lg p-1">
            <button
              onClick={() => setActiveQr("order")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeQr === "order" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >Commande</button>
            <button
              onClick={() => setActiveQr("booking")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeQr === "booking" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >Réservation</button>
          </div>

          {activeQr === "order" ? (
            orderPageUrl ? (
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div ref={qrRef} className="bg-white rounded-xl p-4 flex flex-col items-center gap-2 border border-border flex-shrink-0" style={{ minWidth: 160 }}>
                  <QRCodeCanvas value={orderPageUrl} size={qrSize} bgColor="#ffffff" fgColor="#0B0A08" level="H"
                    imageSettings={{ src: "", x: undefined, y: undefined, height: 0, width: 0, excavate: false }} />
                  <p className="text-[10px] text-gray-500 font-medium text-center max-w-[120px] truncate">{business?.name}</p>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <Label className="text-xs mb-1.5 block">Taille du QR</Label>
                    <Select value={String(qrSize)} onValueChange={v => setQrSize(Number(v))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{QR_SIZES.map(s => <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Button onClick={downloadQR} className="w-full h-9 text-xs gap-2">
                      <Download className="w-3.5 h-3.5" /> Télécharger en PNG
                    </Button>
                    <Button onClick={printQR} className="w-full h-9 text-xs gap-2" variant="outline">
                      <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
                    </Button>
                  </div>
                </div>
              </div>
            ) : <div className="text-center py-6 text-muted-foreground text-xs">Enregistrez d'abord votre établissement pour générer le QR code.</div>
          ) : (
            bookingPageUrl ? (
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div ref={qrBookRef} className="bg-white rounded-xl p-4 flex flex-col items-center gap-2 border border-border flex-shrink-0" style={{ minWidth: 160 }}>
                  <QRCodeCanvas value={bookingPageUrl} size={qrSize} bgColor="#ffffff" fgColor="#0B0A08" level="H"
                    imageSettings={{ src: "", x: undefined, y: undefined, height: 0, width: 0, excavate: false }} />
                  <p className="text-[10px] text-gray-500 font-medium text-center max-w-[120px] truncate">{business?.name}</p>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <Label className="text-xs mb-1.5 block">Taille du QR</Label>
                    <Select value={String(qrSize)} onValueChange={v => setQrSize(Number(v))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{QR_SIZES.map(s => <SelectItem key={s.value} value={String(s.value)}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Button onClick={downloadBookingQR} className="w-full h-9 text-xs gap-2">
                      <Download className="w-3.5 h-3.5" /> Télécharger en PNG
                    </Button>
                    <Button onClick={printBookingQR} className="w-full h-9 text-xs gap-2" variant="outline">
                      <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
                    </Button>
                  </div>
                </div>
              </div>
            ) : <div className="text-center py-6 text-muted-foreground text-xs">Enregistrez d'abord votre établissement pour générer le QR code.</div>
          )}
        </div>

        {/* ── TikTok Live ─────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold font-serif">Intégration TikTok Live</h2>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">Nom d'utilisateur TikTok</Label>
            <div className="flex gap-2">
              <Input
                value={tiktokUsername}
                onChange={e => setTiktokUsername(e.target.value)}
                placeholder="@votre_compte"
                className="h-9 text-sm flex-1"
              />
              <Button variant="outline" onClick={handleSaveTiktok} disabled={savingTiktok} className="h-9 text-xs px-3 shrink-0">
                {savingTiktok ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Sauvegarder"}
              </Button>
            </div>
          </div>

          {tiktokUsername && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", tiktokConnected ? "bg-green-500" : "bg-muted-foreground")} />
                <span className="text-xs text-muted-foreground">
                  {tiktokConnected
                    ? `Connecté${tiktokStartedAt ? ` depuis ${new Date(tiktokStartedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}`
                    : "Non connecté"}
                </span>
              </div>
              <Button
                size="sm"
                variant={tiktokConnected ? "destructive" : "default"}
                onClick={tiktokConnected ? handleStopTiktok : handleStartTiktok}
                disabled={tiktokConnecting}
                className="h-8 text-xs gap-1.5"
              >
                {tiktokConnecting
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : tiktokConnected
                    ? <><Square className="w-3 h-3" /> Déconnecter</>
                    : <><Play className="w-3 h-3" /> Connecter</>
                }
              </Button>
            </div>
          )}
        </div>

        {/* ── Réseaux sociaux ──────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold font-serif">Réseaux sociaux</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Ajoutez vos liens pour que vos clients puissent vous rejoindre directement sur ces plateformes.
          </p>

          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1 flex items-center gap-1.5 block">
                <Facebook className="w-3.5 h-3.5 text-blue-500" /> Page Facebook
              </Label>
              <Input
                value={facebookUrl}
                onChange={e => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/votre-page"
                className="h-9 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs mb-1 flex items-center gap-1.5 block">
                <Instagram className="w-3.5 h-3.5 text-pink-500" /> Instagram
              </Label>
              <Input
                value={instagramUrl}
                onChange={e => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/votre-compte"
                className="h-9 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs mb-1 flex items-center gap-1.5 block">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" /> Facebook Messenger
              </Label>
              <Input
                value={messengerUrl}
                onChange={e => setMessengerUrl(e.target.value)}
                placeholder="https://m.me/votre-page"
                className="h-9 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs mb-1 flex items-center gap-1.5 block">
                <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp Business
              </Label>
              <Input
                value={whatsappBusiness}
                onChange={e => setWhatsappBusiness(e.target.value)}
                placeholder="+229 97 00 00 00"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <Button onClick={handleSaveSocial} disabled={savingSocial} variant="outline" className="w-full h-9 text-sm gap-2">
            {savingSocial ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Sauvegarder les réseaux sociaux
          </Button>
        </div>

      </div>
    </DashboardLayout>
  );
}
