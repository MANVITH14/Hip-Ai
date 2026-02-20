import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../lib/api";
import { setToken } from "../lib/storage";

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await loginUser({ email, password });
      setToken(response.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="glass-panel w-full max-w-md rounded-3xl p-8"
      >
        <p className="font-mono text-sm tracking-widest text-accent">HIPALIGN AI</p>
        <h1 className="mt-2 text-3xl font-extrabold">Medical Access</h1>
        <p className="mt-1 text-slate-300">Sign in to validate hip X-ray positioning.</p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <input
            className="w-full rounded-xl border border-slate-600 bg-slate-900/70 px-4 py-3 outline-none ring-accent transition focus:ring-2"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded-xl border border-slate-600 bg-slate-900/70 px-4 py-3 outline-none ring-accent transition focus:ring-2"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button
            className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-slate-900 transition hover:brightness-110 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-300">
          No account?{" "}
          <Link to="/register" className="font-semibold text-accent underline-offset-4 hover:underline">
            Register
          </Link>
        </p>
      </motion.section>
    </main>
  );
}
