
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Search, Volume2, Loader2, ExternalLink, RefreshCw, X, Play, Square, Globe, BrainCircuit, AudioWaveform as Waveform, Sparkles, ChevronRight } from 'lucide-react';
import { GeminiService } from './services/geminiService';
import { AppStatus, SearchResponse } from './types';
import { decodeBase64, decodeAudioData } from './services/audio';
import { Visualizer } from './components/Visualizer';

const gemini = new GeminiService();

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [playbackFinished, setPlaybackFinished] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const stopAudio = useCallback(() => {
    if (currentSourceRef.current) {
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }
    if (status === AppStatus.PLAYING) setStatus(AppStatus.IDLE);
  }, [status]);

  const performSearchFlow = async (searchQuery: string) => {
    setError(null);
    setPlaybackFinished(false);
    
    try {
      setStatus(AppStatus.ANALYZING);
      addLog(`Analyzing request: "${searchQuery}"`);
      
      await new Promise(r => setTimeout(r, 600));
      setStatus(AppStatus.SEARCHING);
      addLog(`Consulting Google Search for real-time information...`);
      
      const searchRes = await gemini.searchAndSummarize(searchQuery);
      addLog(`Found ${searchRes.sources.length} relevant sources.`);
      addLog(`Model used search term: "${searchRes.actualQuery}"`);
      
      setStatus(AppStatus.SYNTHESIZING);
      addLog(`Synthesizing search results into concise summary...`);
      setResults(searchRes);

      setStatus(AppStatus.GENERATING_AUDIO);
      addLog(`Converting summary to speech using Gemini TTS...`);
      const audioBase64 = await gemini.generateSpeech(searchRes.summary);

      setStatus(AppStatus.PLAYING);
      addLog(`Playing audio summary.`);
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const audioBuffer = await decodeAudioData(
        decodeBase64(audioBase64),
        audioContextRef.current,
        24000,
        1
      );

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        setStatus(AppStatus.IDLE);
        currentSourceRef.current = null;
        setPlaybackFinished(true);
        addLog(`Playback finished.`);
      };

      currentSourceRef.current = source;
      source.start();

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Search failed. Please try again.');
      setStatus(AppStatus.ERROR);
      addLog(`Error: ${err.message}`);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || (status !== AppStatus.IDLE && status !== AppStatus.ERROR)) return;
    
    setResults(null);
    setLogs([]);
    stopAudio();
    await performSearchFlow(query);
  };

  const handleFindMore = async () => {
    if (!results) return;
    
    const original = query;
    const currentSummary = results.summary;
    
    setStatus(AppStatus.ANALYZING);
    addLog("Generating a deeper research query...");
    
    try {
      const deeperQuery = await gemini.refineQuery(original, currentSummary);
      setQuery(deeperQuery);
      addLog(`New exploration path: "${deeperQuery}"`);
      await performSearchFlow(deeperQuery);
    } catch (err: any) {
      setError("Failed to generate a deeper query.");
      setStatus(AppStatus.ERROR);
    }
  };

  const isSearching = status !== AppStatus.IDLE && status !== AppStatus.PLAYING && status !== AppStatus.ERROR;

  return (
    <div className="min-h-screen flex flex-col items-center dark:bg-[#202124] bg-white transition-colors duration-300">
      {/* Search Header / Top Bar */}
      <div className={`w-full flex flex-col items-center transition-all duration-700 ease-in-out ${results ? 'pt-6 pb-6 border-b border-[#3c4043] bg-[#202124] sticky top-0 z-50' : 'pt-[15vh] pb-8'}`}>
        <div className={`flex items-center gap-6 w-full max-w-4xl px-4 md:px-8`}>
          <div className={`flex items-baseline gap-1 transition-all ${results ? 'scale-75 origin-left' : 'hidden'}`}>
            <span className="text-3xl font-bold tracking-tight text-[#4285F4]">G</span>
            <span className="text-3xl font-bold tracking-tight text-[#EA4335]">e</span>
            <span className="text-3xl font-bold tracking-tight text-[#FBBC05]">m</span>
            <span className="text-3xl font-bold tracking-tight text-[#4285F4]">i</span>
            <span className="text-3xl font-bold tracking-tight text-[#34A853]">n</span>
            <span className="text-3xl font-bold tracking-tight text-[#EA4335]">i</span>
          </div>

          {!results && (
            <div className="flex flex-col items-center gap-2 mb-8 w-full">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl md:text-6xl font-bold tracking-tight text-[#4285F4]">G</span>
                <span className="text-4xl md:text-6xl font-bold tracking-tight text-[#EA4335]">e</span>
                <span className="text-4xl md:text-6xl font-bold tracking-tight text-[#FBBC05]">m</span>
                <span className="text-4xl md:text-6xl font-bold tracking-tight text-[#4285F4]">i</span>
                <span className="text-4xl md:text-6xl font-bold tracking-tight text-[#34A853]">n</span>
                <span className="text-4xl md:text-6xl font-bold tracking-tight text-[#EA4335]">i</span>
                <span className="ml-2 px-2 py-0.5 rounded bg-blue-600 text-white text-xs font-bold uppercase self-center">Sonic</span>
              </div>
              <p className="text-sm text-slate-400 font-medium flex items-center gap-2">
                Powered by Gemini TTS & Search Grounding
              </p>
            </div>
          )}

          <div className={`flex-1 transition-all duration-500`}>
            <form onSubmit={handleSearch} className="relative w-full group">
              <div className={`relative flex items-center bg-[#303134] border border-[#5f6368] rounded-full px-5 py-2.5 search-shadow transition-all group-focus-within:border-transparent group-focus-within:bg-[#3c4043]`}>
                <Search className="w-4 h-4 text-[#9aa0a6] mr-3" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask anything..."
                  disabled={isSearching}
                  className="flex-1 bg-transparent outline-none text-white text-base placeholder:text-[#9aa0a6]"
                />
                {query && !isSearching && (
                  <button type="button" onClick={() => setQuery('')} className="p-1 hover:bg-[#5f6368]/20 rounded-full">
                    <X className="w-4 h-4 text-[#9aa0a6]" />
                  </button>
                )}
                {isSearching && <Loader2 className="w-4 h-4 text-blue-400 animate-spin ml-2" />}
              </div>
            </form>
          </div>
        </div>
      </div>

      <main className="w-full max-w-4xl px-4 md:px-8 mt-8 flex flex-col gap-10 animate-in fade-in duration-500 pb-20">
        
        {!results && !isSearching && !error && (
          <div className="flex justify-center gap-3">
            <button onClick={() => handleSearch()} className="bg-[#303134] text-[#e8eaed] px-4 py-2 rounded border border-transparent hover:border-[#5f6368] hover:bg-[#3c4043] transition-all text-sm">
              Gemini Search
            </button>
            <button type="button" onClick={() => { setQuery('What is the weather in Tokyo?'); }} className="bg-[#303134] text-[#e8eaed] px-4 py-2 rounded border border-transparent hover:border-[#5f6368] hover:bg-[#3c4043] transition-all text-sm">
              I'm Feeling Lucky
            </button>
          </div>
        )}

        {/* 1. Grounding Sources */}
        {results && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            <h3 className="text-sm font-bold text-[#9aa0a6] uppercase tracking-wider mb-6 px-1 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Grounding Sources
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.sources.map((source, i) => (
                <a
                  key={i}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-1 p-5 rounded-2xl bg-[#202124] border border-[#3c4043] hover:border-[#5f6368] transition-all hover:bg-[#303134]"
                >
                  <div className="text-xs text-[#9aa0a6] truncate mb-1 flex items-center gap-1">
                    {new URL(source.uri).hostname}
                    <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[#8ab4f8] text-lg font-medium group-hover:underline truncate">
                    {source.title}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 2. Audio Summary Card */}
        {results && (
          <div className="bg-[#303134] rounded-3xl p-6 md:p-10 border border-[#3c4043] shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${status === AppStatus.PLAYING ? 'bg-blue-600 animate-pulse' : 'bg-[#202124]'}`}>
                  <Waveform className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-medium text-white">Audio Summary</h2>
                  <p className="text-sm text-[#9aa0a6]">Generative Insight powered by Gemini TTS</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {status === AppStatus.PLAYING ? (
                  <button onClick={stopAudio} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full font-bold transition-all shadow-lg active:scale-95">
                    <Square className="w-4 h-4 fill-current" /> Stop
                  </button>
                ) : (
                  <button onClick={() => performSearchFlow(query)} disabled={isSearching} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50">
                    <Play className="w-4 h-4 fill-current" /> Replay
                  </button>
                )}
              </div>
            </div>

            <div className="mb-8">
               <Visualizer isActive={status === AppStatus.PLAYING} />
            </div>

            <p className="text-xl md:text-2xl text-[#e8eaed] leading-relaxed font-light text-center">
              "{results.summary}"
            </p>
          </div>
        )}

        {/* 3. Live Activity Log */}
        {(logs.length > 0 || isSearching) && (
          <div className="bg-[#171717] border border-[#303134] rounded-2xl p-6 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="flex items-center gap-2 mb-4 text-xs font-bold text-[#9aa0a6] uppercase tracking-wider">
               <BrainCircuit className="w-4 h-4 text-blue-400" />
               Live Activity Log
             </div>
             <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
               {logs.map((log, i) => (
                 <div key={i} className="text-sm text-slate-400 flex items-start gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                   <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500/50 shrink-0" />
                   {log}
                 </div>
               ))}
               {isSearching && (
                 <div className="text-sm text-blue-400 flex items-center gap-3">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing next step...
                 </div>
               )}
               <div ref={logsEndRef} />
             </div>
          </div>
        )}

        {/* 4. Find More Button */}
        {playbackFinished && results && status === AppStatus.IDLE && (
          <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-4 duration-700">
            <div className="text-xs text-[#9aa0a6] font-bold uppercase tracking-[0.2em] mb-2">Continue Exploration</div>
            <button 
              onClick={handleFindMore}
              className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl shadow-blue-900/20 active:scale-95 transition-all group"
            >
              <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
              Dive Deeper into Topic
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-xs text-slate-500 italic max-w-xs text-center">
              Gemini will generate a new, more detailed search prompt to expand your knowledge.
            </p>
          </div>
        )}

        {error && (
          <div className="p-6 bg-red-900/10 border border-red-500/20 rounded-2xl text-red-400 flex items-center gap-4">
            <X className="w-6 h-6 shrink-0" />
            <div className="flex-1">
              <p className="font-bold">Execution Error</p>
              <p className="text-sm opacity-80">{error}</p>
            </div>
            <button onClick={() => performSearchFlow(query)} className="p-2 hover:bg-red-500/10 rounded-lg">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        )}

        {!results && !isSearching && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-[#9aa0a6]">
            <div className="w-20 h-20 rounded-full bg-[#303134] flex items-center justify-center mb-4 border border-[#3c4043]">
              <Search className="w-8 h-8 opacity-40" />
            </div>
            <p className="text-center max-w-xs text-sm">
              Search for anything and Gemini will scour the web to synthesize an audio response for you.
            </p>
          </div>
        )}
      </main>

      <footer className="w-full bg-[#171717] border-t border-[#303134] py-4 mt-auto">
         <div className="max-w-4xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[#9aa0a6] text-sm">
            <div className="flex gap-6">
              <span className="hover:text-white cursor-pointer">About</span>
              <span className="hover:text-white cursor-pointer">Advertising</span>
              <span className="hover:text-white cursor-pointer">Business</span>
            </div>
            <div className="flex gap-6">
              <span className="hover:text-white cursor-pointer">Privacy</span>
              <span className="hover:text-white cursor-pointer">Terms</span>
              <span className="hover:text-white cursor-pointer">Settings</span>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default App;
