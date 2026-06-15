import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  Store, ShoppingCart, Boxes, Bot, Truck, Wallet, BarChart3, Users,
  MessageCircle, Video, Instagram, ArrowRight, CheckCircle2, Star,
  Sparkles, Zap, Globe, TrendingUp, Bell, Clock, PackageX, FileWarning,
  CalendarClock, Route as RouteIcon, ChevronDown, ShieldCheck, CreditCard,
  Settings, LayoutGrid, Facebook,
} from "lucide-react";
import "./landing.css";

/* ── DATA ───────────────────────────────────────────────── */

const HERO_PILLS = [
  { icon: MessageCircle, label: "WhatsApp Commerce" },
  { icon: Video, label: "TikTok Live" },
  { icon: Boxes, label: "Gestion de stock" },
  { icon: Bot, label: "IA Business Assistant" },
];

const PROBLEMS = [
  { icon: Clock, title: "Réponses lentes aux clients", desc: "Chaque minute d'attente est une vente qui s'évapore." },
  { icon: ShoppingCart, title: "Commandes perdues", desc: "Des messages oubliés dans des dizaines de conversations." },
  { icon: PackageX, title: "Ruptures de stock", desc: "Vous vendez ce que vous n'avez plus, vous frustrez vos clients." },
  { icon: FileWarning, title: "Suivi financier compliqué", desc: "Impossible de savoir si vous gagnez vraiment de l'argent." },
  { icon: CalendarClock, title: "Réservations manuelles", desc: "Carnets, appels, doublons : un cauchemar quotidien." },
  { icon: RouteIcon, title: "Livraisons désorganisées", desc: "Aucune visibilité sur où sont vos commandes." },
];

const FLOW = ["Client WhatsApp", "SmartOrder AI", "Commande", "StockShop", "Facture", "Paiement", "Livraison", "FinanceTPE", "Rapports"];

const MODULES = [
  {
    icon: BarChart3,
    name: "Dashboard",
    color: "text-sky-400",
    items: ["Vue Générale", "Activité du Jour", "Commandes", "Revenus", "Alertes IA", "Résumé Business"],
  },
  {
    icon: Boxes,
    name: "StockShop",
    color: "text-emerald-400",
    items: ["Produits & Catégories", "Variantes", "Inventaire", "Entrepôts", "Fournisseurs", "Achats", "Réappro. IA"],
  },
  {
    icon: ShoppingCart,
    name: "Commerce",
    color: "text-orange-400",
    items: ["Commandes", "Réservations", "Factures", "Paiements", "Points de Vente (POS)", "Catalogue"],
  },
  {
    icon: Bot,
    name: "SmartOrder AI",
    color: "text-violet-400",
    items: ["WhatsApp", "TikTok Live", "Facebook Messenger", "Instagram", "Chat Web", "IA de Vente", "Campagnes Marketing"],
  },
  {
    icon: Truck,
    name: "Delivery Hub",
    color: "text-cyan-400",
    items: ["Livreurs", "Courses", "Zones de Livraison", "Tracking", "Preuves de Livraison"],
  },
  {
    icon: Users,
    name: "CRM",
    color: "text-pink-400",
    items: ["Clients", "Historique", "Segments", "Fidélité", "Leads", "Pipeline Commercial"],
  },
  {
    icon: Wallet,
    name: "FinanceTPE",
    color: "text-green-400",
    items: ["Revenus", "Dépenses", "Trésorerie", "Profit", "Comptes", "Rapports", "Prévisions IA"],
  },
  {
    icon: TrendingUp,
    name: "Analytics",
    color: "text-blue-400",
    items: ["Ventes", "Produits", "Clients", "Marketing", "Livraisons", "Performance IA"],
  },
  {
    icon: Settings,
    name: "Paramètres",
    color: "text-slate-400",
    items: ["Entreprise", "Utilisateurs", "Rôles & Permissions", "Abonnements", "Intégrations", "API"],
  },
  {
    icon: LayoutGrid,
    name: "Marketplace",
    color: "text-amber-400",
    items: ["Modules", "Extensions", "Partenaires", "Connecteurs"],
  },
];

const CHAT_MESSAGES = [
  { from: "client", text: "Bonjour, je veux commander 2 poulets rôtis 🍗", delay: 0 },
  { from: "ai", text: "Bonjour 👋 Bien sûr ! 2 poulets rôtis = 14 000 FCFA. Livraison ou retrait ?", delay: 1200 },
  { from: "client", text: "Livraison s'il vous plaît, quartier Cocody.", delay: 2400 },
  { from: "ai", text: "Parfait ✅ Frais de livraison : 1 500 FCFA. Total : 15 500 FCFA. Lien de paiement Mobile Money 👇", delay: 3600 },
  { from: "ai", text: "💳 Payer maintenant → pay.smartorder.ai/cmd-1047", delay: 4400 },
  { from: "client", text: "Paiement effectué !", delay: 5600 },
  { from: "ai", text: "🎉 Commande confirmée ! Votre livreur part dans 10 min. Tracking en direct → track.smartorder.ai/1047", delay: 6800 },
];

const TIKTOK_COMMENTS = [
  { user: "@marie_abidjan", text: "Je commande 🔥", delay: 0 },
  { user: "@koffi225", text: "C'est combien ?", delay: 800 },
  { user: "@boutique_dakar", text: "J'en veux 3 !", delay: 1600 },
  { user: "@aminata_mode", text: "Disponible en rouge ?", delay: 2400 },
  { user: "@jean_lagos", text: "Livraison Plateau ?", delay: 3200 },
  { user: "@fatou_shop", text: "Je prends 2 unités 💯", delay: 4000 },
];

const ASSISTANT_Q = [
  "Quel est mon bénéfice ce mois ?",
  "Quels produits seront bientôt en rupture ?",
  "Quels clients dois-je relancer ?",
];

const STATS = [
  { value: "1.2M+", label: "Commandes automatisées" },
  { value: "350K+", label: "Réservations gérées" },
  { value: "98%", label: "Clients satisfaits" },
  { value: "+45%", label: "Revenus générés" },
];

const TESTIMONIALS = [
  { name: "Aïcha — Restaurant Le Baobab", text: "Les réservations et commandes WhatsApp se gèrent toutes seules. On a doublé notre service du soir.", emoji: "🍽️" },
  { name: "Karim — Boutique Urban Style", text: "Mes TikTok Lives génèrent des ventes automatiquement. L'IA capture chaque commande dans les commentaires.", emoji: "🛍️" },
  { name: "Fatou — Hôtel Le Palmier", text: "Réservations, paiements et finances enfin réunis. Je pilote tout depuis mon téléphone.", emoji: "🏨" },
];

const PLANS = [
  { name: "STARTER", price: "5 000", desc: "Pour démarrer sereinement", features: ["Caisse POS & TVA auto", "500 produits", "Stock & QR boutique", "Assistant IA SmartOrder"] },
  { name: "BUSINESS", price: "15 000", desc: "Pour vendre partout", highlight: true, features: ["Tout Starter", "TikTok Live + WhatsApp", "Centre de livraison", "CRM avancé", "Produits illimités"] },
  { name: "ENTERPRISE", price: "30 000", desc: "Pour scaler sans limite", features: ["Tout Business", "FinanceTPE Pro", "Prévisions IA", "API & exports", "Support prioritaire 24h"] },
];

const FAQ = [
  { q: "Comment fonctionne SmartOrder AI ?", a: "L'IA est connectée à votre catalogue. Elle lit les messages de vos clients, propose les produits, enregistre la commande et déclenche paiement et livraison automatiquement." },
  { q: "Puis-je connecter WhatsApp ?", a: "Oui. WhatsApp, Messenger, Instagram et TikTok Live se connectent en quelques clics et centralisent toutes vos conversations." },
  { q: "Puis-je gérer plusieurs boutiques ?", a: "Absolument. L'architecture multi-tenant vous permet de gérer plusieurs points de vente depuis un seul tableau de bord." },
  { q: "Puis-je suivre mes livreurs ?", a: "Le Delivery Hub offre un suivi en temps réel de chaque commande, des zones de livraison et de la performance de vos livreurs." },
  { q: "Puis-je gérer mes finances ?", a: "FinanceTPE calcule votre bénéfice net réel (CA − coûts − charges), votre trésorerie et des prévisions IA." },
];

/* ── PAGE ───────────────────────────────────────────────── */

export default function Landing() {
  const { token, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isLoading && token) navigate("/dashboard");
  }, [token, isLoading, navigate]);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center lp-bg">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
      </div>
    );
  }
  if (token) return null;

  return (
    <div className="min-h-screen overflow-x-hidden lp-bg text-white">
      <Nav scrolled={scrolled} />
      <Hero />
      <Stats />
      <Problems />
      <Solution />
      <Modules />
      <AiChat />
      <TikTok />
      <Assistant />
      <Testimonials />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ── NAV ─────────────────────────────────────────────────── */
function Nav({ scrolled }: { scrolled: boolean }) {
  return (
    <nav className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-white/10 bg-[oklch(0.08_0.02_260/80%)] backdrop-blur-xl" : "bg-transparent"}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl lp-tech-gradient lp-glow-blue">
            <Store className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-bold tracking-tight">SmartOrder <span className="lp-tech-text">OS</span></span>
        </div>
        <div className="hidden items-center gap-7 text-sm text-white/70 md:flex">
          <a href="#modules" className="transition hover:text-white">10 Modules</a>
          <a href="#solution" className="transition hover:text-white">Solution</a>
          <a href="#pricing" className="transition hover:text-white">Tarifs</a>
          <a href="#faq" className="transition hover:text-white">FAQ</a>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/login" className="hidden text-sm font-medium text-white/70 transition hover:text-white sm:block">Connexion</Link>
          <Link to="/register" className="inline-flex items-center gap-1.5 rounded-lg lp-tech-gradient px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-90">
            Commencer <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ── HERO ────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative px-4 pb-20 pt-28 sm:pt-36">
      <div className="pointer-events-none absolute inset-0 lp-grid-overlay" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div className="lp-reveal text-center lg:text-left">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-orange-400" />
            L'entreprise intelligente qui gère tout pour vous
          </div>
          <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Votre entreprise fonctionne <span className="lp-tech-text">même lorsque vous dormez.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/70 lg:mx-0 sm:text-lg">
            SmartOrder Business OS automatise vos ventes, vos réservations, votre stock, vos livraisons et votre gestion financière grâce à l'intelligence artificielle.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link to="/register" className="inline-flex items-center gap-2 rounded-xl lp-tech-gradient px-6 py-3 font-semibold text-white shadow-xl transition hover:scale-[1.03] lp-glow-blue">
              Commencer gratuitement <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/register" className="inline-flex items-center gap-2 rounded-xl lp-glass px-6 py-3 font-semibold text-white transition hover:bg-white/10">
              Réserver une démonstration
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap lg:justify-start">
            {HERO_PILLS.map((p) => (
              <div key={p.label} className="inline-flex items-center gap-2 rounded-full lp-glass px-3 py-1.5 text-xs font-medium text-white/85">
                <p.icon className="h-3.5 w-3.5 text-sky-400" /> {p.label}
              </div>
            ))}
          </div>
        </div>
        <div className="lp-reveal">
          <DashboardMock />
        </div>
      </div>
    </section>
  );
}

function DashboardMock() {
  return (
    <div className="relative lp-float">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] lp-tech-gradient opacity-20 blur-3xl" />
      <div className="rounded-3xl lp-glass-strong p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg lp-tech-gradient"><Store className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-sm font-semibold">Business OS</span>
          </div>
          <span className="lp-pulse-ring flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <KpiCard icon={ShoppingCart} label="Commandes" value="1 284" trend="+12%" tint="text-orange-400" />
          <KpiCard icon={Wallet} label="Revenus" value="4.8M F" trend="+45%" tint="text-emerald-400" />
          <KpiCard icon={Boxes} label="Stocks" value="312" trend="-3 alertes" tint="text-sky-400" />
          <KpiCard icon={Truck} label="Livraisons" value="87" trend="en cours" tint="text-cyan-400" />
        </div>
        <div className="mt-2.5 rounded-2xl border border-orange-400/20 bg-orange-400/10 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-300"><Bell className="h-3.5 w-3.5" /> Alertes IA</div>
          <p className="mt-1 text-[12px] text-white/70">3 produits bientôt en rupture · 2 clients à relancer aujourd'hui.</p>
        </div>
        <div className="mt-2.5 rounded-2xl lp-glass p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-300"><Bot className="h-3.5 w-3.5" /> Assistant Business IA</div>
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2 text-[12px] text-white/80">
            <Sparkles className="h-3 w-3 text-violet-300" /> "Ton bénéfice ce mois : +1.4M F (+18%)"
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, trend, tint }: { icon: any; label: string; value: string; trend: string; tint: string }) {
  return (
    <div className="rounded-2xl lp-glass p-3">
      <div className="flex items-center justify-between">
        <Icon className={`h-4 w-4 ${tint}`} />
        <span className="text-[10px] font-medium text-white/50">{trend}</span>
      </div>
      <p className="mt-2 text-lg font-black leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-white/55">{label}</p>
    </div>
  );
}

/* ── STATS ───────────────────────────────────────────────── */
function Stats() {
  return (
    <section className="border-y border-white/10 px-4 py-10">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="lp-reveal text-center">
            <p className="text-2xl font-black lp-tech-text sm:text-3xl">{s.value}</p>
            <p className="mt-1 text-xs text-white/55">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── PROBLEMS ────────────────────────────────────────────── */
function Problems() {
  return (
    <Section id="problems" eyebrow="Le constat" title="Pourquoi les entreprises perdent-elles des ventes chaque jour ?">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROBLEMS.map((p) => (
          <div key={p.title} className="lp-reveal group rounded-2xl lp-glass p-5 transition hover:-translate-y-1 hover:border-orange-400/30">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10">
              <p.icon className="h-5 w-5 text-red-400" />
            </div>
            <h3 className="font-bold">{p.title}</h3>
            <p className="mt-1.5 text-sm text-white/60">{p.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── SOLUTION ────────────────────────────────────────────── */
function Solution() {
  return (
    <Section id="solution" eyebrow="La solution" title="Une seule plateforme pour gérer toute votre activité.">
      <div className="lp-reveal mx-auto max-w-4xl rounded-3xl lp-glass-strong p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {FLOW.map((step, i) => (
            <div key={step} className="flex items-center gap-2.5">
              <span className={`rounded-xl px-3.5 py-2 text-sm font-semibold ${i === 1 ? "lp-tech-gradient text-white shadow-lg" : "lp-glass text-white/85"}`}>
                {step}
              </span>
              {i < FLOW.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 text-sky-400" />}
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-white/60">
          Du premier message client au rapport financier — tout est connecté et automatisé.
        </p>
      </div>
    </Section>
  );
}

/* ── MODULES ─────────────────────────────────────────────── */
function Modules() {
  return (
    <Section id="modules" eyebrow="10 modules métier" title="Tout ce dont votre entreprise a besoin">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {MODULES.map((m) => (
          <div key={m.name} className="lp-reveal group rounded-2xl lp-glass p-5 transition hover:-translate-y-1 hover:border-sky-400/30">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
              <m.icon className={`h-5 w-5 ${m.color}`} />
            </div>
            <h3 className="mb-2.5 font-bold">{m.name}</h3>
            <ul className="space-y-1.5">
              {m.items.map((it) => (
                <li key={it} className="flex items-center gap-2 text-[12px] text-white/65">
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-sky-400/80" /> {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── AI CHAT ANIMÉ WhatsApp ──────────────────────────────── */
function AiChat() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          animateMessages();
        }
      },
      { threshold: 0.3 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const animateMessages = () => {
    CHAT_MESSAGES.forEach((msg, i) => {
      if (msg.from === "ai") {
        setTimeout(() => setIsTyping(true), msg.delay - 600);
      }
      setTimeout(() => {
        setIsTyping(false);
        setVisibleCount(i + 1);
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, msg.delay);
    });
    setTimeout(() => {
      setVisibleCount(0);
      hasStarted.current = false;
      setTimeout(() => {
        hasStarted.current = true;
        animateMessages();
      }, 1500);
    }, CHAT_MESSAGES[CHAT_MESSAGES.length - 1].delay + 3000);
  };

  return (
    <Section id="ai" eyebrow="SmartOrder AI · WhatsApp" title="Une IA qui vend pour vous 24h/24, 7j/7.">
      <div className="lp-reveal mx-auto max-w-lg">
        <div className="rounded-t-3xl bg-[#075E54] px-4 py-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <Store className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">SmartOrder Business</p>
            <p className="text-[11px] text-white/70">Assistant IA · en ligne</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        <div
          ref={containerRef}
          className="rounded-b-3xl lp-glass-strong p-4 h-80 overflow-y-auto scroll-smooth"
          style={{ background: "linear-gradient(160deg, oklch(0.12 0.02 150 / 90%), oklch(0.08 0.02 150 / 95%))" }}
        >
          <div className="space-y-2.5">
            {CHAT_MESSAGES.slice(0, visibleCount).map((m, i) => (
              <div
                key={i}
                className={`flex ${m.from === "client" ? "justify-end" : "justify-start"}`}
                style={{ animation: "lp-msg-in 0.3s cubic-bezier(0.16,1,0.3,1) both" }}
              >
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm shadow-md ${
                  m.from === "client"
                    ? "rounded-br-sm bg-[#dcf8c6] text-[#111] font-medium"
                    : "rounded-bl-sm bg-white text-[#111]"
                }`}>
                  {m.text}
                  <div className="mt-1 text-[10px] text-right opacity-50">
                    {m.from === "ai" ? "🤖 IA" : "Vous"} · maintenant
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start" style={{ animation: "lp-msg-in 0.2s ease both" }}>
                <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-md">
                  <div className="flex gap-1 items-center">
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {[
            { icon: MessageCircle, label: "WhatsApp", color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" },
            { icon: Video, label: "TikTok", color: "text-pink-400 border-pink-400/30 bg-pink-400/10" },
            { icon: Facebook, label: "Messenger", color: "text-blue-400 border-blue-400/30 bg-blue-400/10" },
            { icon: Instagram, label: "Instagram", color: "text-orange-400 border-orange-400/30 bg-orange-400/10" },
          ].map((c) => (
            <span key={c.label} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${c.color}`}>
              <c.icon className="h-3 w-3" /> {c.label}
            </span>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ── TIKTOK LIVE ANIMÉ ───────────────────────────────────── */
function TikTok() {
  const [visibleComments, setVisibleComments] = useState<number[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          animateComments();
        }
      },
      { threshold: 0.3 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const animateComments = () => {
    TIKTOK_COMMENTS.forEach((_, i) => {
      setTimeout(() => {
        setVisibleComments((prev) => [...prev, i]);
        if (i % 2 === 1) setOrderCount((c) => c + 1);
      }, TIKTOK_COMMENTS[i].delay);
    });
    setTimeout(() => {
      setVisibleComments([]);
      setOrderCount(0);
      hasStarted.current = false;
      setTimeout(() => {
        hasStarted.current = true;
        animateComments();
      }, 1500);
    }, TIKTOK_COMMENTS[TIKTOK_COMMENTS.length - 1].delay + 3000);
  };

  return (
    <Section id="tiktok" eyebrow="Live Commerce · TikTok" title="Transformez vos Lives en machine à ventes automatique.">
      <div className="lp-reveal mx-auto grid max-w-4xl items-center gap-8 lg:grid-cols-2">
        <div className="mx-auto">
          <div
            ref={containerRef}
            className="relative mx-auto w-56 overflow-hidden rounded-3xl lp-glass-strong"
            style={{ aspectRatio: "9/16", background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)" }}
          >
            <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-3 z-10">
              <span className="text-[10px] text-white/60">@smartorder_business</span>
              <div className="flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> LIVE
              </div>
            </div>

            <div className="absolute top-8 right-3 text-[10px] text-white/70 flex items-center gap-1">
              <Users className="h-3 w-3" /> 1.2k
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-20 w-20 rounded-full lp-tech-gradient opacity-20 blur-2xl" />
              <Store className="h-10 w-10 text-white/20" />
            </div>

            {orderCount > 0 && (
              <div
                className="absolute top-16 left-3 rounded-xl bg-violet-600/90 px-2 py-1.5 text-[11px] font-bold text-white backdrop-blur"
                style={{ animation: "lp-msg-in 0.3s ease both" }}
              >
                <Bot className="inline h-3 w-3 mr-1" />
                {orderCount} commande{orderCount > 1 ? "s" : ""} IA ✅
              </div>
            )}

            <div className="absolute inset-x-0 bottom-8 px-3 space-y-1.5 overflow-hidden">
              {TIKTOK_COMMENTS.filter((_, i) => visibleComments.includes(i)).slice(-4).map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-xl bg-black/40 px-2.5 py-1.5 backdrop-blur"
                  style={{ animation: "lp-msg-in 0.35s cubic-bezier(0.16,1,0.3,1) both" }}
                >
                  <span className="h-5 w-5 flex-shrink-0 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center text-[8px] font-bold text-white">
                    {c.user[1].toUpperCase()}
                  </span>
                  <span className="text-[10px] text-white/60 font-medium">{c.user}</span>
                  <span className="text-[11px] text-white font-medium">{c.text}</span>
                </div>
              ))}
            </div>

            <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-3 py-2 bg-black/30 backdrop-blur">
              <div className="flex-1 rounded-full bg-white/10 px-3 py-1 text-[10px] text-white/40">Commenter...</div>
            </div>
          </div>
        </div>

        <div>
          <p className="text-base text-white/70 leading-relaxed mb-6">
            Pendant vos Lives TikTok, l'IA lit chaque commentaire en temps réel, détecte les intentions d'achat et crée automatiquement les commandes — sans aucune intervention de votre part.
          </p>
          <ul className="space-y-4">
            {[
              { icon: Zap, color: "bg-orange-400/15 text-orange-400", text: "Détection automatique des intentions d'achat dans les commentaires" },
              { icon: ShoppingCart, color: "bg-sky-400/15 text-sky-400", text: "Création de commande instantanée avec stock mis à jour" },
              { icon: MessageCircle, color: "bg-emerald-400/15 text-emerald-400", text: "Confirmation & lien de paiement envoyé en DM automatiquement" },
              { icon: BarChart3, color: "bg-violet-400/15 text-violet-400", text: "Rapport de vente Live disponible dès la fin du stream" },
            ].map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-white/80">
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${f.color}`}>
                  <f.icon className="h-3.5 w-3.5" />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

/* ── ASSISTANT ───────────────────────────────────────────── */
function Assistant() {
  return (
    <Section id="assistant" eyebrow="Assistant Business IA" title="Posez vos questions, obtenez des réponses business.">
      <div className="lp-reveal mx-auto max-w-2xl space-y-3">
        {ASSISTANT_Q.map((q) => (
          <div key={q} className="flex items-center gap-3 rounded-2xl lp-glass p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl lp-tech-gradient"><Sparkles className="h-4 w-4 text-white" /></span>
            <p className="text-sm font-medium text-white/85">{q}</p>
            <ArrowRight className="ml-auto h-4 w-4 text-sky-400" />
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── TESTIMONIALS ────────────────────────────────────────── */
function Testimonials() {
  return (
    <Section id="testimonials" eyebrow="Ils nous font confiance" title="Des entreprises qui ne dorment jamais.">
      <div className="grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="lp-reveal rounded-2xl lp-glass p-6">
            <div className="mb-3 flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-orange-400 text-orange-400" />)}</div>
            <p className="text-sm leading-relaxed text-white/80">"{t.text}"</p>
            <p className="mt-4 text-sm font-semibold">{t.emoji} {t.name}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── PRICING ─────────────────────────────────────────────── */
function Pricing() {
  return (
    <Section id="pricing" eyebrow="Tarification simple" title="Choisissez votre pack Business OS">
      <div className="grid gap-5 md:grid-cols-3">
        {PLANS.map((p) => (
          <div key={p.name} className={`lp-reveal relative rounded-3xl p-6 ${p.highlight ? "lp-glass-strong scale-[1.03] border border-sky-400/40" : "lp-glass"}`}>
            {p.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full lp-tech-gradient px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg">⭐ Plus populaire</span>
            )}
            <h3 className={`text-lg font-black tracking-wide ${p.highlight ? "lp-tech-text" : ""}`}>{p.name}</h3>
            <p className="mt-1 text-xs text-white/55">{p.desc}</p>
            <div className="my-4"><span className="text-3xl font-black">{p.price}</span><span className="text-sm text-white/55"> FCFA/mois</span></div>
            <ul className="mb-6 space-y-2.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-white/80"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" /> {f}</li>
              ))}
            </ul>
            <Link to="/register" className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${p.highlight ? "lp-tech-gradient text-white hover:opacity-90" : "lp-glass text-white hover:bg-white/10"}`}>
              Choisir ce plan <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ))}
      </div>
      <div className="lp-reveal mt-6 flex flex-wrap items-center justify-center gap-5 text-xs text-white/50">
        <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Données sécurisées</span>
        <span className="flex items-center gap-1.5"><CreditCard className="h-4 w-4 text-sky-400" /> Sans engagement</span>
        <span className="flex items-center gap-1.5"><Globe className="h-4 w-4 text-orange-400" /> Conçu pour l'Afrique</span>
      </div>
    </Section>
  );
}

/* ── FAQ ─────────────────────────────────────────────────── */
function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="faq" eyebrow="Questions fréquentes" title="Tout ce que vous devez savoir">
      <div className="mx-auto max-w-2xl space-y-3">
        {FAQ.map((f, i) => (
          <div key={f.q} className="lp-reveal overflow-hidden rounded-2xl lp-glass">
            <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
              <span className="text-sm font-semibold">{f.q}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-sky-400 transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            <div className={`grid transition-all duration-300 ${open === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden"><p className="px-5 pb-4 text-sm text-white/65">{f.a}</p></div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ── FINAL CTA ───────────────────────────────────────────── */
function FinalCta() {
  return (
    <section className="px-4 py-24">
      <div className="lp-reveal relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] lp-glass-strong p-10 text-center">
        <div className="pointer-events-none absolute -inset-1 -z-10 lp-tech-gradient opacity-15 blur-2xl" />
        <h2 className="text-3xl font-black sm:text-4xl">Prêt à <span className="lp-tech-text">automatiser votre entreprise</span> ?</h2>
        <p className="mx-auto mt-4 max-w-lg text-white/70">Rejoignez les commerçants, restaurants et boutiques qui vendent même la nuit.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/register" className="inline-flex items-center gap-2 rounded-xl lp-tech-gradient px-7 py-3 font-semibold text-white shadow-xl transition hover:scale-[1.03] lp-glow-blue">Essai gratuit <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/register" className="inline-flex items-center gap-2 rounded-xl lp-glass px-7 py-3 font-semibold text-white transition hover:bg-white/10">Demander une démo</Link>
        </div>
      </div>
    </section>
  );
}

/* ── FOOTER ──────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-white/10 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg lp-tech-gradient"><Store className="h-4 w-4 text-white" /></div>
          <span className="text-sm font-bold">SmartOrder Business OS</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/60">
          <a href="#" className="transition hover:text-white">À propos</a>
          <a href="#" className="transition hover:text-white">Contact</a>
          <a href="#" className="transition hover:text-white">Confidentialité</a>
          <a href="#" className="transition hover:text-white">Conditions</a>
        </div>
        <div className="flex items-center gap-3 text-white/60">
          <a href="#" aria-label="WhatsApp" className="transition hover:text-white"><MessageCircle className="h-4 w-4" /></a>
          <a href="#" aria-label="Instagram" className="transition hover:text-white"><Instagram className="h-4 w-4" /></a>
          <a href="#" aria-label="TikTok" className="transition hover:text-white"><Video className="h-4 w-4" /></a>
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-white/40">© {new Date().getFullYear()} SmartOrder Business OS — Conçu pour les PME africaines</p>
    </footer>
  );
}

/* ── SHARED SECTION ──────────────────────────────────────── */
function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="lp-reveal mb-12 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] lp-tech-text">{eyebrow}</p>
          <h2 className="mx-auto max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}
