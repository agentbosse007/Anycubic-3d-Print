import React, { useState, useEffect } from 'react';
import type { FilamentChannel, ModelDefinition, SlicingConfig } from '../types';
import { generateBlenderPythonScript, generateBlenderAddonScript, generateMultiColor3MF, generateMultiStlZip } from '../utils/exportFormats';
import { parseBlenderPythonScript, validateAndOptimizeBlenderScript, generatePromptFromBlenderModel, BlenderValidationResult } from '../utils/aiModelParser';
import type { SupportedLanguage } from '../utils/i18n';
import { TRANSLATIONS } from '../utils/i18n';
import {
  Copy,
  Check,
  Download,
  Code,
  Layers,
  FileArchive,
  Terminal,
  Send,
  ArrowRightLeft,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Play,
  Sparkles,
  Wand2,
  FileCode2
} from 'lucide-react';

interface BlenderBridgePanelProps {
  model: ModelDefinition;
  filaments: FilamentChannel[];
  slicingConfig: SlicingConfig;
  onModelImported?: (model: ModelDefinition) => void;
  lang?: SupportedLanguage;
  onSendPromptToOllama?: (prompt: string) => void;
}

export const BlenderBridgePanel: React.FC<BlenderBridgePanelProps> = ({
  model,
  filaments,
  slicingConfig,
  onModelImported,
  lang = 'sv',
  onSendPromptToOllama,
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.sv;
  const [subTab, setSubTab] = useState<'export' | 'import' | 'live_bridge'>('export');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedBridgeScript, setCopiedBridgeScript] = useState<boolean>(false);
  const [copiedPromptStatus, setCopiedPromptStatus] = useState<boolean>(false);
  const [isExporting3mf, setIsExporting3mf] = useState<boolean>(false);
  const [isExportingStl, setIsExportingStl] = useState<boolean>(false);

  // Script Validation
  const [validationResult, setValidationResult] = useState<BlenderValidationResult | null>(null);

  // Live Blender connection state
  const [blenderStatus, setBlenderStatus] = useState<{
    connected: boolean;
    checking: boolean;
    version?: string;
    message?: string;
  }>({ connected: false, checking: false });

  const [isSendingToBlender, setIsSendingToBlender] = useState<boolean>(false);
  const [sendStatusMessage, setSendStatusMessage] = useState<string | null>(null);

  // Import from Blender state
  const [importScriptText, setImportScriptText] = useState<string>('');
  const [importStatusMessage, setImportStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const pythonScript = generateBlenderPythonScript(model, filaments);
  const addonScript = generateBlenderAddonScript();

  // Check Blender status on mount and when switching to live bridge
  useEffect(() => {
    checkBlenderStatus();
    // Pre-validate current script
    setValidationResult(validateAndOptimizeBlenderScript(pythonScript));
  }, [model, filaments]);

  const handleValidateCurrent = () => {
    const res = validateAndOptimizeBlenderScript(pythonScript);
    setValidationResult(res);
  };

  const handleValidateImported = () => {
    if (!importScriptText.trim()) return;
    const res = validateAndOptimizeBlenderScript(importScriptText);
    setValidationResult(res);
  };

  const handleGenerateOllamaPrompt = () => {
    const generatedPrompt = generatePromptFromBlenderModel(model, lang);
    if (onSendPromptToOllama) {
      onSendPromptToOllama(generatedPrompt);
    }
    navigator.clipboard.writeText(generatedPrompt);
    setCopiedPromptStatus(true);
    setTimeout(() => setCopiedPromptStatus(false), 3000);
  };

  const checkBlenderStatus = async () => {
    setBlenderStatus(prev => ({ ...prev, checking: true }));
    try {
      const res = await fetch('/api/blender/status');
      const data = await res.json();
      setBlenderStatus({
        connected: !!data.connected,
        checking: false,
        version: data.data?.version || '4.x',
        message: data.message,
      });
    } catch (e: any) {
      setBlenderStatus({
        connected: false,
        checking: false,
        message: 'Blender lyssnare inte aktiv på localhost:8008',
      });
    }
  };

  const handleSendToBlender = async () => {
    setIsSendingToBlender(true);
    setSendStatusMessage('Skickar Python-skript direkt till Blender via localhost:8008...');

    try {
      const res = await fetch('/api/blender/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: pythonScript, model }),
      });
      const data = await res.json();

      if (data.success) {
        setSendStatusMessage('✅ Skickat till Blender! 3D-modellen har genererats i din aktiva Blender-scen.');
        setBlenderStatus(prev => ({ ...prev, connected: true }));
      } else {
        setSendStatusMessage('⚠️ Blender svarade inte på localhost:8008. Se fliken "Live-brygga" för 1-klicksstart.');
      }
    } catch (err: any) {
      setSendStatusMessage('⚠️ Kunde inte nå Blender. Kopiera skriptet manuellt eller starta lyssnaren i Blender.');
    } finally {
      setIsSendingToBlender(false);
      setTimeout(() => setSendStatusMessage(null), 5000);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pythonScript);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyBridgeScript = () => {
    navigator.clipboard.writeText(blenderBridgeListenerCode);
    setCopiedBridgeScript(true);
    setTimeout(() => setCopiedBridgeScript(false), 2500);
  };

  const handleDownloadPython = () => {
    const blob = new Blob([pythonScript], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chromaforge_${model.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAddon = () => {
    const blob = new Blob([addonScript], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chromaforge_anycubic_bridge.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload3MF = async () => {
    try {
      setIsExporting3mf(true);
      const blob = await generateMultiColor3MF(model, filaments, slicingConfig);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${model.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_anycubic_multi_color.3mf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating 3MF:', err);
    } finally {
      setIsExporting3mf(false);
    }
  };

  const handleDownloadMultiStl = async () => {
    try {
      setIsExportingStl(true);
      const blob = await generateMultiStlZip(model, filaments);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${model.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_anycubic_stl_bundle.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating STL bundle:', err);
    } finally {
      setIsExportingStl(false);
    }
  };

  // Two-way sync: Parse text pasted from Blender back into ChromaForge!
  const handleParseFromBlender = () => {
    if (!importScriptText.trim()) {
      setImportStatusMessage({
        type: 'error',
        text: 'Klistra in ett Blender Python-skript (bpy) eller konsolutdrag ovan först.',
      });
      return;
    }

    try {
      const parsedModel = parseBlenderPythonScript(importScriptText);
      if (parsedModel && parsedModel.segments.length > 0) {
        if (onModelImported) {
          onModelImported(parsedModel);
        }
        setImportStatusMessage({
          type: 'success',
          text: `Lyckades tolka "${parsedModel.name}" med ${parsedModel.segments.length} komponenter från Blender! Modellen är nu aktiv i 3D-visaren och redo för Anycubic skivning.`,
        });
      } else {
        setImportStatusMessage({
          type: 'error',
          text: 'Kunde inte identifiera Blender-komponenter. Se till att skriptet innehåller "bpy.ops.mesh" eller "# Component X".',
        });
      }
    } catch (e: any) {
      setImportStatusMessage({
        type: 'error',
        text: `Tolkningsfel: ${e.message}`,
      });
    }
  };

  const handleLoadSampleBlenderScript = () => {
    setImportScriptText(pythonScript);
    setImportStatusMessage({
      type: 'success',
      text: 'Exempelskript från aktuell modell laddat i importfältet. Klicka "Tolka & Synka från Blender" för att testa!',
    });
  };

  // Lightweight 1-click Python bridge server to run inside Blender
  const blenderBridgeListenerCode = `# ChromaForge Live HTTP Bridge Server for Blender
# Paste this in Blender's Scripting workspace and click 'Run Script' once!
import bpy, json
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

class ChromaBridgeHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        res = {"status": "ready", "version": bpy.app.version_string, "objects": len(bpy.data.objects)}
        self.wfile.write(json.dumps(res).encode())

    def do_POST(self):
        length = int(self.headers.get('content-length', 0))
        body = json.loads(self.rfile.read(length).decode('utf-8'))
        script_code = body.get('script', '')
        if script_code:
            try:
                import math
                # Execute with complete environment
                exec(script_code, {'__builtins__': __builtins__, 'bpy': bpy, 'math': math})
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "objects": len(bpy.data.objects)}).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())

def start_chroma_bridge():
    server = HTTPServer(('localhost', 8008), ChromaBridgeHandler)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    print(">>> ChromaForge Blender Bridge ACTIVE on http://localhost:8008")

start_chroma_bridge()`;

  return (
    <div className="flex flex-col gap-3.5 text-xs">
      {/* Header and Quick Action Exporters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <span>Blender Bridge & Anycubic Exporter</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40">
              Tvåvägssynk (bpy)
            </span>
          </h2>
          <p className="text-slate-400 text-[11px] mt-0.5">
            Överför text och geometri till och från Blender (bpy) med automatisk validering och multi-material 3MF / STL.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 3MF Export Button */}
          <button
            onClick={handleDownload3MF}
            disabled={isExporting3mf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white rounded-lg font-semibold transition-colors shadow-sm whitespace-nowrap cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isExporting3mf ? 'Packar 3MF...' : 'Exportera Anycubic .3MF'}</span>
          </button>

          {/* Multi-STL ZIP Button */}
          <button
            onClick={handleDownloadMultiStl}
            disabled={isExportingStl}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 text-slate-200 rounded-lg font-semibold border border-slate-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            <FileArchive className="w-3.5 h-3.5 text-amber-400" />
            <span>{isExportingStl ? 'Buntar...' : 'STL-arkiv (.zip)'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs: Text till Blender vs Text från Blender vs Live-brygga */}
      <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
        <button
          onClick={() => setSubTab('export')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
            subTab === 'export'
              ? 'bg-slate-800 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Text till Blender</span>
        </button>

        <button
          onClick={() => setSubTab('import')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
            subTab === 'import'
              ? 'bg-slate-800 text-amber-300 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Text från Blender</span>
        </button>

        <button
          onClick={() => setSubTab('live_bridge')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
            subTab === 'live_bridge'
              ? 'bg-slate-800 text-emerald-300 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Live-brygga (Port 8008)</span>
        </button>
      </div>

      {/* TAB 1: TEXT TILL BLENDER (EXPORT & EXECUTE) */}
      {subTab === 'export' && (
        <div className="flex flex-col gap-3">
          {/* Live Blender status bar & 1-Click Send Button */}
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${blenderStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-slate-300 font-medium">Blender-status:</span>
              <span className={`font-mono font-bold ${blenderStatus.connected ? 'text-emerald-300' : 'text-slate-400'}`}>
                {blenderStatus.connected ? `ANSLUTEN (localhost:8008 - Blender ${blenderStatus.version})` : 'Ej ansluten till port 8008'}
              </span>
              <button
                onClick={checkBlenderStatus}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title="Uppdatera anslutningsstatus"
              >
                <RefreshCw className={`w-3 h-3 ${blenderStatus.checking ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <button
              onClick={handleSendToBlender}
              disabled={isSendingToBlender}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold rounded-lg transition-all shadow-sm cursor-pointer"
              title="Kör skriptet direkt i Blender via lokal socket"
            >
              {isSendingToBlender ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isSendingToBlender ? 'Skickar...' : 'Kör i Blender (1-Klick)'}</span>
            </button>
          </div>

          {sendStatusMessage && (
            <div className="p-2 bg-slate-900 border border-cyan-500/50 rounded-lg text-cyan-300 text-[11px] animate-pulse">
              {sendStatusMessage}
            </div>
          )}

          {/* Validation & Actions Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleValidateCurrent}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-cyan-300 font-medium rounded-lg transition-colors cursor-pointer border border-cyan-500/30"
                title="Validera syntax, enheter och kompatibilitet för Blender och Anycubic"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t.validateScriptBtn || 'Validera & Optimera skript'}</span>
              </button>

              <button
                onClick={handleGenerateOllamaPrompt}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-cyan-600/30 to-emerald-600/30 hover:from-cyan-600/40 hover:to-emerald-600/40 text-emerald-300 font-medium rounded-lg transition-colors cursor-pointer border border-emerald-500/40"
                title="Skapa en precis prompt från modellen och skicka till Ollama-fältet"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.generatePromptBtn || 'Skapa Ollama-prompt från Blender'}</span>
              </button>
            </div>

            {copiedPromptStatus && (
              <span className="text-[11px] text-emerald-400 font-mono animate-pulse flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>{t.copiedPrompt || 'Prompt kopierad & skickad till Ollama!'}</span>
              </span>
            )}
          </div>

          {/* Validation & Quality Checklist Card */}
          {validationResult && (
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Kvalitetspoäng: {validationResult.score}/100
                  </span>
                  <span className="text-slate-300 font-semibold">{validationResult.compatibility}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {validationResult.componentCount} delar · Slots: {validationResult.assignedSlots.join(', ')}
                </span>
              </div>

              {validationResult.issues.length > 0 && (
                <div className="flex flex-col gap-1 pt-1">
                  {validationResult.issues.map((iss, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-red-400 text-[11px]">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{iss}</span>
                    </div>
                  ))}
                </div>
              )}

              {validationResult.optimizations.length > 0 && (
                <div className="flex flex-col gap-1 pt-1">
                  {validationResult.optimizations.map((opt, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <CheckCircle className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Blender Python Script Code Viewer */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="bg-slate-900/90 px-3 py-2 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono text-[11px] text-slate-300 font-medium">
                  chromaforge_{model.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.py
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  ({model.segments.length} komponenter)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded transition-colors cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Kopierat!' : 'Kopiera kod'}</span>
                </button>

                <button
                  onClick={handleDownloadPython}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded transition-colors cursor-pointer"
                  title="Ladda ner Python-fil"
                >
                  <Download className="w-3 h-3" />
                  <span>Ladda ner .py</span>
                </button>
              </div>
            </div>

            {/* Script Content */}
            <pre className="p-3 text-[11px] font-mono text-slate-300 bg-slate-950 overflow-x-auto max-h-56 leading-relaxed select-all">
              {pythonScript}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 2: TEXT FRÅN BLENDER (IMPORT & SYNCHRONIZE) */}
      {subTab === 'import' && (
        <div className="flex flex-col gap-3">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Importera & Synka från Blender:</span>
              <button
                onClick={handleLoadSampleBlenderScript}
                className="text-cyan-400 hover:text-cyan-300 text-[11px] underline cursor-pointer"
              >
                Fyll i exempelkod
              </button>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Modifierat ett objekt i Blender? Klistra in ditt Python-skript eller Blender-utdrag här nedan. Motorn tolkar automatiskt alla delar, positioner, former och färgkanaler för Anycubic Kobra!
            </p>

            <textarea
              value={importScriptText}
              onChange={e => setImportScriptText(e.target.value)}
              placeholder="Klistra in Blender bpy-skript eller text från Blender här (t.ex. '# Component 1: Vinge (Filament Slot 4)...')..."
              className="w-full h-44 bg-slate-950 text-slate-200 font-mono text-[11px] p-3 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 leading-relaxed"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-slate-500 text-[10px] font-mono">
                {importScriptText.length} tecken · {importScriptText.split('\n').length} rader
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleValidateImported}
                  disabled={!importScriptText.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-300 font-semibold rounded-lg transition-colors cursor-pointer border border-cyan-500/30"
                  title="Validera den klistrade koden innan import"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Validera</span>
                </button>

                <button
                  onClick={handleParseFromBlender}
                  disabled={!importScriptText.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Tolka & Synka till 3D-visaren</span>
                </button>
              </div>
            </div>
          </div>

          {importStatusMessage && (
            <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
              importStatusMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                : 'bg-red-950/60 border-red-500/50 text-red-200'
            }`}>
              {importStatusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{importStatusMessage.text}</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LIVE BLENDER BRYGGA (SERVER SETUP) */}
      {subTab === 'live_bridge' && (
        <div className="flex flex-col gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white">Starta 1-Klicks Live-brygga i Blender:</span>
              </div>
              <button
                onClick={handleCopyBridgeScript}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded transition-colors cursor-pointer"
              >
                {copiedBridgeScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedBridgeScript ? 'Kopierat!' : 'Kopiera brygg-kod'}</span>
              </button>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed">
              Kör denna lilla kodsnutt i Blenders "Scripting"-flik en gång. Därefter kan du skicka ändringar fram och tillbaka mellan webbläsaren och Blender med ett enda klick!
            </p>

            <pre className="p-3 text-[11px] font-mono text-emerald-300 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto max-h-56 select-all">
              {blenderBridgeListenerCode}
            </pre>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">Lyssnar på: <code className="text-cyan-400 font-mono">http://localhost:8008</code></span>
              <button
                onClick={checkBlenderStatus}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${blenderStatus.checking ? 'animate-spin' : ''}`} />
                <span>Testa anslutning nu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
