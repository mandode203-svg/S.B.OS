import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChefHat, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", type: "", email: "", phone: "", address: "", password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.type.trim()) {
      toast({ title: "Erreur", description: "Indiquez votre secteur d'activité", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erreur", description: data.error, variant: "destructive" });
        return;
      }
      login(data.token, data.business);
      toast({ title: "Bienvenue !", description: "Votre compte est créé avec succès." });
      navigate("/dashboard");
    } catch {
      toast({ title: "Erreur", description: "Inscription impossible", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded bg-primary flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-serif font-bold">Créer votre espace</h1>
          <p className="text-sm text-muted-foreground mt-1">Démarrez votre essai gratuit maintenant</p>
        </div>

        <div className="bg-card border border-border rounded p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nom de l'établissement</Label>
                <Input
                  value={form.name}
                  onChange={e => set("name", e.target.value)}
                  placeholder="Restaurant Chez Mami"
                  required
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label>Secteur d'activité</Label>
                <Input
                  value={form.type}
                  onChange={e => set("type", e.target.value)}
                  placeholder="ex: Restaurant, Quincaillerie, Immobilier, Fast-food…"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                  placeholder="email@exemple.com" required className="mt-1" />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={form.phone} onChange={e => set("phone", e.target.value)}
                  placeholder="+221 77 000 00 00" required className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Adresse (optionnel)</Label>
                <Input value={form.address} onChange={e => set("address", e.target.value)}
                  placeholder="Rue 12, Dakar" className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Mot de passe</Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={e => set("password", e.target.value)}
                    placeholder="Minimum 6 caractères"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Création..." : "Créer mon compte gratuitement"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
