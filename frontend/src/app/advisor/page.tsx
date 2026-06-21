"use client";

import React, { useState, useEffect, useRef } from "react";
import Shell from "@/components/layout/Shell";
import api from "@/services/api";

import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Loader2, 
  AlertCircle,
  Info,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Phone,
  PhoneOff,
  Volume1,
  Settings
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello! I am your AI Financial Advisor. I have analyzed your profile metrics and eligible loan options. How can I help you optimize your debt, understand interest expenses, or plan your repayments today?`
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileExists, setProfileExists] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice Agent State
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoRead, setAutoRead] = useState(false);
  const [activeVoiceIndex, setActiveVoiceIndex] = useState<number>(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
  
  // Immersive Call Mode State
  const [inCall, setInCall] = useState(false);
  const [callState, setCallState] = useState<"idle" | "listening" | "thinking" | "speaking" | "muted">("idle");
  const [callMicMuted, setCallMicMuted] = useState(false);
  const [callTranscript, setCallTranscript] = useState<{ user?: string; bot?: string }>({});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech APIs
  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition && window.speechSynthesis) {
        setTimeout(() => {
          setSpeechSupported(true);
        }, 0);
        
        // Initialize Speech Recognition
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-IN"; // Target English (Indian accent) by default
        recognitionRef.current = rec;

        // Load voices
        const loadVoices = () => {
          const availableVoices = window.speechSynthesis.getVoices();
          const englishVoices = availableVoices.filter(v => v.lang.startsWith("en"));
          setVoices(englishVoices.length > 0 ? englishVoices : availableVoices);
        };

        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = loadVoices;
        }
      }
    }
  }, []);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Speak a specific string of text
  const speakText = (text: string, messageIndex: number | null = null) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // Stop any active speech
    
    if (speakingMessageId === messageIndex && messageIndex !== null) {
      setSpeakingMessageId(null);
      if (inCall) setCallState("idle");
      return;
    }

    const cleanText = text.replace(/[*#`_\-]/g, ""); // strip markdown
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    if (voices.length > 0 && voices[activeVoiceIndex]) {
      utterance.voice = voices[activeVoiceIndex];
    }
    
    utterance.onend = () => {
      setSpeakingMessageId(null);
      if (inCall) {
        if (!callMicMuted) {
          startCallListening();
        } else {
          setCallState("muted");
        }
      }
    };

    utterance.onerror = () => {
      setSpeakingMessageId(null);
      if (inCall) setCallState("idle");
    };

    if (messageIndex !== null) {
      setSpeakingMessageId(messageIndex);
    }
    
    if (inCall) {
      setCallState("speaking");
    }

    window.speechSynthesis.speak(utterance);
  };

  // Toggle speech-to-text dictation on standard chat input
  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? prev + " " + transcript : transcript));
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognitionRef.current.onerror = (event: any) => {
        console.warn("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("Failed to start SpeechRecognition:", err);
      }
    }
  };

  // Toggle Global Auto-Read
  const toggleAutoRead = () => {
    if (autoRead) {
      setAutoRead(false);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      }
    } else {
      setAutoRead(true);
    }
  };

  // Voice Call logic
  const startCall = () => {
    setInCall(true);
    setCallMicMuted(false);
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    const greeting = "Hello, I am your voice advisor. How can I help you optimize your debt and repayments today?";
    setCallTranscript({ bot: greeting });
    
    setTimeout(() => {
      speakText(greeting);
    }, 300);
  };

  const endCall = () => {
    setInCall(false);
    setCallState("idle");
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const toggleCallMic = () => {
    if (callMicMuted) {
      setCallMicMuted(false);
      startCallListening();
    } else {
      setCallMicMuted(true);
      setCallState("muted");
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  // In-Call listening loop
  const startCallListening = () => {
    if (!recognitionRef.current || !inCall) return;
    
    setCallState("listening");
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognitionRef.current.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (!transcript.trim()) return;

      setCallTranscript((prev) => ({ ...prev, user: transcript }));
      setCallState("thinking");

      try {
        const userMsg = { role: "user" as const, content: transcript };
        setMessages((prev) => [...prev, userMsg]);
        
        const response = await api.post<{ answer: string }>("/matching/chat", {
          messages: [...messages, userMsg].slice(0, -1),
          question: transcript
        });
        
        const botResponse = response.data.answer;
        setMessages((prev) => [
          ...prev,
          { role: "assistant" as const, content: botResponse }
        ]);

        setCallTranscript({ user: transcript, bot: botResponse });
        speakText(botResponse);
      } catch (err) {
        console.warn(err);
        const errMsg = "Sorry, I encountered an issue. Please try again.";
        setCallTranscript({ user: transcript, bot: errMsg });
        speakText(errMsg);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognitionRef.current.onerror = (event: any) => {
      console.warn("Call speech error", event.error);
      if (event.error === "no-speech") {
        if (!callMicMuted && inCall) {
          startCallListening();
        }
      } else {
        setCallState("idle");
      }
    };

    recognitionRef.current.onend = () => {
      setCallState((prev) => (prev === "listening" ? "idle" : prev));
    };

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.warn("Failed to start Call SpeechRecognition:", err);
    }
  };

  // Check if profile exists
  useEffect(() => {
    const checkProfile = async () => {
      try {
        await api.get("/profile");
        setProfileExists(true);
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (err.response?.status === 404) {
          setProfileExists(false);
        }
      }
    };
    checkProfile();
  }, []);

  // Auto-scroll to the bottom of the chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const newMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await api.post<{ answer: string }>("/matching/chat", {
        messages: newMessages.slice(0, -1), // Send previous messages
        question: text
      });
      
      const botResponse = response.data.answer;
      setMessages((prev) => [
        ...prev,
        { role: "assistant" as const, content: botResponse }
      ]);

      if (autoRead) {
        speakText(botResponse, newMessages.length);
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.warn(err);
      const errMsg = "Sorry, I encountered an issue processing your query. Please make sure your financial profile is filled out and try again.";
      setMessages((prev) => [
        ...prev,
        { 
          role: "assistant" as const, 
          content: errMsg 
        }
      ]);
      if (autoRead) {
        speakText(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  const suggestions = [
    "How can I improve my CIBIL score?",
    "What is my Debt-to-Income (DTI) ratio?",
    "How does tenure affect my total interest?",
    "What options do I have for refinancing?"
  ];

  if (!profileExists) {
    return (
      <Shell>
        <div className="max-w-2xl mx-auto text-center py-16 flex flex-col items-center">
          <div className="flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl border border-slate-800 text-indigo-400 mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Advisory Not Available</h1>
          <p className="mt-3 text-slate-400 max-w-md leading-relaxed">
            Please complete your Financial Profile intake form first. 
            Once completed, the AI Financial Advisor will customize advice based on your exact credit profile and matched loan options.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border border-slate-850 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">AI Financial Advisor</h1>
              <p className="text-xs text-slate-400">Powered by Gemini • Personalized Advice</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Voice select */}
            {speechSupported && voices.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-2.5 py-1.5 text-xs">
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={activeVoiceIndex}
                  onChange={(e) => setActiveVoiceIndex(parseInt(e.target.value))}
                  className="bg-transparent border-none focus:outline-none text-slate-200 text-xs cursor-pointer max-w-[80px]"
                  title="Select AI Voice"
                >
                  {voices.map((voice, idx) => (
                    <option key={idx} value={idx} className="bg-slate-900 text-slate-200 text-xs">
                      {voice.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Auto Read Toggle */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleAutoRead}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  autoRead
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-lg shadow-indigo-600/10"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
                title={autoRead ? "Mute auto-read responses" : "Auto-read responses (TTS)"}
              >
                {autoRead ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            )}

            {/* Voice Call Button */}
            {speechSupported && (
              <button
                type="button"
                onClick={startCall}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/15 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                title="Start Voice Call Session"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Voice Call</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 border border-slate-700">
              <Info className="w-3.5 h-3.5" />
              <span>Context: Active Financial Profile</span>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-slate-950 border-x border-slate-850 flex flex-col">
          {messages.map((msg, index) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={index}
                className={`flex w-full items-start gap-4 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="flex flex-col gap-1.5 items-center flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white">
                      <Bot className="w-4 h-4" />
                    </div>
                    {speechSupported && (
                      <button
                        type="button"
                        onClick={() => speakText(msg.content, index)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          speakingMessageId === index
                            ? "bg-indigo-600 border-indigo-500 text-white animate-pulse"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                        }`}
                        title={speakingMessageId === index ? "Stop playing" : "Read message aloud"}
                      >
                        {speakingMessageId === index ? <VolumeX className="w-3 h-3" /> : <Volume1 className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed border ${
                    isUser
                      ? "bg-indigo-600 border-indigo-500 text-white font-medium rounded-tr-none shadow-lg shadow-indigo-600/10"
                      : "bg-slate-900 border-slate-800 text-slate-200 rounded-tl-none whitespace-pre-line"
                  }`}
                >
                  {msg.content}
                </div>
                {isUser && (
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
          
          {loading && (
            <div className="flex w-full items-start gap-4 justify-start">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white flex-shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none px-5 py-3.5 text-sm text-slate-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions Row */}
        {messages.length === 1 && (
          <div className="px-6 py-3 bg-slate-950 border-x border-slate-850 flex flex-wrap gap-2">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(suggestion)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-850 border border-slate-800 transition-all cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 bg-slate-900 border border-slate-850 rounded-b-2xl">
          <form onSubmit={handleSubmit} className="flex gap-2 items-center">
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`p-3 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                  isListening
                    ? "bg-red-650 border-red-550 text-white animate-pulse shadow-md shadow-red-600/20"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
                title={isListening ? "Stop listening" : "Dictate question (Speech-to-Text)"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening..." : "Ask a question about credit score, DTI, EMIs, or loan comparison..."}
              className="flex-1 px-4 py-3 text-sm rounded-xl bg-slate-950 border border-slate-800 focus:outline-none focus:border-indigo-500 text-white placeholder-slate-500 transition-colors"
              disabled={loading || isListening}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || isListening}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Immersive Voice Call Overlay */}
      {inCall && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl text-white">
          <div className="max-w-md w-full px-6 flex flex-col items-center text-center space-y-8">
            
            {/* Profile Card Header */}
            <div className="flex flex-col items-center space-y-2 animate-[fadeIn_0.3s_ease-out]">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
                <Bot className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide">Advisor Voice Agent</h2>
              <p className="text-xs text-indigo-400 font-semibold tracking-wider uppercase">Active Session</p>
            </div>

            {/* Animated Visualizer */}
            <div className="relative w-48 h-48 flex items-center justify-center animate-[scaleIn_0.3s_ease-out]">
              {/* Pulsing rings */}
              {callState === "listening" && (
                <>
                  <div className="absolute inset-0 rounded-full bg-emerald-500/10 border border-emerald-500/25 animate-ping duration-1000" />
                  <div className="absolute -inset-4 rounded-full bg-emerald-500/5 border border-emerald-500/10 animate-ping duration-1500" />
                </>
              )}
              {callState === "speaking" && (
                <>
                  <div className="absolute inset-0 rounded-full bg-indigo-500/10 border border-indigo-500/25 animate-ping duration-1000" />
                  <div className="absolute -inset-4 rounded-full bg-indigo-500/5 border border-indigo-500/10 animate-ping duration-1500" />
                </>
              )}
              {callState === "thinking" && (
                <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-indigo-400 animate-spin" />
              )}

              {/* Central Sphere */}
              <div className={`w-36 h-36 rounded-full flex flex-col items-center justify-center border shadow-2xl transition-all duration-500 ${
                callState === "listening" ? "bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-emerald-500/10" :
                callState === "speaking" ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-indigo-500/10" :
                callState === "thinking" ? "bg-indigo-950/40 border-indigo-800 text-indigo-400" :
                callState === "muted" ? "bg-red-950/30 border-red-800/50 text-red-400 shadow-red-500/5" :
                "bg-slate-900 border-slate-800 text-slate-400"
              }`}>
                {callState === "listening" && <Mic className="w-10 h-10 animate-bounce" />}
                {callState === "speaking" && <Volume2 className="w-10 h-10 animate-pulse" />}
                {callState === "thinking" && <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />}
                {callState === "muted" && <MicOff className="w-10 h-10" />}
                {callState === "idle" && <Bot className="w-10 h-10" />}
                
                <span className="text-[10px] font-bold uppercase tracking-wider mt-2.5">
                  {callState === "listening" ? "Listening" :
                   callState === "speaking" ? "Speaking" :
                   callState === "thinking" ? "Thinking" :
                   callState === "muted" ? "Muted" :
                   "Connected"}
                </span>
              </div>
            </div>

            {/* Live Transcript Window */}
            <div className="w-full bg-slate-900/60 border border-slate-850 rounded-2xl p-5 text-left h-36 flex flex-col justify-end space-y-3 overflow-hidden shadow-inner animate-[fadeIn_0.4s_ease-out]">
              {callTranscript.user && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">You</span>
                  <p className="text-sm text-slate-200 line-clamp-2 italic">&ldquo;{callTranscript.user}&rdquo;</p>
                </div>
              )}
              {callTranscript.bot && (
                <div className="space-y-1 border-t border-slate-800 pt-2.5">
                  <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide">AI Advisor</span>
                  <p className="text-sm text-slate-100 line-clamp-2 font-medium">
                    {callTranscript.bot.length > 80 ? callTranscript.bot.substring(0, 80) + "..." : callTranscript.bot}
                  </p>
                </div>
              )}
              {!callTranscript.user && !callTranscript.bot && (
                <div className="h-full flex items-center justify-center text-center text-slate-500 text-xs italic">
                  Call initialized. Start speaking to advisor...
                </div>
              )}
            </div>

            {/* Call Settings / Controls */}
            <div className="w-full flex items-center justify-between px-2 text-slate-400 animate-[fadeIn_0.5s_ease-out]">
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs max-w-[200px]">
                <Settings className="w-3.5 h-3.5" />
                <select
                  value={activeVoiceIndex}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value);
                    setActiveVoiceIndex(idx);
                    if (typeof window !== "undefined" && window.speechSynthesis) {
                      window.speechSynthesis.cancel();
                      const u = new SpeechSynthesisUtterance("Voice updated");
                      if (voices[idx]) u.voice = voices[idx];
                      window.speechSynthesis.speak(u);
                    }
                  }}
                  className="bg-transparent border-none focus:outline-none text-slate-200 cursor-pointer text-ellipsis overflow-hidden whitespace-nowrap w-28"
                >
                  {voices.map((v, i) => (
                    <option key={i} value={i} className="bg-slate-900 text-slate-200 text-xs">
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="text-[10px] text-slate-500">
                Powered by Browser TTS/STT
              </div>
            </div>

            {/* Action Controls */}
            <div className="flex items-center justify-center gap-5 pt-4 animate-[fadeIn_0.6s_ease-out]">
              <button
                type="button"
                onClick={toggleCallMic}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all cursor-pointer ${
                  callMicMuted 
                    ? "bg-red-650 border-red-550 text-white shadow-lg shadow-red-600/20" 
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white"
                }`}
                title={callMicMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {callMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              <button
                type="button"
                onClick={endCall}
                className="w-16 h-16 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center border border-red-500 shadow-xl shadow-red-600/30 hover:scale-105 transition-all cursor-pointer"
                title="End Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>

          </div>
        </div>
      )}
    </Shell>
  );
}
