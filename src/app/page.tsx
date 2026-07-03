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
  Fingerprint,
  Info,
  CheckCircle,
  Link
} from "lucide-react";
import ResonanceMap from "@/components/ResonanceMap";

export default function TerraPulseDashboard() {
  const [solarData, setSolarData] = useState<{ kp_index: number; status: string } | null>(null);
  const [seismicData, setSeismicData] = useState<{ count: number } | null>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [integrityStatus, setIntegrityStatus] = useState<any>(null);
  const [vitals, setVitals] = useState({ hrv: 70, mood: 5, sleep: 7.5 });
  const [cortexId, setCortexId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isCommiting, setIsCommiting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showIdentity, setShowIdentity] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Generic selected parent state
  const [selectedParent, setSelectedParent] = useState<{id: string, type: string, label: string} | null>(null);

  const fetchResonance = async () => {
    try {
      const [solarRes, seismicRes, predictRes, idRes, replayRes, integrityRes] = await Promise.all([
        fetch("http://localhost:8000/api/v1/resonance/solar"),
        fetch("http://localhost:8000/api/v1/resonance/seismic"),
        fetch("http://localhost:8000/api/v1/resonance/prediction"),
        fetch("http://localhost:8000/api/v1/core/actor/resolve?actor_id=local_human"),
        fetch("http://localhost:8000/api/v1/core/replay"),
        fetch("http://localhost:8000/api/v1/core/integrity")
      ]);
      
      const [solar, seismic, predictData, idData, replayData, integrityData] = await Promise.all([
        solarRes.json(),
        seismicRes.json(),
        predictRes.json(),
        idRes.json(),
        replayRes.json(),
        integrityRes.json()
      ]);
      
      setSolarData(solar);
      setSeismicData(seismic.tremors);
      setForecast(predictData.forecast || []);
      setCortexId(idData.actor_id);
      
      // We expect the backend /replay route to return a timeline array
      setLedger(replayData.timeline ? replayData.timeline.reverse() : []);
      setIntegrityStatus(integrityData);
      
      if (!error?.includes("Commit Rejected")) {
          setError(null);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setError("Critical: Telemetry Uplink Interrupted. Check Backend Core.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResonance();
    const interval = setInterval(fetchResonance, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCommit = async (primitiveType: 'observation' | 'evidence' | 'claim' | 'decision') => {
    if (!note.trim()) return;
    setIsCommiting(true);
    setError(null);
    try {
      const parent_ids = selectedParent ? [selectedParent.id] : [];
      const payload = {
        actor_id: cortexId || "local_human",
        payload: { 
            text: note,
            metrics: {
                kp_index: solarData?.kp_index || 0,
                seismic_count: seismicData?.count || 0,
                hrv: vitals.hrv,
                mood: vitals.mood
            }
        },
        parent_ids: parent_ids,
        signature: "TRUSTED_ACTOR_SIG"
      };

      const res = await fetch(`http://localhost:8000/api/v1/core/append/${primitiveType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "API Error");
      }

      setNote("");
      setSelectedParent(null);
      await fetchResonance();
    } catch (err: any) {
      console.error("Commit Failed:", err);
      setError(`Commit Rejected: ${err.message}`);
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
          <p className="text-xs uppercase tracking-[0.4em] text-cortex-cyan/60 animate-pulse font-mono">Initializing Cortex Core...</p>
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
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">CORTEX<span className="text-cortex-cyan">CORE</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-[10px] text-cortex-cyan/40 font-bold uppercase tracking-[0.3em]">Universal Epistemological Ledger</p>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-cortex-cyan/10 border border-cortex-cyan/20 rounded text-[9px] text-cortex-cyan font-mono">
              <span className="w-1 h-1 rounded-full bg-cortex-cyan animate-pulse"></span>
              APPEND ONLY
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
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Actor Identity</p>
                  <p className="text-xs font-mono text-zinc-400">{cortexId}</p>
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
        
        {/* Tactical Log and Ledger Footer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
           
           {/* Central Log and Ledger */}
           <div className="lg:col-span-12 flex flex-col gap-8">
              {/* Manual Input */}
              <div className="relative">
                <div className="absolute -top-4 left-6 px-3 bg-[#0f1417] text-[10px] font-black uppercase text-cortex-cyan tracking-[0.4em] z-10">Cryptographic Commitment payload</div>
                
                {selectedParent && (
                    <div className="absolute top-4 right-6 px-3 py-1 bg-cortex-cyan/10 border border-cortex-cyan/30 rounded-full flex items-center gap-2 text-[10px] font-mono text-cortex-cyan z-20">
                        <Link className="w-3 h-3" />
                        Parent: {selectedParent.type} [{selectedParent.id.slice(0,8)}]
                        <button onClick={() => setSelectedParent(null)} className="ml-2 hover:text-white">x</button>
                    </div>
                )}
                
                <textarea 
                  className="w-full glass rounded-3xl p-6 pt-10 text-white placeholder-zinc-700 focus:outline-none focus:border-cortex-cyan/50 transition-all h-32 text-sm leading-relaxed"
                  placeholder="Record payload text for the chosen primitive..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                ></textarea>
                
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono mr-auto">Append Operation:</div>
                  
                  <button 
                    onClick={() => handleCommit('observation')}
                    disabled={isCommiting}
                    className="flex items-center gap-2 px-4 py-2 bg-cortex-cyan/20 hover:bg-cortex-cyan/40 text-cortex-cyan border border-cortex-cyan/30 rounded-xl transition-all uppercase tracking-[0.1em] text-[10px] disabled:opacity-50"
                  >
                    + Observation
                  </button>
                  <button 
                    onClick={() => handleCommit('evidence')}
                    disabled={isCommiting}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 border border-purple-500/30 rounded-xl transition-all uppercase tracking-[0.1em] text-[10px] disabled:opacity-50"
                  >
                    + Evidence
                  </button>
                  <button 
                    onClick={() => handleCommit('claim')}
                    disabled={isCommiting}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 border border-amber-500/30 rounded-xl transition-all uppercase tracking-[0.1em] text-[10px] disabled:opacity-50"
                  >
                    + Claim
                  </button>
                  <button 
                    onClick={() => handleCommit('decision')}
                    disabled={isCommiting}
                    className="flex items-center gap-2 px-4 py-2 bg-cortex-green/20 hover:bg-cortex-green/40 text-cortex-green border border-cortex-green/30 rounded-xl transition-all uppercase tracking-[0.1em] text-[10px] disabled:opacity-50"
                  >
                    + Decision
                  </button>
                </div>
              </div>

              {/* Integrity Ledger List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4 px-2">
                  <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-600">Reconstructed Timeline</h3>
                  <div className="w-full ml-6 h-px bg-white/5"></div>
                </div>
                
                <AnimatePresence>
                  {ledger.length > 0 ? ledger.map((entry, i) => (
                    <motion.div 
                      key={entry.id || i}
                      onClick={() => setSelectedParent({id: entry.id, type: entry.type, label: entry.payload?.text || 'Record'})}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`glass p-5 rounded-2xl flex justify-between items-center border-l-2 cursor-pointer transition-all hover:bg-white/5 ${
                          selectedParent?.id === entry.id ? 'border-l-rose-500 bg-white/5' :
                          entry.type === 'Observation' ? 'border-l-cortex-cyan' :
                          entry.type === 'Evidence' ? 'border-l-purple-500' :
                          entry.type === 'Claim' ? 'border-l-amber-500' :
                          'border-l-cortex-green'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                           <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${
                                entry.type === 'Observation' ? 'bg-cortex-cyan/20 text-cortex-cyan' :
                                entry.type === 'Evidence' ? 'bg-purple-500/20 text-purple-400' :
                                entry.type === 'Claim' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-cortex-green/20 text-cortex-green'
                           }`}>{entry.type}</span>
                          <p className="text-xs font-bold text-white tracking-tight">
                            {(entry.payload?.text || JSON.stringify(entry.payload)).slice(0, 100)}
                          </p>
                          {entry.parent_ids?.length > 0 && (
                              <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-mono">
                                  <Link className="w-3 h-3" />
                                  Cites: {entry.parent_ids[0].slice(0,6)}...
                              </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                           <span className="text-[9px] text-zinc-600 font-mono uppercase">{new Date(entry.timestamp * 1000).toLocaleString()}</span>
                           <span className="text-[9px] text-zinc-600 font-mono uppercase">By: {entry.actor_id}</span>
                        </div>
                      </div>
                      <div className="text-right ml-6 pl-6 border-l border-white/5">
                        <p className="text-[10px] font-black text-cortex-cyan mb-1 uppercase tracking-tighter">Event Hash</p>
                        <p className="text-[9px] text-zinc-600 font-mono">{entry.id?.slice(0, 12)}...</p>
                      </div>
                    </motion.div>
                  )) : (
                     <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/5">
                        <p className="text-xs text-zinc-600 uppercase tracking-widest italic font-bold">Timeline Empty</p>
                     </div>
                  )}
                </AnimatePresence>
              </div>
           </div>
        </div>
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
                  <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-1">CORE<span className="text-cortex-cyan">INTEGRITY</span></h2>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Universal Ledger Audit</p>
                </div>
                <button onClick={() => setShowIdentity(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <ChevronRight className="w-6 h-6 text-zinc-500" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="p-6 rounded-2xl bg-black/40 border border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                     {integrityStatus?.valid ? <ShieldCheck className="w-5 h-5 text-cortex-cyan" /> : <AlertTriangle className="w-5 h-5 text-rose-500" />}
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#dfe3e7]">Ledger State</h3>
                  </div>
                  <div className="font-mono text-[10px] text-zinc-400 break-all leading-relaxed p-4 bg-black/20 rounded-lg border border-white/5">
                    {integrityStatus?.valid ? "CHAIN VALID" : "COMPROMISED"}
                    <br/><br/>
                    Latest Hash: {integrityStatus?.latest_hash}
                    <br/>
                    Records: {integrityStatus?.chain_length}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Audit Protocol</h3>
                  {[
                    { label: "Architecture", val: "Universal Epistemological Ledger" },
                    { label: "Integrity", val: "SHA-256 Chained Hash" },
                    { label: "Policy", val: "Fail-Closed Invariants" },
                    { label: "State", val: "Deterministic Replay Engine" }
                  ].map((stat, i) => (
                    <div key={i} className="flex justify-between items-center py-3 border-b border-white/5">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">{stat.label}</span>
                      <span className="text-[10px] text-cortex-cyan font-mono uppercase text-right">{stat.val}</span>
                    </div>
                  ))}
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
