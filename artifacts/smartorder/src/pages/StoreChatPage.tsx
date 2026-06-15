import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Send, Bot, User, Loader2, ChefHat, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StoreInfo {
  id: string;
  name: string;
  type: string;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  ts: number;
}

export default function StoreChatPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [, navigate] = useLocation();

  const [store, setStore] = useState<StoreInfo | null>(null);
  const [phone, setPhone] = useState("");
  const [phoneConfirmed, setPhoneConfirmed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [storeLoading, setStoreLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/storefront/${storeId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStore(data); })
      .finally(() => setStoreLoading(false));
  }, [storeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Message = { role: "user", text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, customerPhone: phone, message: text }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      const reply = data.reply ?? data.error ?? "Désolé, je n'ai pas pu répondre.";
      setMessages(prev => [...prev, { role: "assistant", text: reply, ts: Date.now() }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Une erreur est survenue. Veuillez réessayer.",
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const confirmPhone = () => {
    const cleaned = phone.replace(/\s/g, "");
    if (cleaned.length < 8) return;
    setPhone(cleaned);
    setPhoneConfirmed(true);
    setMessages([{
      role: "assistant",
      text: `Bonjour ! 👋 Je suis l'assistant de ${store?.name ?? "notre boutique"}. Comment puis-je vous aider aujourd'hui ?`,
      ts: Date.now(),
    }]);
  };

  if (storeLoading) {
    return (
      <div className="min-h-screen bg-[#0B0A08] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0A08] flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 bg-[#0F0E0C]">
        <button
          onClick={() => navigate(`/store/${storeId}`)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          <ChefHat className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{store?.name ?? "Assistant"}</p>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[10px] text-white/40">Assistant IA · En ligne</p>
          </div>
        </div>
      </div>

      {!phoneConfirmed ? (
        /* Phone number gate */
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-5">
            <Bot className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-serif font-bold text-white mb-1 text-center">
            Chat avec l'Assistant IA
          </h2>
          <p className="text-sm text-white/40 text-center mb-8 max-w-xs">
            Entrez votre numéro de téléphone pour démarrer la conversation.
          </p>
          <div className="w-full max-w-xs space-y-3">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === "Enter" && confirmPhone()}
                placeholder="+225 XX XX XX XX XX"
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11"
              />
            </div>
            <Button
              className="w-full"
              onClick={confirmPhone}
              disabled={phone.replace(/\s/g, "").length < 8}
            >
              Démarrer la conversation
            </Button>
          </div>
        </div>
      ) : (
        /* Chat interface */
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
                  ${msg.role === "assistant"
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-white/10 border border-white/20"
                  }`}
                >
                  {msg.role === "assistant"
                    ? <Bot className="w-3.5 h-3.5 text-primary" />
                    : <User className="w-3.5 h-3.5 text-white/60" />
                  }
                </div>
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
                  ${msg.role === "assistant"
                    ? "bg-white/5 text-white border border-white/10 rounded-tl-sm"
                    : "bg-primary text-primary-foreground rounded-tr-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex gap-1">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="px-4 pb-6 pt-3 border-t border-white/10 bg-[#0F0E0C]">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Écrivez votre message…"
                disabled={loading}
                className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-11"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="w-11 h-11 rounded-lg bg-primary flex items-center justify-center
                  hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
