/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, AlertTriangle, Monitor, Clock, Play, CheckCircle, Save } from 'lucide-react';
import { Question, TestRoom } from '../types';

interface ExamScreenProps {
  room: TestRoom;
  questions: Question[];
  authToken: string;
  onFinished: () => void;
}

export default function ExamScreen({ room, questions, authToken, onFinished }: ExamScreenProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'a' | 'b' | 'c' | 'd'>>({});
  const [timeRemaining, setTimeRemaining] = useState(room.time_limit * 60);
  const [cheatingCount, setCheatingCount] = useState(0);
  const [violationTimestamps, setViolationTimestamps] = useState<string[]>([]);
  const [isLobby, setIsLobby] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [cheatingLockout, setCheatingLockout] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-init answers dictionary
  useEffect(() => {
    const cached = localStorage.getItem(`quant_answers_${room.id}`);
    if (cached) {
      try {
        setAnswers(JSON.parse(cached));
      } catch (e) {}
    }
  }, [room.id]);

  // Request Fullscreen when joining
  const handleStartExam = () => {
    setIsLobby(false);
    requestFullscreen();
  };

  const requestFullscreen = () => {
    if (containerRef.current) {
      const elem = containerRef.current as any;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen().catch(() => {});
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen().catch(() => {});
      }
    }
  };

  // Fullscreen, minimize, and tab blur detection
  useEffect(() => {
    if (isLobby || isSubmitting || cheatingLockout) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation("Left the exam tab");
      }
    };

    const handleWindowBlur = () => {
      handleViolation("Switched exam focus window");
    };

    const handleFullscreenChange = () => {
      const isFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      if (!isFull) {
        handleViolation("Exited secure fullscreen mode");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isLobby, cheatingCount, isSubmitting, cheatingLockout]);

  // Handle violations
  const handleViolation = (reason: string) => {
    const timestamp = new Date().toISOString();
    const nextCount = cheatingCount + 1;
    
    setCheatingCount(nextCount);
    setViolationTimestamps(prev => [...prev, timestamp]);

    if (nextCount === 1) {
      setWarningMessage("Warning 1/3: Leaving the secure exam window or losing fullscreen is strictly prohibited.");
    } else if (nextCount === 2) {
      setWarningMessage("Warning 2/3: Second violation detected. A third violation will immediately terminate and submit your exam.");
    } else if (nextCount >= 3) {
      setWarningMessage("Warning 3/3: Terminal violation. Your exam has been terminated and flagged for suspicious activity.");
      setCheatingLockout(true);
      submitExam(true, nextCount, [...violationTimestamps, timestamp]);
    }

    // Force re-request fullscreen
    setTimeout(() => {
      requestFullscreen();
    }, 1000);
  };

  // Countdown clock
  useEffect(() => {
    if (isLobby || isSubmitting || cheatingLockout) return;

    if (timeRemaining <= 0) {
      submitExam(false, cheatingCount, violationTimestamps);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isLobby, isSubmitting, cheatingLockout]);

  // Autosave answers every 10 seconds locally & server handshake placeholder
  useEffect(() => {
    if (isLobby || isSubmitting || cheatingLockout) return;

    autosaveTimerRef.current = setInterval(() => {
      localStorage.setItem(`quant_answers_${room.id}`, JSON.stringify(answers));
      // Display save flash indicators
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }, 10000);

    return () => {
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
    };
  }, [answers, isLobby, isSubmitting, cheatingLockout]);

  const selectAnswer = (qId: string, char: 'a' | 'b' | 'c' | 'd') => {
    setAnswers(prev => {
      const updated = { ...prev, [qId]: char };
      localStorage.setItem(`quant_answers_${room.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const submitExam = async (forced = false, finalCheatCount = cheatingCount, finalTimestamps = violationTimestamps) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/rooms/${room.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          answers,
          cheatingCount: finalCheatCount,
          timestamps: finalTimestamps
        })
      });

      if (!response.ok) {
        throw new Error("Unable to save exam submission.");
      }

      localStorage.removeItem(`quant_answers_${room.id}`);
      
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }

      // Briefly hold status
      setTimeout(() => {
        onFinished();
      }, forced ? 4000 : 1500);

    } catch (e) {
      alert("Submission error. Please wait and try again or contact your testing teacher.");
      setIsSubmitting(false);
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const currentQuestion = questions[currentIdx];

  if (isLobby) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100" id="test_lobby_screen">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-sky-500/20 rounded-full flex items-center justify-center text-sky-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-display font-semibold tracking-tight">Exam Room Verified</h2>
            <p className="text-sm text-slate-400">Please review the rules before commencing your session.</p>
          </div>

          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/50 space-y-2 text-sm">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-500">Subject:</span>
              <span className="font-semibold text-slate-300">{room.subject}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-500">Test Title:</span>
              <span className="font-semibold text-sky-400">{room.title}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-500">Questions:</span>
              <span className="font-semibold text-slate-300">{questions.length} total</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500">Time Bound:</span>
              <span className="font-semibold text-amber-400">{room.time_limit} Minutes</span>
            </div>
          </div>

          <div className="space-y-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-200 leading-relaxed">
            <div className="flex items-center gap-2 border-b border-amber-500/10 pb-1.5 font-semibold text-amber-400">
              <AlertTriangle className="w-4 h-4" /> SECURE BROWSER ENVIRONMENT
            </div>
            <ul className="list-disc pl-4 space-y-1">
              <li>Exiting secure fullscreen mode marks a violation.</li>
              <li>Leaving or changing the active browser tab triggers instant warnings.</li>
              <li>A maximum of **3 warnings** are tolerated. The 3rd violation triggers automation to immediately terminate, grade, and flag the test room.</li>
            </ul>
          </div>

          <button
            onClick={handleStartExam}
            id="btn_start_exam"
            className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 active:translate-y-px transition text-white font-medium rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-500/20"
          >
            <Play className="w-4 h-4" /> Begin Secure Exam Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-slate-950 flex flex-col text-slate-200 select-none pb-8"
      id="secure_exam_fullscreen_container"
    >
      {/* SECURE HEADER PANEL */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap gap-4 items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <div>
            <span className="text-xs font-mono text-slate-500 uppercase tracking-widest block">Secure Assessment Chamber</span>
            <span className="text-sm font-semibold text-slate-200">{room.title}</span>
          </div>
        </div>

        {/* TIME BAR */}
        <div className="flex items-center gap-6">
          {isSaved && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 animate-fade-in font-mono">
              <Save className="w-3.5 h-3.5" /> Drafting Auto-Saved
            </span>
          )}

          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-full px-4 py-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className={`font-mono font-bold text-sm ${timeRemaining < 120 ? 'text-red-400 animate-pulse' : 'text-slate-100'}`}>
              {formatTime(timeRemaining)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5 text-xs font-semibold text-red-400">
            <Monitor className="w-4 h-4" /> Violations: {cheatingCount} / 3
          </div>

          <button
            onClick={() => {
              if (window.confirm("Are you sure you would like to submit and finalize your exam?")) {
                submitExam(false);
              }
            }}
            id="btn_submit_exam_manually"
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-medium rounded-full cursor-pointer transition shadow-md shadow-emerald-600/10"
          >
            Submit & Finalize
          </button>
        </div>
      </header>

      {/* DYNAMIC WARNING NOTIFIER */}
      {warningMessage && !cheatingLockout && (
        <div className="bg-red-500/15 border-b border-red-500/30 text-red-200 px-6 py-3 text-center text-sm font-medium flex items-center justify-center gap-2 relative">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{warningMessage}</span>
          <button
            onClick={() => setWarningMessage(null)}
            className="absolute right-6 text-xs hover:text-white underline font-mono cursor-pointer"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* CHEATING EXCLUSION SCREEN */}
      {cheatingLockout && (
        <div className="fixed inset-0 bg-slate-950 backdrop-blur-xl z-[9999] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md bg-slate-900 border border-red-500/30 rounded-2xl p-8 space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto animate-bounce">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-display font-semibold text-red-400">SESSION TERMINATED</h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              As per institution anti-cheating protocols, the examination is locked out due to exceeding maximum allowed browser tab/window focus triggers (3/3). Your progress has been finalized and archived for review by your lecturer.
            </p>
            <div className="text-xs bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-slate-500">
              State: TERMINAL_SUSPICION_ACTION
            </div>
            <div className="text-emerald-400 text-xs font-semibold animate-pulse">
              Transferring back to dashboard...
            </div>
          </div>
        </div>
      )}

      {/* THREE-COLUMN LAYOUT: NAVIGATOR - EXAM STAGE - METADATA */}
      <div className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
        
        {/* LEFT COLUMN: QUESTION NAVIGATOR */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <h3 className="text-sm font-display font-semibold tracking-tight text-slate-300">Question Outline</h3>
            <div className="grid grid-cols-4 gap-2" id="grid_question_navigator">
              {questions.map((q, idx) => {
                const isSelected = idx === currentIdx;
                const answered = !!answers[q.id];
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`py-2.5 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500 text-white'
                        : answered
                        ? 'bg-slate-800 text-slate-300 border border-emerald-500/50'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {answered && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs space-y-2 text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Current Question</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-800 border border-emerald-500/50" />
              <span>Answered Questions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-800" />
              <span>Unvisited / Empty</span>
            </div>
          </div>
        </aside>

        {/* CENTER/RIGHT COLUMNS: EXAM STAGE */}
        <main className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col justify-between relative">
          
          <div className="space-y-6">
            {/* Header / Points Tag */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <span className="px-3 py-1 bg-sky-500/10 border border-sky-500/20 rounded-md text-xs font-semibold text-sky-400 font-mono">
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Weight: <strong className="text-slate-200">{currentQuestion?.points || 10} points</strong>
              </span>
            </div>

            {/* Stem Question TEXT */}
            {currentQuestion ? (
              <div className="space-y-6">
                <h2 className="text-lg md:text-xl font-medium text-slate-100 leading-relaxed font-sans">
                  {currentQuestion.question_text}
                </h2>

                {/* Multiple choices list */}
                <div className="space-y-3.5" id="options_selection_container">
                  {[
                    { key: 'a' as const, label: currentQuestion.option_a },
                    { key: 'b' as const, label: currentQuestion.option_b },
                    { key: 'c' as const, label: currentQuestion.option_c },
                    { key: 'd' as const, label: currentQuestion.option_d }
                  ].map((opt) => {
                    const isSelected = answers[currentQuestion.id] === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => selectAnswer(currentQuestion.id, opt.key)}
                        className={`w-full text-left p-4 rounded-xl border transition flex items-center gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/10 border-sky-500 text-sky-300'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {opt.key.toUpperCase()}
                        </div>
                        <span className="text-sm">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-500">
                No questions assigned to this room.
              </div>
            )}
          </div>

          {/* Pagination Controls Footer */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-6 mt-8">
            <button
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                currentIdx === 0 ? 'text-slate-600 bg-slate-950/10 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer'
              }`}
            >
              Previous
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx(prev => prev + 1)}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg cursor-pointer transition"
              >
                Next Question
              </button>
            ) : (
              <button
                onClick={() => {
                  if (window.confirm("Ready to submit? This acts as your final answer review window.")) {
                    submitExam(false);
                  }
                }}
                className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-md shadow-emerald-500/25"
              >
                Submit Assessment
              </button>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
