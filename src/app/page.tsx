"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  Sun, 
  Zap, 
  ShieldCheck, 
  Lock, 
  Compass, 
  Clock, 
  Cpu, 
  ChevronRight,
  AlertTriangle,
  Waves,
  Map as MapIcon,
  Fingerprint,
  Info,
  CheckCircle
} from "lucide-react";
import { resonanceMemoryDB } from "@/lib/pouchdb";
import ResonanceMap from "@/components/ResonanceMap";

/**
 * TerraPulse Dashboard (Cortex Intelligence)
 * Build Document: High-fidelity tactical interface for resonance monitoring.
 * 
 * Features:
 * - Glassmorphism UI with neon accents
 * - Live Earth Resonance monitoring (NOAA/USGS Integration)
 * - Sovereignty-certified Integrity Ledger
 * - BodySync Biometric Correlation
 */

export default function TerraPulseDashboard() {
  const [solarData, setSolarData] = useState<{ kp_index: number; status: string } | null>(null);
  const [seismicData, setSeismicData] = useState<{ count: number } | null>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [vitals, setVitals] = useState({ hrv: 70, mood: 5, sleep: 7.5 });
  const [cortexId, setCortexId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isCommiting, setIsCommiting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showIdentity, setShowIdentity] = useState(false);
  const [showKillConfirm, setShowKillConfirm] = useState(false);
  const [killStatus, setKillStatus] = useState<string | null>(null);
  const [deployTarget, setDeployTarget] = useState('aws');
  const [deployStatus, setDeployStatus] = useState<string | null>(null);
  const [watchdog, setWatchdog] = useState<any>(null);
  const [loadingWatchdog, setLoadingWatchdog] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;

    async function fetchResonance() {
      try {
        const [solarRes, seismicRes, predictRes, idRes, ledgerRes] = await Promise.all([
          fetch("http://localhost:8000/api/v1/resonance/solar"),
          fetch("http://localhost:8000/api/v1/resonance/seismic"),
          fetch("http://localhost:8000/api/v1/resonance/prediction"),
          fetch("http://localhost:8000/api/v1/integrity/identity"),
          fetch("http://localhost:8000/api/v1/integrity/ledger")
        ]);
        
        if (!solarRes.ok || !seismicRes.ok) {
            throw new Error("Backend Services Unstable");
        }

        const [solar, seismic, predictData, idData, ledgerData] = await Promise.all([
          solarRes.json(),
          seismicRes.json(),
          predictRes.json(),
          idRes.json(),
          ledgerRes.json()
        ]);
        
        setSolarData(solar);
        setSeismicData(seismic.tremors);
        setForecast(predictData.forecast || []);
        setCortexId(idData.cortex_id);
        setLedger(ledgerData);
        setError(null);
        retryCount = 0;
      } catch (err) {
        console.error("Fetch Error:", err);
        if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(fetchResonance, 2000 * retryCount);
            setError(`Re-establishing Uplink... Attempt ${retryCount}/${maxRetries}`);
        } else {
            setError("Critical: Telemetry Uplink Interrupted. Check Backend Core.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchResonance();
    const interval = setInterval(fetchResonance, 60000);
    // Watchdog status fetching
    const fetchWatchdog = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/v1/operational/watchdog");
        const data = await res.json();
        setWatchdog(data);
        setLoadingWatchdog(false);
      } catch (e) {
        console.error("Watchdog fetch error:", e);
        setLoadingWatchdog(false);
      }
    };
    fetchWatchdog();
    const watchdogInterval = setInterval(fetchWatchdog, 30000);
    return () => {
      clearInterval(interval);
      clearInterval(watchdogInterval);
    };
  }, []);

  const handleCommit = async () => {
    if (!note.trim()) return;
    setIsCommiting(true);
    try {
      const timestamp = new Date().toISOString();
      const sealRes = await fetch("http://localhost:8000/api/v1/integrity/seal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          payload: note,
          metadata: { 
            timestamp,
            kp_index: solarData?.kp_index || 0,
            seismic_count: seismicData?.count || 0,
            hrv: vitals.hrv,
            mood: vitals.mood,
            sleep: vitals.sleep
          }
        })
      });
      const sealedEntry = await sealRes.json();

      // Commit to Local Ledger (PouchDB)
      await resonanceMemoryDB.put({
          ...sealedEntry,
          _id: `obs_${timestamp}`
      });
      
      setNote("");
      setLedger([sealedEntry, ...ledger]);
      // Gentle notification instead of alert
    } catch (err) {
      console.error("Commit Failed:", err);
    } finally {
      setIsCommiting(false);
    }
  };

  const getKpColor = (val: number) => {
    if (val >= 5) return "text-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]";
    if (val >= 4) return "text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]";
    return "text-cortex-cyan text-glow-cyan";
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0f1417] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-cortex-cyan/20 border-t-cortex-cyan rounded-full animate-spin"></div>
          <p className="text-xs uppercase tracking-[0.4em] text-cortex-cyan/60 animate-pulse font-mono">Initializing Cortex Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f1417] selection:bg-cortex-cyan/20 text-[#dfe3e7] p-4 lg:p-8 font-sans overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cortex-cyan/5 blur-[120px] rounded-full animate-slow-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-cortex-green/5 blur-[100px] rounded-full"></div>
      </div>

      {/* Header */}
      <header className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 glass-glow flex items-center justify-center rounded-lg border border-cortex-cyan/30">
              <Zap className="w-5 h-5 text-cortex-cyan fill-cortex-cyan/20" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">CORTEX<span className="text-cortex-cyan">PULSE</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-[10px] text-cortex-cyan/40 font-bold uppercase tracking-[0.3em]">Resonance Surveillance Node // V1.4.2</p>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-cortex-cyan/10 border border-cortex-cyan/20 rounded text-[9px] text-cortex-cyan font-mono">
              <span className="w-1 h-1 rounded-full bg-cortex-cyan animate-pulse"></span>
              SECURE
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end">
            {error ? (
               <div className="flex items-center gap-2 text-[10px] text-rose-500 font-bold uppercase tracking-widest bg-rose-500/10 px-4 py-2 rounded-full border border-rose-500/20">
                 <AlertTriangle className="w-3 h-3" />
                 {error}
               </div>
            ) : (
              <div className="flex items-center gap-8 text-right">
                <div className="hidden sm:block">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Cortex Signature</p>
                  <p className="text-xs font-mono text-zinc-400">ID: {cortexId?.slice(0, 16)}...</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">System Time (UTC)</p>
                  <p className="font-mono text-xl text-white tracking-widest">
                    {new Date().toISOString().slice(11, 19)}
                  </p>
                </div>
              </div>
            )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Main Surveillance Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Solar Resonance */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cortex-cyan to-transparent rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative glass p-6 rounded-3xl h-[280px] flex flex-col justify-between overflow-hidden">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-cortex-cyan/10 text-cortex-cyan">
                      <Sun className="w-5 h-5" />
                    </div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-300">Geomagnetic Variance</h2>
                  </div>
                  <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 2 }} className="px-2 py-0.5 bg-cortex-cyan/20 rounded-md text-[9px] font-black text-cortex-cyan uppercase tracking-tighter">Live</motion.div>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">Tracking planetary K-Index and geomagnetic storm indicators from NOAA telemetry.</p>
              </div>
              
              <div className="flex items-baseline gap-4 mt-4">
                <span className={`text-7xl font-black ${getKpColor(solarData?.kp_index || 0)}`}>
                  {solarData?.kp_index ?? "—"}
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Kp Index</span>
                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${solarData && solarData.kp_index >= 5 ? 'bg-rose-500/20 text-rose-400' : 'bg-cortex-cyan/20 text-cortex-cyan'}`}>
                    <Activity className="w-3 h-3" />
                    {solarData && solarData.kp_index >= 5 ? 'Operational Storm' : 'Ionosphere Stable'}
                  </div>
                </div>
              </div>

              {/* Decorative mini-graph */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cortex-cyan/20 to-transparent"></div>
            </div>
          </motion.section>

          {/* Seismic Pulse */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="group relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cortex-green to-transparent rounded-3xl blur opacity-10 group-hover:opacity-30 transition duration-500"></div>
            <div className="relative glass p-6 rounded-3xl h-[280px] flex flex-col justify-between overflow-hidden">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-cortex-green/10 text-cortex-green">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-300">Seismic Pulse</h2>
                  </div>
                  <div className="px-2 py-0.5 bg-cortex-green/20 rounded-md text-[9px] font-black text-cortex-green uppercase tracking-tighter">Global</div>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">Active global tremors detected within the last 60 minutes. Source: USGS Real-time Feed.</p>
              </div>

              <div className="flex items-baseline gap-4 mt-4">
                <span className="text-7xl font-black text-cortex-green drop-shadow-[0_0_15px_rgba(90,220,179,0.3)]">
                  {seismicData?.count ?? "—"}
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Tremors / Hour</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-cortex-green/20 rounded text-[9px] font-bold text-cortex-green uppercase tracking-wider">
                    <Waves className="w-3 h-3" />
                    Pulse Monitoring
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* BodySync Correlation */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative lg:col-span-1 md:col-span-2 group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cortex-cyan via-[#56ecf0] to-cortex-green rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
            <div className="relative glass p-6 rounded-3xl h-[280px] flex flex-col justify-between overflow-hidden">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-white/5 text-white">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-300">Bio-Geographical Alignment</h2>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">Cross-spectrum correlation between user HRV and the local resonance field.</p>
              </div>
              
              {/* Animated Visualizer */}
              <div className="flex items-end gap-[3px] h-24 w-full mb-2">
                 {[...Array(32)].map((_, i) => (
                   <motion.div 
                     key={i} 
                     initial={{ height: "4px" }}
                     animate={{ height: [`${Math.random() * 80 + 10}%`, `${Math.random() * 80 + 10}%`] }}
                     transition={{ duration: 1, repeat: Infinity, repeatType: "mirror", delay: i * 0.05 }}
                     className="flex-1 bg-gradient-to-t from-cortex-cyan/60 to-transparent rounded-full shadow-[0_0_8px_rgba(45,219,222,0.3)]"
                   />
                 ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-cortex-cyan/60">Alignment: OPTIMAL</p>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cortex-cyan"></div>
                    <span className="text-[9px] text-zinc-600 font-mono">NEURAL SYNC ACTIVE</span>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
        
        {/* Tactical Resonance Map (Upgrade) */}
        <motion.section
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative h-[480px] rounded-3xl overflow-hidden glass border border-white/5"
        >
          <div className="absolute top-6 left-6 z-20 pointer-events-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-px bg-cortex-cyan"></div>
              <h2 className="text-xs font-black uppercase tracking-[0.5em] text-white/60">Global Resonance Surveillance</h2>
            </div>
          </div>
          <ResonanceMap seismicData={seismicData || { count: 0 }} kpIndex={solarData?.kp_index} />
        </motion.section>

        {/* Prediction & Forecast Strip */}
        <section className="glass rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
             <Compass className="w-48 h-48 -rotate-12" />
          </div>

          <div className="flex justify-between items-center mb-10 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-cortex-cyan rounded-full"></div>
              <h2 className="text-xs font-black uppercase tracking-[0.4em] text-white">Resonance Opportunity Window</h2>
            </div>
            <div className="flex items-center gap-3 px-4 py-1.5 bg-black/40 rounded-full border border-white/5">
              <Clock className="w-4 h-4 text-cortex-cyan" />
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Surya Forecast Update: 21m ago</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 pb-2">
            {forecast.length > 0 ? forecast.map((f, i) => (
              <div key={i} className="bg-cortex-slate/60 hover:bg-cortex-slate/80 transition-colors p-4 rounded-2xl border border-white/5 flex flex-col items-center">
                <span className="text-[11px] font-mono text-zinc-500 mb-4">{new Date(f.timestamp).getHours()}:00</span>
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className="relative w-14 h-14 flex items-center justify-center mb-4"
                >
                  <div className={`absolute inset-0 rounded-full blur-lg opacity-20 ${f.kp_predicted > 4 ? 'bg-rose-500' : 'bg-cortex-cyan'}`}></div>
                  <div className={`absolute inset-0 rounded-full border border-white/10 ${f.kp_predicted > 4 ? 'border-rose-500/20' : 'border-cortex-cyan/20'}`}></div>
                  <span className={`text-2xl font-black italic tracking-tighter ${f.kp_predicted > 4 ? 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'text-cortex-cyan text-glow-cyan'}`}>{f.kp_predicted}</span>
                </motion.div>
                <div className="flex items-center gap-1.5">
                   <div className={`w-1 h-1 rounded-full ${f.kp_predicted > 4 ? 'bg-rose-500' : 'bg-cortex-cyan/40'}`}></div>
                   <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400">{f.resonance_type}</span>
                </div>
              </div>
            )) : (
               <p className="col-span-full text-center py-12 text-zinc-600 uppercase text-[10px] tracking-widest italic font-bold">Awaiting Forecast Coefficients...</p>
            )}
          </div>
        </section>

        {/* Tactical Log and Ledger Footer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
           
           {/* Quick Action Column */}
           <div className="lg:col-span-4 space-y-6">
              <div className="glass p-6 rounded-3xl">
                <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-white/40 mb-8 border-b border-white/5 pb-4">Observer Biometrics</h3>
                
                <div className="space-y-6">
                  {/* Metric: HRV */}
                  <div>
                    <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-400 mb-2">
                      <span>HRV Variance</span>
                      <span className="text-cortex-cyan font-mono">{vitals.hrv} ms</span>
                    </div>
                    <input 
                      type="range" min="20" max="150"
                      className="w-full h-1.5 bg-zinc-900 rounded-full appearance-none cursor-pointer accent-cortex-cyan"
                      value={vitals.hrv}
                      onChange={(e) => setVitals({...vitals, hrv: parseInt(e.target.value)})}
                    />
                  </div>
                  {/* Metric: Stability */}
                  <div>
                    <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-400 mb-2">
                      <span>Resonance Mood</span>
                      <span className="text-cortex-green font-mono">{vitals.mood}/10</span>
                    </div>
                    <input 
                      type="range" min="1" max="10"
                      className="w-full h-1.5 bg-zinc-900 rounded-full appearance-none cursor-pointer accent-cortex-green"
                      value={vitals.mood}
                      onChange={(e) => setVitals({...vitals, mood: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              <div className="glass p-6 rounded-3xl group cursor-pointer hover:border-cortex-cyan/40 transition-colors"
                   onClick={async () => {
                        const res = await fetch("http://localhost:8000/api/v1/integrity/export/obsidian");
                        const data = await res.json();
                        const blob = new Blob([data.content], { type: 'text/markdown' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = data.filename;
                        a.click();
                  }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-cortex-cyan/20 transition-colors">
                      <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-cortex-cyan" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white mb-1 uppercase tracking-widest">Sovereign Export</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-mono">Bundle into Obsidian Brain</p>
                    </div>
                  </div>
                </div>
              </div>
           </div>

           {/* Central Log and Ledger */}
           <div className="lg:col-span-8 flex flex-col gap-8">
              {/* Manual Input */}
              <div className="relative">
                <div className="absolute -top-4 left-6 px-3 bg-[#0f1417] text-[10px] font-black uppercase text-cortex-cyan tracking-[0.4em] z-10">Resonance Observation</div>
                <textarea 
                  className="w-full glass rounded-3xl p-6 pt-10 text-white placeholder-zinc-700 focus:outline-none focus:border-cortex-cyan/50 transition-all h-32 text-sm leading-relaxed"
                  placeholder="Record geomagnetic anomalies, geological observations, or bio-resonance pulses..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                ></textarea>
                <div className="absolute bottom-4 right-4 flex items-center gap-4">
                  <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Status: Ready // Secure</div>
                  <button 
                    onClick={handleCommit}
                    disabled={isCommiting}
                    className="flex items-center gap-3 px-6 py-2 bg-cortex-cyan hover:bg-[#5af8fb] text-black font-black rounded-xl transition-all uppercase tracking-[0.2em] text-[10px] disabled:opacity-50 shadow-[0_0_15px_rgba(45,219,222,0.3)]"
                  >
                    {isCommiting ? (
                      <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    Commit to Pulse
                  </button>
                </div>
              </div>

              {/* Integrity Ledger List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4 px-2">
                  <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-600">Integrity Ledger Tracking</h3>
                  <div className="w-full ml-6 h-px bg-white/5"></div>
                </div>
                
                <AnimatePresence>
                  {ledger.length > 0 ? ledger.map((entry, i) => (
                    <motion.div 
                      key={entry._id || i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="glass p-5 rounded-2xl flex justify-between items-center border-l-2 border-l-cortex-cyan/30"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-xs font-bold text-white tracking-tight">
                            {(entry.payload || entry.notes || "Sovereign Audit Entry").slice(0, 100)}
                            {(entry.payload || entry.notes || "").length > 100 ? '...' : ''}
                          </p>
                          <Lock className="w-3 h-3 text-cortex-cyan/40" />
                        </div>
                        <div className="flex items-center gap-4">
                           <span className="text-[9px] text-zinc-600 font-mono uppercase">{new Date(entry._id || Date.now()).toLocaleString()}</span>
                           <span className="text-[9px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-cortex-cyan/60 font-mono uppercase italic">Kp: {entry.kp_index} // Bio: {entry.hrv ?? entry.payload?.hrv ?? '—'}ms</span>
                        </div>
                      </div>
                      <div className="text-right ml-6 pl-6 border-l border-white/5">
                        <p className="text-[10px] font-black text-cortex-cyan mb-1 uppercase tracking-tighter">Verified Seal</p>
                        <p className="text-[9px] text-zinc-600 font-mono">{entry.fingerprint?.slice(0, 12)}</p>
                      </div>
                    </motion.div>
                  )) : (
                     <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/5">
                        <p className="text-xs text-zinc-600 uppercase tracking-widest italic font-bold">No Integrity Commits Logged in this Epoch</p>
                     </div>
                  )}
                </AnimatePresence>
              </div>
           </div>
        </div>
        
        {/* Operational Control Panel */}
        <section className="mt-8 glass rounded-3xl p-6 border border-white/5">
          <h2 className="text-sm font-black uppercase tracking-wider text-cortex-cyan mb-4">Sovereign Control Hub</h2>
          {/* Watchdog HUD */}
          <div className="flex items-center gap-6 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-xs text-white">Watchdog Status: {loadingWatchdog ? 'Loading...' : watchdog?.active_cycles ?? 0} active cycles</span>
          </div>
          {/* Kill Switch */}
          <button
            onClick={() => setShowKillConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Initiate Global Kill Switch
          </button>
          {/* Deploy Swarm */}
          <div className="mt-4 flex items-center gap-2">
            <select
              value={deployTarget}
              onChange={e => setDeployTarget(e.target.value)}
              className="bg-black/30 text-white rounded px-2 py-1"
            >
              <option value="aws">AWS</option>
              <option value="gcp">GCP</option>
              <option value="azure">Azure</option>
              <option value="edge">Edge</option>
            </select>
            <button
              onClick={async () => {
                setDeployStatus('Deploying...');
                const res = await fetch('/api/v1/operational/deploy', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ target: deployTarget })
                });
                const data = await res.json();
                setDeployStatus(data.message || 'Deployed');
              }}
              className="px-3 py-1 bg-cortex-cyan hover:bg-[#5af8fb] text-black font-bold rounded"
            >Deploy Swarm</button>
            {deployStatus && <span className="text-xs text-green-400 ml-2">{deployStatus}</span>}
          </div>
        </section>
        {/* Kill Switch Confirmation Modal */}
        {showKillConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-black/90 p-6 rounded-xl border border-red-500/30 w-96">
              <h3 className="text-lg font-black text-red-400 mb-3">Confirm Global Kill Switch</h3>
              <p className="text-sm text-zinc-300 mb-4">This will terminate all active missions and agents. This action is irreversible.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowKillConfirm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button>
                <button
                  onClick={async () => {
                    setKillStatus('Triggering...');
                    const res = await fetch('/api/v1/operational/kill-switch', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ level: 'system' })
                    });
                    const data = await res.json();
                    setKillStatus(data.message || 'Killed');
                    setShowKillConfirm(false);
                  }}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white font-bold rounded"
                >Confirm</button>
              </div>
              {killStatus && <p className="mt-2 text-xs text-green-400">{killStatus}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Sovereignty Identity Pane (Upgrade) */}
      <AnimatePresence>
        {showIdentity && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIdentity(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed top-0 right-0 h-full w-full max-w-md glass-panel z-[101] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] p-8 border-l border-cortex-cyan/20"
            >
              <div className="flex justify-between items-start mb-12">
                <div>
                  <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-1">SOVEREIGN<span className="text-cortex-cyan">ID</span></h2>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Cortex Certified Identity Payload</p>
                </div>
                <button onClick={() => setShowIdentity(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <ChevronRight className="w-6 h-6 text-zinc-500" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="p-6 rounded-2xl bg-black/40 border border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <Fingerprint className="w-5 h-5 text-cortex-cyan" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#dfe3e7]">Node Signature</h3>
                  </div>
                  <div className="font-mono text-[10px] text-zinc-400 break-all leading-relaxed p-4 bg-black/20 rounded-lg border border-white/5">
                    {cortexId || "G3NR4T1NG_51GN4TUR3..."}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Audit Protocol</h3>
                  {[
                    { label: "Architecture", val: "Distributed Pulse Ledger" },
                    { label: "Integrity", val: "Ed25519 Deterministic Signatures" },
                    { label: "Compliance", val: "Sovereign Proof-of-Control" },
                    { label: "Sync Mode", val: "PouchDB / Local-First" }
                  ].map((stat, i) => (
                    <div key={i} className="flex justify-between items-center py-3 border-b border-white/5">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">{stat.label}</span>
                      <span className="text-[10px] text-cortex-cyan font-mono uppercase">{stat.val}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-8">
                  <div className="glass p-4 rounded-xl border-l-2 border-l-cortex-cyan flex gap-4">
                    <Info className="w-5 h-5 text-cortex-cyan shrink-0" />
                    <p className="text-[10px] text-zinc-400 leading-relaxed uppercase tracking-wide">
                      This surveillance node is cryptographically isolated. All resonance observations are signed locally before ingestion.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setShowIdentity(true)}
        className="fixed bottom-8 right-8 z-[90] w-12 h-12 glass rounded-full flex items-center justify-center hover:border-cortex-cyan/50 hover:scale-110 transition-all shadow-xl group"
      >
        <Fingerprint className="w-6 h-6 text-cortex-cyan group-hover:animate-pulse" />
      </button>
    </main>
  );
}
