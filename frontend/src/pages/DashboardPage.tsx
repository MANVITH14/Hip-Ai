import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { XrayCanvas } from "../components/XrayCanvas";
import { analyzeWithAiService, uploadForPersistence } from "../lib/api";
import { clearToken, getToken } from "../lib/storage";
import type { AIResult } from "../types";

const processingSteps = [
  "Decoding X-ray image",
  "Detecting landmarks",
  "Computing geometric distances",
  "Evaluating medical thresholds"
];

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AIResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showDebugGrid, setShowDebugGrid] = useState(false);

  const allowedMimeTypes = useMemo(
    () => new Set(["image/jpeg", "image/jpg", "image/png", "application/dicom"]),
    []
  );
  const allowedExtensions = useMemo(() => new Set([".jpg", ".jpeg", ".png", ".dcm", ".dicom"]), []);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  useEffect(() => {
    if (!processing) return;
    const timer = setInterval(() => {
      setStepIdx((prev) => (prev + 1) % processingSteps.length);
    }, 950);
    return () => clearInterval(timer);
  }, [processing]);

  const statusClass = useMemo(() => {
    if (!result) return "border-slate-600";
    return result.overallPass ? "status-pass border-success/50" : "status-fail border-danger/50";
  }, [result]);

  const ruleChecks = useMemo(() => {
    if (!result) return [];
    const th = result.thresholds;
    return [
      {
        label: "Obturator foramen symmetry",
        value: `${result.symmetryScore.toFixed(2)}%`,
        rule: `<= ${th?.symmetryMaxDeviationPct ?? 10}%`,
        pass: result.symmetryPass
      },
      {
        label: "Coccyx-pubic distance",
        value: `${result.coccyxDistanceCm.toFixed(2)} cm`,
        rule: `${th?.coccyxMinCm ?? 1}-${th?.coccyxMaxCm ?? 3} cm`,
        pass: result.coccyxPass
      },
      {
        label: "Lesser trochanter size",
        value: `${result.trochanterSizeMm.toFixed(2)} mm`,
        rule: `< ${th?.trochanterMaxMm ?? 5} mm`,
        pass: result.trochanterPass
      }
    ];
  }, [result]);

  const setNewPreview = (nextFile: File) => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setFile(nextFile);
    setImageUrl(URL.createObjectURL(nextFile));
    setResult(null);
    setError(null);
    setInfo(null);
  };

  const onPickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    if (!picked) return;
    const extension = picked.name.slice(Math.max(0, picked.name.lastIndexOf("."))).toLowerCase();
    const isAllowed = allowedMimeTypes.has(picked.type) || allowedExtensions.has(extension);
    if (!isAllowed) {
      setError("Invalid file type. Allowed: JPG, PNG, DICOM (.dcm)");
      return;
    }
    setNewPreview(picked);
  };

  const runAnalysis = async () => {
    if (!file) {
      setError("Select an image first.");
      return;
    }

    setProcessing(true);
    setStepIdx(0);
    setError(null);
    setInfo(null);

    try {
      const token = getToken();
      const [aiResult, persistResult] = await Promise.allSettled([
        analyzeWithAiService(file),
        token ? uploadForPersistence(file, token) : Promise.resolve()
      ]);

      if (aiResult.status !== "fulfilled") {
        throw aiResult.reason;
      }
      setResult(aiResult.value);

      if (persistResult.status === "rejected") {
        setInfo("Analyzed successfully, but backend persistence failed.");
      } else {
        setInfo("Analysis and backend persistence completed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setProcessing(false);
    }
  };

  const logout = () => {
    clearToken();
    navigate("/login");
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-6 py-8">
      <motion.header
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <p className="font-mono text-xs tracking-[0.28em] text-accent">AI ASSISTED POSITION VALIDATION</p>
          <h1 className="text-3xl font-extrabold">HipAlign Dashboard</h1>
        </div>
        <button
          onClick={logout}
          className="rounded-xl border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-accent hover:text-accent"
        >
          Logout
        </button>
      </motion.header>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="glass-panel rounded-2xl p-5">
          <h2 className="text-lg font-bold">Input</h2>
          <p className="text-sm text-slate-300">Upload JPG, PNG, or DICOM image.</p>

          <label className="mt-4 block text-sm font-medium text-slate-200">Upload X-ray</label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.dcm,.dicom,application/dicom,image/jpeg,image/png"
            onChange={onPickFile}
            className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-900/70 p-3 text-sm"
          />

          <button
            onClick={runAnalysis}
            disabled={processing}
            className="mt-5 w-full rounded-xl bg-sky-400 px-4 py-3 font-bold text-slate-900 transition hover:brightness-110 disabled:opacity-60"
          >
            {processing ? "Processing..." : "Run AI Analysis"}
          </button>

          <label className="mt-4 flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={showDebugGrid}
              onChange={(event) => setShowDebugGrid(event.target.checked)}
              className="h-4 w-4 rounded border-slate-500 bg-slate-900"
            />
            Show Debug Grid
          </label>

          {processing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-3"
            >
              <p className="text-sm text-cyan-100">Processing: {processingSteps[stepIdx]}</p>
              <div className="mt-2 flex gap-2">
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    className="h-2 w-2 rounded-full bg-cyan-300"
                    animate={{ opacity: [0.4, 1, 0.4], y: [0, -2, 0] }}
                    transition={{ repeat: Infinity, duration: 1, delay: dot * 0.12 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
          {info && <p className="mt-3 text-sm text-amber-200">{info}</p>}
        </section>

        <section className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-panel rounded-2xl border p-4 ${statusClass}`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">Positioning Verdict</h2>
              <motion.span
                animate={result?.overallPass ? { scale: [1, 1.03, 1] } : { opacity: [1, 0.65, 1] }}
                transition={{ repeat: Infinity, duration: 1.8 }}
                className={`rounded-full px-4 py-1 font-mono text-sm ${
                  !result ? "bg-slate-700 text-slate-200" : result.overallPass ? "bg-success/30 text-success" : "bg-danger/30 text-rose-200"
                }`}
              >
                {!result ? "WAITING" : result.overallPass ? "PASS" : "FAIL"}
              </motion.span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Symmetry Deviation"
                value={result ? `${result.symmetryScore.toFixed(2)}%` : "--"}
                pass={result?.symmetryPass}
              />
              <MetricCard
                label="Coccyx Distance"
                value={result ? `${result.coccyxDistanceCm.toFixed(2)} cm` : "--"}
                pass={result?.coccyxPass}
              />
              <MetricCard
                label="Lesser Trochanter"
                value={result ? `${result.trochanterSizeMm.toFixed(2)} mm` : "--"}
                pass={result?.trochanterPass}
              />
              <MetricCard
                label="Confidence"
                value={result ? `${(result.confidence * 100).toFixed(1)}%` : "--"}
                pass={result?.confidence ? result.confidence >= 0.5 : undefined}
              />
            </div>

            {result && (
              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/65 p-3">
                <p className="text-sm font-semibold text-slate-200">Clinical Rule Checks</p>
                <div className="mt-2 space-y-2">
                  {ruleChecks.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="text-slate-200">{item.label}</p>
                        <p className="font-mono text-xs text-slate-400">Rule: {item.rule}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-slate-100">{item.value}</p>
                        <p className={`font-mono text-xs ${item.pass ? "text-success" : "text-danger"}`}>
                          {item.pass ? "PASS" : "FAIL"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="glass-panel rounded-2xl p-4"
          >
            <h3 className="mb-3 text-lg font-bold">Annotated X-ray</h3>
            <XrayCanvas imageUrl={imageUrl} result={result} showDebugGrid={showDebugGrid} />
          </motion.div>
        </section>
      </div>
    </main>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  pass: boolean | undefined;
};

function MetricCard({ label, value, pass }: MetricCardProps): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/65 p-3">
      <p className="text-xs uppercase tracking-wider text-slate-300">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      <p className={`mt-1 font-mono text-xs ${pass === undefined ? "text-slate-400" : pass ? "text-success" : "text-danger"}`}>
        {pass === undefined ? "N/A" : pass ? "PASS" : "FAIL"}
      </p>
    </div>
  );
}
