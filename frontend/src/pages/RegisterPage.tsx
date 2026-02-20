import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../lib/api";

export function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await registerUser({ name, email, password });
      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
        <p className="font-mono text-sm tracking-widest text-warning">HIPALIGN AI</p>
        <h1 className="mt-2 text-3xl font-extrabold">Create Account</h1>
        <p className="mt-1 text-slate-300">Register a secure user account.</p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <input
            className="w-full rounded-xl border border-slate-600 bg-slate-900/70 px-4 py-3 outline-none ring-warning transition focus:ring-2"
            placeholder="Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="w-full rounded-xl border border-slate-600 bg-slate-900/70 px-4 py-3 outline-none ring-warning transition focus:ring-2"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded-xl border border-slate-600 bg-slate-900/70 px-4 py-3 outline-none ring-warning transition focus:ring-2"
            placeholder="Password (min 8 chars)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button
            className="w-full rounded-xl bg-warning px-4 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-300">
          Have an account?{" "}
          <Link to="/login" className="font-semibold text-warning underline-offset-4 hover:underline">
            Login
          </Link>
        </p>
      </motion.section>
    </main>
  );
}
