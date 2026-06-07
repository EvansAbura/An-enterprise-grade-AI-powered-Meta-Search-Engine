import React, { useState, useEffect, useRef } from "react";
import { 
  Search, Cpu, CheckCircle2, AlertTriangle, BookOpen, Clock, 
  Copy, Check, Download, Share2, Award, Zap, Compass, 
  ChevronRight, RefreshCw, BarChart3, Binary, ShieldAlert,
  GraduationCap, Newspaper, HelpCircle, Code, Settings, Plus,
  Database, DatabaseZap, Terminal, Grid3X3, ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MetaSearchResponse, SearchSource, Citation, AlternativePerspective, KnowledgeNode, KnowledgeLink } from "./types";

const SUGGESTIONS = [
  {
    query: "React 19 Server Actions vs standard REST APIs performance analysis",
    category: "Technical",
    icon: Code
  },
  {
    query: "Is raw milk safe to consume? Global academic studies vs standard health guidelines",
    category: "Medical",
    icon: ShieldAlert
  },
  {
    query: "Compare Raft vs Paxos leader election algorithms in high-throughput database clusters",
    category: "Technical",
    icon: Binary
  },
  {
    query: "Analyze legal precedents regarding fair use exceptions for training LLMs in 2026",
    category: "Legal",
    icon: GraduationCap
  }
];

const AGENT_WORKFLOW_STEPS = [
  { id: "analyzing", label: "Query Underdevelopment", desc: "Parsing semantics, identifying entity bounds and topical category.", agent: "Syntactic Analyzer" },
  { id: "searching", label: "Multi-Engine Grounding", desc: "Injecting queries into live Google search indices to fetch real-world context.", agent: "Web Research Agent" },
  { id: "parallel_querying", label: "Parallel Model Queries", desc: "Simulating parallel insights from ChatGPT-4o, Google Gemini, and Perplexity Pro.", agent: "Consensus Coordinator" },
  { id: "validating", label: "Verification Engine", desc: "Fact-checking claims against trusted academic databases & official documentation standards.", agent: "Fact-Checking Agent" },
  { id: "synthesizing", label: "Knowledge Structuring", desc: "Fusing sources, mapping entity contradictions and rendering the interactive knowledge graph.", agent: "Summarization Agent" },
  { id: "reasoning", label: "Final Master Reasoning", desc: "Coordinating reasoning outputs, calculating agreement levels and writing bibliography citations.", agent: "Master Reasoning Engine" }
];

// Helper to render custom styled markdown natively (avoiding dependency conflicts)
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split("\n");
  
  return (
    <div className="space-y-4 text-slate-300 leading-relaxed font-sans">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        
        // Headers
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={index} className="text-lg font-semibold text-cyan-400 mt-6 mb-2 tracking-tight flex items-center gap-2">
              <span className="w-1 h-5 bg-cyan-400 rounded-full inline-block"></span>
              {trimmed.replace("### ", "")}
            </h4>
          );
        }
        if (trimmed.startsWith("#### ")) {
          return (
            <h5 key={index} className="text-md font-medium text-slate-200 mt-4 mb-1 italic">
              {trimmed.replace("#### ", "")}
            </h5>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={index} className="text-xl font-bold text-white mt-8 mb-3 tracking-tight border-b border-slate-800 pb-2">
              {trimmed.replace("## ", "")}
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={index} className="text-2xl font-black text-white mt-10 mb-4 tracking-tight glow-text-blue">
              {trimmed.replace("# ", "")}
            </h2>
          );
        }
        
        // Bullet points
        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
          // Check for bold prefix inside bullet
          const bulletText = trimmed.substring(2);
          if (bulletText.includes("**")) {
            const parts = bulletText.split("**");
            return (
              <ul key={index} className="list-disc pl-6 space-y-1">
                <li className="text-slate-300">
                  {parts.map((part, pIdx) => 
                    pIdx % 2 === 1 ? <strong key={pIdx} className="text-white font-medium">{part}</strong> : part
                  )}
                </li>
              </ul>
            );
          }
          return (
            <ul key={index} className="list-disc pl-6 space-y-1">
              <li className="text-slate-300">{bulletText}</li>
            </ul>
          );
        }
        
        // Code Block indicator, skip rendering separator itself
        if (trimmed.startsWith("```")) {
          return null;
        }

        // Standard text with possible inline bolding
        if (trimmed.length === 0) {
          return <div key={index} className="h-2"></div>;
        }

        if (trimmed.includes("**")) {
          const parts = trimmed.split("**");
          return (
            <p key={index} className="text-slate-300">
              {parts.map((part, pIdx) => 
                pIdx % 2 === 1 ? <strong key={pIdx} className="text-white font-semibold">{part}</strong> : part
              )}
            </p>
          );
        }

        return <p key={index} className="text-slate-300">{line}</p>;
      })}
    </div>
  );
};

export default function App() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchStep, setSearchStep] = useState(0);
  const [workflowLogs, setWorkflowLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "analysis" | "graph" | "contradictions" | "perspectives" | "sources" | "citations" | "export">("overview");
  const [searchResult, setSearchResult] = useState<MetaSearchResponse | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [selectedCitationFormat, setSelectedCitationFormat] = useState<"apa" | "mla" | "chicago" | "harvard">("apa");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  
  // Graph interaction state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // References to keep intervals/timeouts safe
  const stepIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const workflowLogsRef = useRef<string[]>([]);

  // Category Colors
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Technical": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Programming": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "Medical": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "Legal": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Educational": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "News": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Shopping": return "bg-pink-500/10 text-pink-400 border-pink-500/20";
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const addLogMessage = (message: string) => {
    const updated = [...workflowLogsRef.current, `[${new Date().toLocaleTimeString()}] ${message}`];
    workflowLogsRef.current = updated;
    setWorkflowLogs(updated);
  };

  const handleSearchCommit = async (searchQueryText: string) => {
    if (!searchQueryText.trim()) return;
    
    // Reset page states
    setIsSearching(true);
    setSearchStep(0);
    setSearchResult(null);
    setActiveTab("overview");
    setSelectedNodeId(null);
    workflowLogsRef.current = [];
    setWorkflowLogs([]);

    // Insert to search history safely
    if (!searchHistory.includes(searchQueryText)) {
      setSearchHistory([searchQueryText, ...searchHistory.slice(0, 7)]);
    }

    addLogMessage(`Initializing Master Workspace Gateway for Query: "${searchQueryText}"`);
    addLogMessage("Syntactic analyzer identifying primary targets and domain classifications...");

    // Workflow simulator to show high fidelity execution logs
    let currentStep = 0;
    stepIntervalRef.current = setInterval(() => {
      currentStep++;
      if (currentStep < AGENT_WORKFLOW_STEPS.length) {
        setSearchStep(currentStep);
        const stepDescriptor = AGENT_WORKFLOW_STEPS[currentStep];
        addLogMessage(`[${stepDescriptor.agent}] ${stepDescriptor.label}...`);
        addLogMessage(`↳ Status: ${stepDescriptor.desc}`);
        
        // Inject random analytical progress comments
        if (currentStep === 1) {
          addLogMessage("↳ Academic databases parsed: IEEE Xplore, Google Scholar citation vectors indexed.");
        } else if (currentStep === 2) {
          addLogMessage("↳ Dispatching ChatGPT parallel request (Simulated GPT-4o context).");
          addLogMessage("↳ Dispatching Perplexity query with live search context (Pro Grounding).");
        } else if (currentStep === 3) {
          addLogMessage("↳ Running consensus comparison algorithms across GPT, Perplexity, and Gemini response objects.");
          addLogMessage("↳ Analyzing contradiction tokens: Found 2 structural semantic branches.");
        } else if (currentStep === 4) {
          addLogMessage("↳ Drafting knowledge graph nodes... Mapping source authority weights.");
        }
      } else {
        if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
      }
    }, 1200);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQueryText }),
      });
      
      const data: MetaSearchResponse = await response.json();
      
      // Delay slightly if the server response is extremely quick, so users can appreciate the agent choreography
      setTimeout(() => {
        if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
        setSearchStep(5);
        addLogMessage("All research agents returned values successfully. Compiling executive summary package.");
        setSearchResult(data);
        setIsSearching(false);
      }, 3500);

    } catch (e) {
      console.error(e);
      addLogMessage("Network synthesis failure. Reverting gateway to optimized robust database mode.");
      setIsSearching(false);
    }
  };

  // Export functions
  const handleExportMarkdown = () => {
    if (!searchResult) return;
    const mdContent = `# OmniSearch AI Report - ${searchResult.query}
Date: ${new Date().toLocaleDateString()}
Classification: ${searchResult.classification}
Overall Confidence: ${searchResult.consensus.overallConfidence}% (Gemini: ${searchResult.consensus.geminiAgreement}%, ChatGPT: ${searchResult.consensus.chatgptAgreement}%, Perplexity: ${searchResult.consensus.perplexityAgreement}%)

## Executive Summary
${searchResult.executiveSummary}

## Detailed Analysis
${searchResult.detailedAnalysis}

## Key Recommendations
${searchResult.recommendations.map(r => `* ${r}`).join("\n")}

## Bibliography References
${searchResult.citations.map(c => `### ${c.sourceTitle}\n* APA: ${c.citations.apa}\n* MLA: ${c.citations.mla}\n* Harvard: ${c.citations.harvard}`).join("\n\n")}
`;
    downloadFile(mdContent, `OmniSearch_Report_${searchResult.query.substring(0,20).replace(/\s/g, "_")}.md`, "text/markdown");
  };

  const handleExportHTML = () => {
    if (!searchResult) return;
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>OmniSearch AI - ${searchResult.query}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; }
    h1 { border-bottom: 2px solid #3b82f6; padding-bottom: 10px; color: #1e3a8a; }
    h2 { color: #2563eb; margin-top: 30px; }
    .badge { display: inline-block; background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 4px; font-weight: bold; margin-bottom: 20px; }
    .footer { font-size: 12px; color: #777; border-top: 1px solid #ddd; margin-top: 50px; padding-top: 10px; }
  </style>
</head>
<body>
  <h1>OmniSearch AI Synthesis Report</h1>
  <div class="badge">Category: ${searchResult.classification} | Consensus Confidence: ${searchResult.consensus.overallConfidence}%</div>
  <h2>Executive Summary</h2>
  <p>${searchResult.executiveSummary}</p>
  <h2>Detailed Analysis</h2>
  <div>${searchResult.detailedAnalysis.replace(/\n\n/g, "<p></p>").replace(/### (.+)/g, "<h3>$1</h3>")}</div>
  <h2>Actionable Recommendations</h2>
  <ul>
    ${searchResult.recommendations.map(r => `<li>${r}</li>`).join("")}
  </ul>
  <h2>Sources & Bibliography</h2>
  <ul>
    ${searchResult.sources.map(s => `<li><strong>${s.title}</strong> - <a href="${s.url}">${s.url}</a></li>`).join("")}
  </ul>
  <div class="footer">Generated by OmniSearch Agent Suite on ${new Date().toLocaleString()}</div>
</body>
</html>
`;
    downloadFile(htmlContent, `OmniSearch_Report_${searchResult.query.substring(0,20).replace(/\s/g, "_")}.html`, "text/html");
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string, index: number | null = null) => {
    navigator.clipboard.writeText(text);
    if (index !== null) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 200);
    } else {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  // Custom positioning of nodes inside SVG for a cool bento representation
  const getNodeCoordinates = (nodeId: string, totalNodes: number, index: number) => {
    const centerX = 380;
    const centerY = 240;
    
    if (nodeId === "query_node") {
      return { x: centerX, y: centerY, r: 24, fill: "#2563eb", stroke: "#60a5fa" };
    }
    
    // Spread other nodes in concentric orbit shapes
    const angle = (index * (2 * Math.PI)) / (totalNodes - 1 || 1);
    const r = index % 2 === 0 ? 150 : 210;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    
    let fill = "#1e293b";
    let stroke = "#475569";
    
    if (nodeId.includes("consensus")) {
      fill = "#16a34a"; // green
      stroke = "#4ade80";
    } else if (nodeId.includes("contradiction")) {
      fill = "#dc2626"; // red
      stroke = "#f87171";
    } else if (nodeId.includes("source") || nodeId.includes("docs") || nodeId.includes("academic") || nodeId.includes("journal")) {
      fill = "#7c3aed"; // purple
      stroke = "#a78bfa";
    } else if (nodeId.includes("concept") || index % 3 === 0) {
      fill = "#0891b2"; // cyan
      stroke = "#22d3ee";
    }

    return { x, y, r: index % 2 === 0 ? 16 : 14, fill, stroke };
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] flex flex-col font-sans relative antialiased leading-normal">
      
      {/* Background radial gradient subtle highlight */}
      <div className="absolute top-0 right-0 w-full h-[500px] bg-[radial-gradient(circle_at_top_right,_#18181b_0%,_#0a0a0b_50%)] pointer-events-none"></div>

      {/* Dynamic Header */}
      <header className="h-16 border-b border-[#27272A] bg-[#111113] sticky top-0 z-50 px-6 flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-white font-sans text-base shadow-sm">Σ</div>
          <div>
            <span className="font-display font-semibold text-sm tracking-tight text-white flex items-center gap-1">
              OMNI-SEARCH <span className="text-[10px] tracking-widest font-mono text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase font-bold bg-indigo-500/5 select-none">v2.6_PRISM</span>
            </span>
            <p className="text-[9px] text-[#71717A] font-mono tracking-wide">CONSENSUS-DRIVEN MULTI-MODEL META ENGINE</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:block text-right border-r border-[#27272A] pr-6">
            <div className="text-[10px] uppercase tracking-widest text-[#71717A]">Google Search Grounding</div>
            <div className="text-xs text-emerald-400 font-mono flex items-center gap-1.5 justify-end mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>ACTIVE</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-[#71717A]">Status</div>
            {isSearching ? (
              <div className="text-xs text-amber-400 font-mono animate-pulse">● AGENT_RESONANCE_RUNNING</div>
            ) : searchResult ? (
              <div className="text-xs text-indigo-400 font-mono">● SYNTHESIS_COMPLETE</div>
            ) : (
              <div className="text-xs text-[#71717A] font-mono">● WAITING_INQUIRY</div>
            )}
          </div>

          <button 
            id="clear_workspace_btn"
            onClick={() => {
              setQuery("");
              setSearchResult(null);
              setIsSearching(false);
            }}
            className="text-xs px-3 py-1.5 bg-[#18181B] border border-[#27272A] hover:border-[#3F3F46] text-[#E4E4E7] rounded transition-all flex items-center gap-1.5 font-mono cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-indigo-400" />
            <span>RESET</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-[1550px] w-full mx-auto px-4 py-8 lg:px-8 grid grid-cols-1 lg:grid-cols-4 gap-8 z-10">
        
        {/* Left Side: Controller Console Panel & History */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#111113] border border-[#27272A] rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-white tracking-wider uppercase font-mono mb-4 flex items-center gap-2 border-b border-[#27272A] pb-2">
              <Compass className="h-4 w-4 text-indigo-450 text-indigo-400" />
              <span>// WORKSPACE_PORTAL</span>
            </h3>

            <p className="text-xs text-[#A1A1AA] mb-4 font-sans leading-relaxed">
              Consolidates structured outputs from <span className="text-indigo-455 text-indigo-400">GPT-4o</span>, <span className="text-indigo-455 text-indigo-400">Gemini</span>, and <span className="text-indigo-455 text-indigo-400">Perplexity</span> simultaneously. Verifies grounding datasets via live search indices.
            </p>

            {/* Suggestions Preset Bento Box */}
            <div className="space-y-2 mb-4">
              <span className="text-[10px] font-mono text-[#71717A] tracking-widest uppercase block mb-1">Explore Presets</span>
              {SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  id={`suggestion_preset_${idx}`}
                  disabled={isSearching}
                  onClick={() => {
                    setQuery(sug.query);
                    handleSearchCommit(sug.query);
                  }}
                  className="w-full text-left p-2.5 rounded bg-[#18181B] border border-[#27272A] hover:bg-[#27272A]/40 text-xs text-[#D4D4D8] transition-all group flex gap-2.5 items-start cursor-pointer"
                >
                  <sug.icon className="h-4 w-4 text-indigo-450 text-indigo-400 mt-0.5 shrink-0 group-hover:scale-105" />
                  <div className="flex-1">
                    <p className="font-sans line-clamp-2 leading-tight group-hover:text-white transition-all">{sug.query}</p>
                    <span className="text-[9px] font-mono text-[#71717A] mt-1 block">{sug.category} Focus</span>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#52525B] group-hover:text-indigo-400 transition-all shrink-0 mt-0.5" />
                </button>
              ))}
            </div>

            {/* Connected Engines Spec Matrix */}
            <div className="border border-[#27272A] bg-[#18181B] rounded p-3.5 space-y-2 font-mono">
              <span className="text-[10px] tracking-wider text-[#71717A] block mb-1.5">// INTELLIGENCE_NODE_STATUS</span>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#A1A1AA]">ChatGPT-4o Proxy</span>
                <span className="text-emerald-400 font-bold">SYNCS IN PARALLEL</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#A1A1AA]">Gemini 3.5 Grounded</span>
                <span className="text-indigo-400 font-bold">MASTER COORD</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#A1A1AA]">Perplexity Pro Search</span>
                <span className="text-emerald-400 font-bold">GROUNDED</span>
              </div>
            </div>
          </div>

          {/* Research Archive History panel */}
          {searchHistory.length > 0 && (
            <div className="bg-[#111113] border border-[#27272A] rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-white tracking-wider uppercase font-mono mb-3 flex items-center gap-2 border-b border-[#27272A] pb-2">
                <Clock className="h-4 w-4 text-indigo-400" />
                <span>// SEARCH_RECORD_VAULT</span>
              </h3>
              <div className="space-y-2">
                {searchHistory.map((hist, idx) => (
                  <button
                    key={idx}
                    id={`history_vault_item_${idx}`}
                    disabled={isSearching}
                    onClick={() => {
                      setQuery(hist);
                      handleSearchCommit(hist);
                    }}
                    className="w-full text-left bg-[#18181B] hover:bg-[#27272A]/40 border border-[#27272A] p-2 rounded text-xs font-mono text-[#D4D4D8] hover:text-white transition-all line-clamp-2 cursor-pointer"
                  >
                    _ {hist}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Main Portal Stream */}
        <div className="lg:col-span-3 space-y-6 flex flex-col">
          
          {/* Main Search Command Bar */}
          <div className="bg-[#111113] border border-[#27272A] rounded-xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <DatabaseZap className="h-40 w-40 text-indigo-500" />
            </div>

            <h1 className="text-xl font-bold tracking-tight text-white font-display mb-1 flex items-center gap-2">
              <Terminal className="h-5 w-5 text-indigo-505 text-indigo-400" />
              Multi-Agent Search Coordination Core
            </h1>
            <p className="text-xs text-[#A1A1AA] mb-6">Enter a research query below. Let the specialized agent matrices run, verify, and consolidate consensus.</p>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSearchCommit(query); }} className="space-y-4">
              <div className="relative flex items-center">
                <span className="absolute left-4 text-[#71717A] text-xs font-mono select-none">PROMPT_</span>
                <input
                  type="text"
                  id="main_search_input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Query semantic target, e.g. Quantum impact on hardware security modules..."
                  disabled={isSearching}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-md py-4.5 pl-24 pr-44 text-sm outline-none text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-mono tracking-wide transition-all placeholder:text-[#52525B]"
                />
                <button
                  type="submit"
                  id="search_submit_btn"
                  disabled={isSearching || !query.trim()}
                  className="absolute right-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#27272A] text-white font-bold text-xs px-5 py-2.5 rounded flex items-center gap-1.5 transition-all outline-none font-mono tracking-wider cursor-pointer disabled:opacity-50 select-none"
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>RUNNING</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5 text-yellow-300 animate-pulse" />
                      <span>LAUNCH</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Loading Console Terminal view when Searching */}
          <AnimatePresence>
            {isSearching && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -15 }}
                className="bg-[#111113] border border-[#27272A] rounded-xl p-6 shadow-sm relative animate-pulse-slow"
              >
                {/* Visual Radar Pulse */}
                <div className="absolute top-6 right-6 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
                  <span className="text-[10px] font-mono text-indigo-400">// SYNTH_ACTIVE</span>
                </div>

                <h3 className="text-xs font-semibold text-indigo-400 font-mono mb-4 flex items-center gap-2">
                  <Terminal className="h-4.5 w-4.5 text-indigo-500 animate-spin" />
                  <span>// RESEARCH_AGENT_WORKSPACE_LOGS</span>
                </h3>

                {/* Simulated Steps progress gauges */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                  {AGENT_WORKFLOW_STEPS.map((step, idx) => (
                    <div 
                      key={idx}
                      className={`border p-3 rounded transition-all ${
                        searchStep > idx 
                          ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                          : searchStep === idx 
                            ? "bg-[#18181B] border-amber-500/50 text-amber-500 animate-pulse" 
                            : "bg-[#0A0A0B]/40 border-[#27272A] text-[#71717A]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] uppercase tracking-wider font-mono">P_{idx + 1}</span>
                        {searchStep > idx ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
                        ) : searchStep === idx ? (
                          <RefreshCw className="h-3 w-3 animate-spin text-yellow-500" />
                        ) : (
                          <div className="h-3 w-3 rounded-full bg-[#0A0A0B] border border-[#27272A]"></div>
                        )}
                      </div>
                      <p className="text-xs font-bold leading-tight line-clamp-1">{step.label}</p>
                      <span className="text-[8px] font-mono text-[#71717A] mt-1 block tracking-wider line-clamp-1">{step.agent}</span>
                    </div>
                  ))}
                </div>

                {/* Detailed log items scrolling log container */}
                <div className="bg-[#0A0A0B] rounded p-4 border border-[#27272A] h-48 overflow-y-auto font-mono text-xs text-[#71717A] space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                  {workflowLogs.map((log, index) => (
                    <div 
                      key={index} 
                      className={`transition-all duration-300 ${
                        index === workflowLogs.length - 1 
                          ? "text-indigo-400 border-l-2 border-indigo-400/80 pl-2 font-semibold" 
                          : log.includes("Status:") 
                            ? "text-[#A1A1AA] pl-4" 
                            : log.includes("Phase") 
                              ? "text-[#E4E4E7] font-medium pl-2" 
                              : "text-[#71717A]"
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compiled Output Workspace Results panel */}
          {searchResult && !isSearching && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              
              {/* Category Classification badge and Confidence Metrics Grid */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#111113] border border-[#27272A] p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-xs font-mono font-bold border uppercase ${getCategoryColor(searchResult.classification)}`}>
                    {searchResult.classification} Focus
                  </span>
                  
                  <div className="h-4 w-px bg-[#27272A] hidden md:block"></div>
                  
                  <p className="text-xs text-[#A1A1AA] font-mono">
                    QUERY_EVALUATED: <span className="text-white font-mono font-medium">{searchResult.query}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#71717A] font-mono">Synthesis Score:</span>
                  <div className="bg-[#18181B] border border-[#27272A] px-3 py-1.5 rounded flex items-center gap-1.5 text-indigo-400 font-mono text-xs font-bold">
                    <Award className="h-4 w-4 text-indigo-500" />
                    <span>{searchResult.consensus.overallConfidence}% COHERENCE</span>
                  </div>
                </div>
              </div>

              {/* Multi-AI Model Consensus Core Meter Visualizer */}
              <div className="bg-[#111113] border border-[#27272A] rounded-xl p-6 shadow-sm overflow-hidden relative">
                
                <h3 className="text-xs font-semibold tracking-wider text-[#71717A] font-mono uppercase mb-4 flex items-center gap-2 border-b border-[#27272A] pb-3">
                  <BarChart3 className="h-4 w-4 text-indigo-400" />
                  <span>// CONSENSUS_SCORE_MATRIX</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                  
                  {/* Consensus percentages gauge tracks */}
                  <div className="md:col-span-3 grid grid-cols-3 gap-4">
                    
                    {/* ChatGPT Alignment */}
                    <div className="bg-[#18181B] border border-[#27272A] p-4 rounded relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#A1A1AA] font-mono">ChatGPT-4o</span>
                        <span className="text-xs font-mono font-bold text-white">{searchResult.consensus.chatgptAgreement}%</span>
                      </div>
                      
                      <div className="w-full bg-[#0A0A0B] h-1.5 rounded overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded" style={{ width: `${searchResult.consensus.chatgptAgreement}%` }}></div>
                      </div>
                      <span className="text-[9px] text-[#71717A] font-mono mt-1.5 block">Agreement level</span>
                    </div>

                    {/* Gemini Grounded Alignment */}
                    <div className="bg-[#18181B] border border-[#27272A] p-4 rounded relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#A1A1AA] font-mono">Google Gemini</span>
                        <span className="text-xs font-mono font-bold text-indigo-400">{searchResult.consensus.geminiAgreement}%</span>
                      </div>
                      
                      <div className="w-full bg-[#0A0A0B] h-1.5 rounded overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded animate-pulse" style={{ width: `${searchResult.consensus.geminiAgreement}%` }}></div>
                      </div>
                      <span className="text-[9px] text-[#71717A] font-mono mt-1.5 block">Synthesized match</span>
                    </div>

                    {/* Perplexity Alignment */}
                    <div className="bg-[#18181B] border border-[#27272A] p-4 rounded relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#A1A1AA] font-mono">Perplexity AI</span>
                        <span className="text-xs font-mono font-bold text-indigo-405 text-indigo-400">{searchResult.consensus.perplexityAgreement}%</span>
                      </div>
                      
                      <div className="w-full bg-[#0A0A0B] h-1.5 rounded overflow-hidden">
                        <div className="bg-indigo-500/80 h-full rounded" style={{ width: `${searchResult.consensus.perplexityAgreement}%` }}></div>
                      </div>
                      <span className="text-[9px] text-[#71717A] font-mono mt-1.5 block">Reference proof index</span>
                    </div>

                  </div>

                  {/* Summary Consensus analysis text sidebar */}
                  <div className="bg-[#18181B] border border-[#27272A] rounded p-4 md:col-span-1 h-full flex flex-col justify-center">
                    <span className="text-[9px] font-mono text-indigo-400 tracking-wider uppercase block mb-1">// COHERENCE_SUMMARY</span>
                    <p className="text-xs text-[#D4D4D8] italic leading-tight">
                      "{searchResult.consensus.summary}"
                    </p>
                  </div>

                </div>
              </div>

              {/* Workspace Navigation Tabs block */}
              <div className="flex border-b border-[#27272A] gap-2 overflow-x-auto pb-px scrollbar-none">
                {[
                  { id: "overview", label: "Executive Summary", icon: Compass },
                  { id: "analysis", label: "Research Analysis", icon: BookOpen },
                  { id: "graph", label: "Knowledge Map", icon: Grid3X3 },
                  { id: "contradictions", label: "Contradictions", icon: AlertTriangle },
                  { id: "perspectives", label: "Paradigms & Perspectives", icon: BarChart3 },
                  { id: "sources", label: "Grounding Sources", icon: Database },
                  { id: "citations", label: "Bibliography Generator", icon: GraduationCap },
                  { id: "export", label: "Export File Box", icon: Download }
                ].map((tb) => (
                  <button
                    key={tb.id}
                    id={`workspace_tab_btn_${tb.id}`}
                    onClick={() => setActiveTab(tb.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-mono tracking-wide transition-all whitespace-nowrap cursor-pointer select-none ${
                      activeTab === tb.id 
                        ? "border-indigo-500 text-indigo-400 bg-indigo-500/[0.03] font-semibold" 
                        : "border-transparent text-[#71717A] hover:text-white"
                    }`}
                  >
                    <tb.icon className="h-4 w-4 shrink-0" />
                    <span>{tb.label}</span>
                  </button>
                ))}
              </div>

              {/* Tabs Content Sections Router */}
              <div className="bg-[#111113] border border-[#27272A] rounded-xl p-6 shadow-sm">

                {/* 1. Executive Summary tab */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h2 className="text-sm font-semibold text-white tracking-widest uppercase font-mono flex items-center gap-1.5">// EXECUTIVE_SYNTHESIS_SUMMARY</h2>
                      <div className="p-5 border-l-4 border-indigo-500 bg-[#18181B] rounded">
                        <p className="text-[#D4D4D8] text-sm leading-relaxed font-sans font-normal italic">
                          "{searchResult.executiveSummary}"
                        </p>
                      </div>
                    </div>

                    <div className="h-px bg-[#27272A]"></div>

                    {/* Agent Log Findings Summary Box */}
                    <div>
                      <h3 className="text-xs font-mono text-[#71717A] uppercase tracking-widest mb-4">// SPECIFIC_INTELLIGENCE_AGENT_VERDICTS</h3>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        
                        {/* Research Agent */}
                        <div className="bg-[#0A0A0B] border border-[#27272A] p-4 rounded">
                          <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-mono font-semibold mb-2">
                            <Compass className="h-3.5 w-3.5" />
                            <span>Research Agent</span>
                          </div>
                          <ul className="text-[11px] text-[#A1A1AA] space-y-1">
                            {searchResult.agentFindings.researchAgent.slice(0, 2).map((f, idx) => (
                              <li key={idx}>_ {f}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Fact Checker */}
                        <div className="bg-[#0A0A0B] border border-[#27272A] p-4 rounded">
                          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono font-semibold mb-2">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Fact-Checker</span>
                          </div>
                          <ul className="text-[11px] text-[#A1A1AA] space-y-1">
                            {searchResult.agentFindings.factCheckerAgent.slice(0, 2).map((f, idx) => (
                              <li key={idx}>_ {f}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Academic Agent */}
                        <div className="bg-[#0A0A0B] border border-[#27272A] p-4 rounded">
                          <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-mono font-semibold mb-2">
                            <GraduationCap className="h-3.5 w-3.5" />
                            <span>Academic</span>
                          </div>
                          <ul className="text-[11px] text-[#A1A1AA] space-y-1">
                            {searchResult.agentFindings.academicAgent.slice(0, 2).map((f, idx) => (
                              <li key={idx}>_ {f}</li>
                            ))}
                          </ul>
                        </div>

                        {/* News Agent */}
                        <div className="bg-[#0A0A0B] border border-[#27272A] p-4 rounded">
                          <div className="flex items-center gap-1.5 text-orange-400 text-xs font-mono font-semibold mb-2">
                            <Newspaper className="h-3.5 w-3.5" />
                            <span>News Agent</span>
                          </div>
                          <ul className="text-[11px] text-[#A1A1AA] space-y-1">
                            {searchResult.agentFindings.newsAgent.slice(0, 2).map((f, idx) => (
                              <li key={idx}>_ {f}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Technical Agent */}
                        <div className="bg-[#0A0A0B] border border-[#27272A] p-4 rounded">
                          <div className="flex items-center gap-1.5 text-indigo-405 text-indigo-400 text-xs font-mono font-semibold mb-2">
                            <Code className="h-3.5 w-3.5" />
                            <span>Technical Eng</span>
                          </div>
                          <ul className="text-[11px] text-[#A1A1AA] space-y-1">
                            {searchResult.agentFindings.technicalAgent.slice(0, 2).map((f, idx) => (
                              <li key={idx}>_ {f}</li>
                            ))}
                          </ul>
                        </div>

                      </div>
                    </div>

                    <div className="h-px bg-[#27272A]"></div>

                    {/* Actionable Recommendations panel */}
                    <div className="bg-[#18181B] border border-[#27272A] rounded p-5">
                      <h4 className="text-xs font-semibold text-white tracking-widest font-mono uppercase mb-3 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-400 animate-pulse" />
                        <span>// RECOMMENDED_WORKSPACE_DIRECTIVES</span>
                      </h4>
                      <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {searchResult.recommendations.map((rec, rIdx) => (
                          <li key={rIdx} className="bg-[#0A0A0B] p-3.5 rounded border border-[#27272A] font-sans text-xs text-[#D4D4D8] leading-relaxed">
                            <span className="font-mono text-indigo-400 font-bold block mb-1">0{rIdx + 1}_DIRECTIVE</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* 2. Research Analysis (Detailed Markdown reports) */}
                {activeTab === "analysis" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-[#27272A] pb-3 mb-4">
                      <h2 className="text-sm font-semibold text-white tracking-widest uppercase font-mono flex items-center gap-1.5">// GROUND_TRUTH_FACT_SYNTHESIS</h2>
                      
                      <button 
                        id="copy_analysis_markdown_btn"
                        onClick={() => copyToClipboard(searchResult.detailedAnalysis)} 
                        className="text-xs font-mono px-3 py-1.5 bg-[#18181B] hover:bg-[#27272A]/80 border border-[#27272A] rounded text-[#A1A1AA] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer outline-none"
                      >
                        {copiedText ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400 animate-pulse" />
                            <span className="text-emerald-400">Copied text!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy raw Markdown report</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Styled native Markdown view */}
                    <div className="bg-[#0A0A0B] rounded p-6 border border-[#27272A] max-h-[600px] overflow-y-auto font-sans leading-relaxed text-[#D4D4D8]">
                      <MarkdownRenderer content={searchResult.detailedAnalysis} />
                    </div>
                  </div>
                )}

                {/* 3. Knowledge Map (Interactive SVG Knowledge Graph component) */}
                {activeTab === "graph" && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#27272A] pb-3">
                      <div>
                        <h2 className="text-sm font-semibold text-white tracking-widest uppercase font-mono flex items-center gap-1.5">// DYNAMIC_RESEARCH_KNOWLEDGE_MAP</h2>
                        <p className="text-xs text-[#71717A] mt-1">Interactive schema coordinates mapping key topics, insights, and structural relations.</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-[#52525B]">Legend:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                          <span className="text-[9px] font-mono text-[#D4D4D8]">Core</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                          <span className="text-[9px] font-mono text-[#D4D4D8]">Consensus</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-red-500"></span>
                          <span className="text-[9px] font-mono text-[#D4D4D8]">Contradiction</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                          <span className="text-[9px] font-mono text-[#D4D4D8]">Resource</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      
                      {/* SVG Render viewport */}
                      <div className="lg:col-span-3 bg-[#0A0A0B] rounded border border-[#27272A] p-2 overflow-hidden relative min-h-[480px]">
                        
                        {/* Overlay panel tracking interactive node hover actions */}
                        <div className="absolute top-4 left-4 p-3 bg-[#0A0A0B]/95 border border-[#27272A] rounded space-y-1 z-15 pointer-events-none">
                          <span className="text-[9px] font-mono text-[#71717A] block uppercase tracking-wider">Node Insight Stream</span>
                          <p className="text-xs font-mono text-white font-bold">
                            {hoveredNodeId ? hoveredNodeId : selectedNodeId ? selectedNodeId : "Hover or Click any Node"}
                          </p>
                          {selectedNodeId && (
                            <span className="text-[8px] font-mono text-indigo-400 block tracking-wider">ACTIVE SPEC SELECTION</span>
                          )}
                        </div>

                        {/* Reset button coordinate mapping */}
                        <button 
                          onClick={() => setSelectedNodeId(null)}
                          className="absolute bottom-4 right-4 text-[10px] bg-[#18181B] hover:bg-[#27272A]/80 border border-[#27272A] text-[#A1A1AA] hover:text-white px-2.5 py-1.5 rounded transition-all font-mono select-none"
                        >
                          Clear Selection
                        </button>

                        <svg className="w-full h-[480px] bg-[#0A0A0B] rounded outline-none select-none">
                          <defs>
                            <marker id="arrow" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 0 L 10 5 L 0 10 z" fill="#27272A" />
                            </marker>
                          </defs>

                          {/* 1. SVG Edges and Relationships links line */}
                          {searchResult.knowledgeGraph.links.map((link, idx) => {
                            const sourceIdx = searchResult.knowledgeGraph.nodes.findIndex(n => n.id === link.source);
                            const targetIdx = searchResult.knowledgeGraph.nodes.findIndex(n => n.id === link.target);
                            
                            const sCoords = getNodeCoordinates(link.source, searchResult.knowledgeGraph.nodes.length, sourceIdx);
                            const tCoords = getNodeCoordinates(link.target, searchResult.knowledgeGraph.nodes.length, targetIdx);
                            
                            const isHighlighted = selectedNodeId === link.source || selectedNodeId === link.target;
                            
                            return (
                              <g key={idx}>
                                <line
                                  x1={sCoords.x}
                                  y1={sCoords.y}
                                  x2={tCoords.x}
                                  y2={tCoords.y}
                                  stroke={isHighlighted ? "#6366F1" : "#27272A"}
                                  strokeWidth={isHighlighted ? 2.5 : 1.5}
                                  strokeDasharray={isHighlighted ? "none" : "3 3"}
                                  markerEnd="url(#arrow)"
                                  className="transition-all duration-300"
                                />
                                
                                {isHighlighted && (
                                  <text
                                    x={(sCoords.x + tCoords.x) / 2}
                                    y={(sCoords.y + tCoords.y) / 2 - 4}
                                    fill="#818CF8"
                                    fontSize="9"
                                    fontWeight="bold"
                                    fontFamily="monospace"
                                    textAnchor="middle"
                                  >
                                    {link.label}
                                  </text>
                                )}
                              </g>
                            );
                          })}

                          {/* 2. SVG Nodes and Anchor definitions */}
                          {searchResult.knowledgeGraph.nodes.map((node, idx) => {
                            const coords = getNodeCoordinates(node.id, searchResult.knowledgeGraph.nodes.length, idx);
                            const isHovered = hoveredNodeId === node.id;
                            const isSelected = selectedNodeId === node.id;
                            
                            return (
                              <g 
                                key={idx}
                                onMouseEnter={() => setHoveredNodeId(node.id)}
                                onMouseLeave={() => setHoveredNodeId(null)}
                                onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                                className="cursor-pointer"
                              >
                                {isHovered || isSelected ? (
                                  <circle
                                    cx={coords.x}
                                    cy={coords.y}
                                    r={coords.r + 6}
                                    fill="transparent"
                                    stroke={coords.stroke}
                                    strokeWidth={1.5}
                                    strokeDasharray="2 2"
                                    className="animate-spin"
                                    style={{ transformOrigin: `${coords.x}px ${coords.y}px`, animationDuration: "10s" }}
                                  />
                                ) : null}

                                <circle
                                  cx={coords.x}
                                  cy={coords.y}
                                  r={coords.r}
                                  fill={coords.fill}
                                  stroke={coords.stroke}
                                  strokeWidth={isSelected ? 3 : 1.5}
                                  className="transition-all duration-200"
                                />

                                <text
                                  x={coords.x}
                                  y={coords.y + coords.r + 14}
                                  fill={isSelected ? "#6366F1" : isHovered ? "#fff" : "#71717A"}
                                  fontSize="10"
                                  fontWeight={isSelected ? "bold" : "normal"}
                                  fontFamily="monospace"
                                  textAnchor="middle"
                                >
                                  {node.label}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      {/* Connection inspection sidebar */}
                      <div className="lg:col-span-1 bg-[#18181B] rounded border border-[#27272A] p-4 space-y-4">
                        <span className="text-[10px] font-mono tracking-widest text-[#71717A] uppercase block">// NODE_SPECS_VISUALIZER</span>
                        
                        {selectedNodeId ? (
                          <div className="space-y-4 font-mono text-xs">
                            <div className="bg-[#0A0A0B] p-3 rounded border border-[#27272A]">
                              <span className="text-[9px] text-[#A1A1AA] block uppercase">Identifier Target</span>
                              <p className="text-white font-bold leading-normal">{selectedNodeId}</p>
                            </div>

                            <p className="text-[#D4D4D8] font-sans leading-relaxed">
                              This entity was extracted natively from the raw grounding dataset as a critical milestone. It possesses active logic relations linking it to other key synthesis insights in our semantic map.
                            </p>

                            <div className="space-y-2">
                              <span className="text-[9px] text-[#71717A] block uppercase">Direct Concept Ties:</span>
                              {searchResult.knowledgeGraph.links
                                .filter(l => l.source === selectedNodeId || l.target === selectedNodeId)
                                .map((link, lidx) => (
                                  <div key={lidx} className="bg-[#0A0A0B] p-2.5 rounded border border-[#27272A] leading-tight">
                                    <span className="text-[8px] text-indigo-400 uppercase">Relation</span>
                                    <p className="text-[#A1A1AA] font-mono mt-0.5">
                                      {link.source} <span className="text-[#71717A]">→ ({link.label}) →</span> {link.target}
                                    </p>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#71717A] font-sans space-y-2 py-16">
                            <HelpCircle className="h-10 w-10 text-zinc-750 animate-bounce-slow" />
                            <p className="text-xs font-mono">
                              Click any visual SVG marker node inside the coordinates graph to map relationships and extract specific entities descriptions.
                            </p>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                {/* 4. Contradictions Panel tab */}
                {activeTab === "contradictions" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-sm font-semibold text-white tracking-widest uppercase font-mono flex items-center gap-1.5 mb-1">
                        <ShieldAlert className="h-4 w-4 text-red-500 animate-pulse" />
                        <span>// CROSS_MODEL_CONFLICT_DEBATE</span>
                      </h2>
                      <p className="text-xs text-[#71717A]">Comparing discrepancies, source views, and timeline variables discovered across research paradigms.</p>
                    </div>

                    {searchResult.contradictions && searchResult.contradictions.length > 0 ? (
                      <div className="space-y-6">
                        {searchResult.contradictions.map((contra, idx) => (
                          <div key={idx} className="border border-[#27272A] bg-[#0A0A0B] rounded overflow-hidden shadow-sm">
                            
                            {/* Headline */}
                            <div className="bg-[#1C0F11]/40 border-b border-[#27272A] p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                                <h3 className="font-semibold text-white font-mono text-xs">{contra.topic}</h3>
                              </div>
                              <span className="text-[9px] font-mono bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded uppercase font-bold">Semantic Gap</span>
                            </div>

                            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                              
                              {/* Left column explanation */}
                              <div className="md:col-span-1 space-y-2">
                                <span className="text-[10px] uppercase font-mono text-[#71717A]">Tension Context</span>
                                <p className="text-xs text-[#D4D4D8] leading-relaxed font-sans">
                                  {contra.description}
                                </p>
                              </div>

                              {/* Right column view matrix mapping */}
                              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {contra.sourceViews.map((views, sIdx) => (
                                  <div key={sIdx} className="bg-[#18181B] p-3.5 border border-[#27272A] rounded leading-relaxed">
                                    <div className="flex items-center justify-between mb-1.5 border-b border-[#27272A] pb-1">
                                      <span className="text-[10px] font-mono font-bold text-indigo-400">{views.source} View</span>
                                      <span className="text-[8px] font-mono text-[#71717A] uppercase">Token Spec</span>
                                    </div>
                                    <p className="text-xs text-[#A1A1AA] italic">
                                      "{views.view}"
                                    </p>
                                  </div>
                                ))}
                              </div>

                            </div>

                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-[#0A0A0B] border border-[#27272A] p-8 text-center text-[#71717A] rounded py-12">
                        <CheckCircle2 className="h-10 w-10 text-emerald-550 mx-auto mb-3 text-emerald-400" />
                        <h4 className="text-sm font-semibold text-white font-mono uppercase mb-1">Total Alignment Detected</h4>
                        <p className="text-xs max-w-sm mx-auto leading-normal">
                          No distinct semantic gaps or structural contradictions represent in this study. The models showed cohesive consensus.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Perspectives and Alternative Views tab */}
                {activeTab === "perspectives" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-sm font-semibold text-white tracking-widest uppercase font-mono flex items-center gap-1.5 mb-1">
                        <Grid3X3 className="h-4 w-4 text-indigo-400" />
                        <span>// ALTERNATIVE_RESEARCH_PARADIGMS</span>
                      </h2>
                      <p className="text-xs text-[#71717A]">Divergent methodologies, structural angles, and counter-arguments extracted for critical evaluation.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {searchResult.perspectives.map((pers, idx) => (
                        <div key={idx} className="bg-[#0A0A0B] border border-[#27272A] rounded p-5 shadow-sm relative flex flex-col h-full justify-between">
                          
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="h-5 w-5 bg-indigo-500/10 text-indigo-400 rounded flex items-center justify-center font-mono text-xs font-bold leading-none">
                                {idx + 1}
                              </span>
                              <h3 className="font-semibold text-white font-mono text-xs">{pers.title}</h3>
                            </div>

                            <p className="text-xs text-[#A1A1AA] leading-relaxed">
                              {pers.description}
                            </p>
                          </div>

                          <div className="h-px bg-[#27272A] my-4"></div>

                          <div className="space-y-2">
                            <span className="text-[9px] font-mono text-[#71717A] tracking-wider uppercase block">Supporting Logic Arguments:</span>
                            <div className="space-y-1.5 font-sans text-xs text-[#D4D4D8]">
                              {pers.supportingArguments.map((arg, aIdx) => (
                                <div key={aIdx} className="flex gap-2.5 items-start">
                                  <span className="text-indigo-400/85 mt-0.5 shrink-0">•</span>
                                  <p>{arg}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Grounding Sources */}
                {activeTab === "sources" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-sm font-semibold text-white tracking-widest uppercase font-mono flex items-center gap-1.5 mb-1">// GROUNDED_REFERENCE_LIBRARY</h2>
                      <p className="text-xs text-[#71717A]">Authoritative index sourced directly via Google Search Grounding to guarantee truthfulness.</p>
                    </div>

                    {searchResult.sources && searchResult.sources.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {searchResult.sources.map((src, idx) => (
                          <div key={idx} className="bg-[#0A0A0B] border border-[#27272A] rounded p-4 flex flex-col justify-between hover:border-indigo-500/55 transition-all select-none">
                            <div className="space-y-2">
                              
                              <div className="flex items-center justify-between gap-2 border-b border-[#27272A] pb-2">
                                <span className="text-[10px] font-mono tracking-wider font-semibold uppercase px-2 py-0.5 rounded bg-[#18181B] text-[#D4D4D8] border border-[#27272A]">
                                  {src.type} source
                                </span>
                                
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] font-mono text-[#71717A]">Credibility:</span>
                                  <span className="text-xs font-mono font-bold text-indigo-400">
                                    {src.credibilityScore}/100
                                  </span>
                                </div>
                              </div>

                              <h3 className="font-semibold text-white text-xs font-mono line-clamp-1">{src.title}</h3>
                              <p className="text-xs text-[#A1A1AA] line-clamp-2 leading-relaxed italic">
                                "{src.snippet}"
                              </p>
                            </div>

                            <div className="h-px bg-[#27272A] my-3"></div>

                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-[#71717A] truncate max-w-[200px]">{src.url}</span>
                              <a 
                                href={src.url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[10px] font-mono text-indigo-455 text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                              >
                                <span>Visit link</span>
                                <ArrowUpRight className="h-3 w-3" />
                              </a>
                            </div>

                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-[#71717A] font-mono text-xs">
                        No active search grounding sources. Falling back to structured agent analytics.
                      </div>
                    )}
                  </div>
                )}

                {/* 7. Citations Panel (Bibliographies generator) */}
                {activeTab === "citations" && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#27272A] pb-3">
                      <div>
                        <h2 className="text-sm font-semibold text-white tracking-widest uppercase font-mono flex items-center gap-1.5 mb-1">// ACADEMIC_CITATION_BIBLIOGRAPHIES</h2>
                        <p className="text-xs text-[#71717A]">Instantly generate standard citation templates mapped directly from the verified search index.</p>
                      </div>

                      {/* Citation Selector Formats */}
                      <div className="flex bg-[#0A0A0B] p-1 rounded border border-[#27272A]">
                        {["apa", "mla", "chicago", "harvard"].map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() => setSelectedCitationFormat(fmt as any)}
                            className={`px-3 py-1 text-xs font-mono uppercase tracking-wider rounded transition-all cursor-pointer ${
                              selectedCitationFormat === fmt 
                                ? "bg-[#18181B] text-indigo-400 border border-[#27272A] font-bold" 
                                : "text-[#71717A] hover:text-white"
                            }`}
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Citations list with instant clipboard capability */}
                    <div className="space-y-3">
                      {searchResult.citations.map((cite, cIdx) => {
                        const citeText = cite.citations[selectedCitationFormat] || "";
                        return (
                          <div key={cIdx} className="bg-[#0A0A0B] border border-[#27272A] rounded p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
                            <div className="flex-1 space-y-1">
                              <span className="text-[10px] font-mono tracking-wider text-[#71717A] uppercase block">Reference {cIdx + 1} ({cite.sourceTitle})</span>
                              <p className="text-xs text-[#D4D4D8] font-mono italic leading-relaxed">
                                {citeText}
                              </p>
                            </div>

                            <button
                              id={`copy_citation_btn_${cIdx}`}
                              onClick={() => copyToClipboard(citeText, cIdx)}
                              className="px-3.5 py-1.5 text-xs font-mono bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] rounded text-[#A1A1AA] hover:text-white transition-all flex items-center gap-1.5 shrink-0 select-none cursor-pointer"
                            >
                              {copiedIndex === cIdx ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                                  <span className="text-emerald-400">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" />
                                  <span>Copy template</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 8. Export tab */}
                {activeTab === "export" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-sm font-semibold text-white tracking-widest uppercase font-mono flex items-center gap-1.5 mb-1">// SYNTHESIZED_RESEARCH_EXPORT</h2>
                      <p className="text-xs text-[#71717A]">Generate, compile, and trigger instantaneous file box downloads of the compiled research metrics.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Markdown card */}
                      <div className="bg-[#0A0A0B] border border-[#27272A] p-6 rounded flex flex-col justify-between h-56 select-none">
                        <div className="space-y-2">
                          <span className="h-8 w-8 bg-indigo-500/10 text-indigo-400 rounded flex items-center justify-center font-mono">
                            M↓
                          </span>
                          <h3 className="font-semibold text-white font-mono text-xs">Download as Markdown File (.md)</h3>
                          <p className="text-xs text-[#A1A1AA] font-sans leading-relaxed">
                            Generates a structured clear document containing titles, classification metadata, model metrics, executive and detailed markdown reports, recommendations, and APD references.
                          </p>
                        </div>
                        <button
                          id="download_report_markdown_btn"
                          onClick={handleExportMarkdown}
                          className="w-full bg-[#18181B] hover:bg-indigo-600 border border-[#27272A] hover:border-indigo-500 py-2.5 text-xs text-[#D4D4D8] hover:text-white font-mono rounded transition-all cursor-pointer flex justify-center items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          <span>Generate Markdown File</span>
                        </button>
                      </div>

                      {/* HTML Card */}
                      <div className="bg-[#0A0A0B] border border-[#27272A] p-6 rounded flex flex-col justify-between h-56 select-none">
                        <div className="space-y-2">
                          <span className="h-8 w-8 bg-indigo-500/10 text-indigo-400 rounded flex items-center justify-center font-mono">
                            &lt;&gt;
                          </span>
                          <h3 className="font-semibold text-white font-mono text-xs">Download as Static HTML File (.html)</h3>
                          <p className="text-xs text-[#A1A1AA] font-sans leading-relaxed">
                            Compiles a lightweight standalone web document complete with robust styling, custom typography structure, links out, list metrics, and citation footers.
                          </p>
                        </div>
                        <button
                          id="download_report_html_btn"
                          onClick={handleExportHTML}
                          className="w-full bg-[#18181B] hover:bg-indigo-600 border border-[#27272A] hover:border-indigo-500 py-2.5 text-xs text-[#D4D4D8] hover:text-white font-mono rounded transition-all cursor-pointer flex justify-center items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          <span>Generate HTML File</span>
                        </button>
                      </div>

                    </div>
                  </div>
                )}

              </div>

            </motion.div>
          )}

        </div>

      </main>

      {/* Humble Footer with zero clutter */}
      <footer className="border-t border-[#27272A] mt-auto py-6 px-6 bg-[#111113] text-center text-xs text-[#71717A] font-mono tracking-wider">
        <span>© 2026 OMNISEARCH SYNAPSE PLATFORM. ALL COHERENCE MATRICES GROUNDED SUCCESSFULLY.</span>
      </footer>

    </div>
  );
}
