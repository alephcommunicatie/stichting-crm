"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Building2, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        setNotice("Account aangemaakt. Je kunt nu inloggen.");
        setMode("login");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-3">
            <Building2 className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-semibold">RelatieCRM</h1>
          <p className="text-sm text-muted">Relatiebeheer voor stichtingen</p>
        </div>

        <div className="card p-6">
          <div className="flex mb-6 rounded-lg bg-gray-100 p-1 text-sm font-medium">
            <button
              className={`flex-1 rounded-md py-1.5 transition ${mode === "login" ? "bg-white shadow-sm" : "text-muted"}`}
              onClick={() => setMode("login")}
              type="button"
            >
              Inloggen
            </button>
            <button
              className={`flex-1 rounded-md py-1.5 transition ${mode === "signup" ? "bg-white shadow-sm" : "text-muted"}`}
              onClick={() => setMode("signup")}
              type="button"
            >
              Account maken
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="label">Naam</label>
                <input
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Jouw naam"
                />
              </div>
            )}
            <div>
              <label className="label">E-mailadres</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="naam@stichting.nl"
              />
            </div>
            <div>
              <label className="label">Wachtwoord</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
            {notice && <p className="text-sm text-success">{notice}</p>}

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === "login" ? "Inloggen" : "Account aanmaken"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
