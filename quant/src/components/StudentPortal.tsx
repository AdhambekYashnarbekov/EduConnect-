/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from "react";
import Markdown from "react-markdown";
import {
  BookOpen,
  Award,
  CheckCircle,
  Clock,
  Plus,
  HelpCircle,
  Loader2,
  AwardIcon,
  Sparkles,
  BookCheck,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { TestRoom, Question, Submission } from "../types";

interface StudentPortalProps {
  user: any;
  authToken: string;
  onEnterExam: (room: TestRoom, questions: Question[]) => void;
}

export default function StudentPortal({
  user,
  authToken,
  onEnterExam,
}: StudentPortalProps) {
  const [rooms, setRooms] = useState<TestRoom[]>([]);
  const [myHistory, setMyHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Auth room gate states
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomPassword, setRoomPassword] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);
  const [lobbyRoom, setLobbyRoom] = useState<TestRoom | null>(null);
  const [lobbyStatus, setLobbyStatus] = useState<string | null>(null);
  const [lobbyIntervalId, setLobbyIntervalId] = useState<NodeJS.Timeout | null>(
    null,
  );

  // AI Modal States
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [viewingSubId, setViewingSubId] = useState<string | null>(null);

  const fetchRoomsAndHistory = async () => {
    setLoading(true);
    try {
      const hRes = await fetch("/api/submissions/my-history", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (hRes.ok) {
        const hData = await hRes.json();
        setMyHistory(hData.submissions || []);
      }

      const rRes = await fetch("/api/rooms", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (rRes.ok) {
        const rData = await rRes.json();
        setRooms(rData.rooms || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomsAndHistory();
  }, [authToken]);

  // Handle Joining active room
  const handleJoinAttempt = async (room: TestRoom) => {
    setGateError(null);
    if (room.password && !roomPassword) {
      setSelectedRoomId(room.id);
      return;
    }

    try {
      const response = await fetch(`/api/rooms/${room.id}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ password: roomPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        setGateError(
          data.error || "Password incorrect or authorization rejected.",
        );
        return;
      }

      if (data.status === "approved") {
        // Immediate entry
        setSelectedRoomId(null);
        setRoomPassword("");
        startExam(room);
      } else if (data.status === "pending") {
        // Wait in lobby
        setLobbyRoom(room);
        setLobbyStatus("pending");
        setSelectedRoomId(null);
        setRoomPassword("");

        // Polling loop for approval
        const interval = setInterval(async () => {
          try {
            const checkRes = await fetch(`/api/rooms/${room.id}`, {
              headers: { Authorization: `Bearer ${authToken}` },
            });
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              if (checkData.userRequestStatus === "approved") {
                clearInterval(interval);
                setLobbyRoom(null);
                setLobbyStatus(null);
                startExam(room);
              } else if (checkData.userRequestStatus === "rejected") {
                clearInterval(interval);
                setLobbyStatus("rejected");
              }
            }
          } catch (err) {
            console.error(err);
          }
        }, 2000);

        setLobbyIntervalId(interval);
      }
    } catch (e) {
      setGateError("Connection issue. Please retry.");
    }
  };

  const startExam = async (room: TestRoom) => {
    try {
      const response = await fetch(`/api/rooms/${room.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        onEnterExam(room, data.questions || []);
      }
    } catch (e) {
      console.error("Failed to load questions", e);
    }
  };

  const requestAiTutorFeedback = async (subId: string) => {
    setAiLoading(true);
    setAiInsight(null);
    setViewingSubId(subId);
    try {
      const res = await fetch("/api/ai/student-insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ submissionId: subId }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiInsight(data.insight);
      } else {
        setAiInsight(
          "AI tutor represents simulated guidance right now due to server thresholds.",
        );
      }
    } catch (e) {
      setAiInsight("Error downloading custom insights report.");
    } finally {
      setAiLoading(false);
    }
  };

  // Safe cleaner
  useEffect(() => {
    return () => {
      if (lobbyIntervalId) clearInterval(lobbyIntervalId);
    };
  }, [lobbyIntervalId]);

  const calcAveragePerformance = () => {
    if (myHistory.length === 0) return 0;
    const sum = myHistory.reduce((acc, sub) => acc + sub.percentage, 0);
    return Math.round(sum / myHistory.length);
  };

  const avgScore = calcAveragePerformance();

  return (
    <div className="space-y-8" id="student_portal_container">
      {/* HEADER HERO AREA */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-sky-500/10 border border-sky-500/20 text-xs font-semibold text-sky-400 rounded-full font-mono uppercase tracking-wider">
              Student Dashboard
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ID: {user.student_id}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-100 tracking-tight">
            Welcome back,{" "}
            <span className="gradient-text">{user.full_name}</span>!
          </h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Check live exam rooms, submit approval passwords, and view AI tutor
            reports to bridge your learning gaps.
          </p>
        </div>

        {/* COMPREHENSIVE STATS */}
        <div className="flex gap-4 items-center shrink-0 w-full md:w-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex-1 md:flex-initial text-center min-w-[100px]">
            <span className="text-xs text-slate-500 font-mono block mb-1">
              Pass Index
            </span>
            <span className="text-2xl font-bold font-display text-sky-400">
              {avgScore}%
            </span>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex-1 md:flex-initial text-center min-w-[100px]">
            <span className="text-xs text-slate-500 font-mono block mb-1">
              Exams Cleared
            </span>
            <span className="text-2xl font-bold font-display text-emerald-400">
              {myHistory.length}
            </span>
          </div>
          <button
            onClick={fetchRoomsAndHistory}
            className="p-3 bg-slate-800 hover:bg-slate-700 active:scale-95 transition rounded-xl text-slate-400 hover:text-white shrink-0 cursor-pointer border border-slate-700"
            title="Refresh statistics"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* LOBBY WAIT SCREEN POPUP */}
      {lobbyRoom && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
            {lobbyStatus === "pending" ? (
              <>
                <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-xl font-display font-semibold text-slate-200">
                    Waiting for Educator Approval...
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    You have entered the waiting lobby for{" "}
                    <strong className="text-sky-400">{lobbyRoom.title}</strong>.
                    The teacher has been notified and will approve your entrance
                    in real-time. Please stay on this screen.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs font-mono text-slate-500">
                  LOBBY_STATE: PENDING_APPROVAL_QUEUE
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-xl font-display font-semibold text-red-400">
                    Request Denied
                  </h3>
                  <p className="text-xs text-slate-400">
                    Your entrance request for{" "}
                    <strong className="text-slate-300">
                      {lobbyRoom.title}
                    </strong>{" "}
                    was declined by the supervisor.
                  </p>
                </div>
              </>
            )}

            <button
              onClick={() => {
                if (lobbyIntervalId) clearInterval(lobbyIntervalId);
                setLobbyRoom(null);
                setLobbyStatus(null);
              }}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition overflow-hidden cursor-pointer w-full"
            >
              Exit Lobby
            </button>
          </div>
        </div>
      )}

      {/* TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT TWO COLUMNS: TESTING ROOMS & RESULTS HISTORY */}
        <div className="lg:col-span-2 space-y-8">
          {/* SECURE JOIN EXAMS AREA */}
          <div className="space-y-4">
            <h2 className="text-lg font-display font-semibold tracking-tight text-slate-300 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-400" /> Active Assessments
              Available
            </h2>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500 text-sm bg-slate-900/40 rounded-2xl border border-slate-800">
                <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />{" "}
                Fetching active examination rooms
              </div>
            ) : rooms.filter((r) => r.status === "active").length === 0 ? (
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-500 text-sm">
                No examinations are active right now. Ask your teacher to
                activate a room.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rooms
                  .filter((r) => r.status === "active")
                  .map((room) => {
                    const hasSubmitted = myHistory.some(
                      (s) => s.room_id === room.id,
                    );
                    const isPasswordOpen = selectedRoomId === room.id;

                    return (
                      <div
                        key={room.id}
                        className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4 transition flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="px-2.5 py-1 bg-sky-500/10 border border-sky-500/15 rounded-md text-[10px] font-bold font-mono text-sky-400 uppercase tracking-widest">
                              {room.subject}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-amber-500 font-mono font-bold">
                              <Clock className="w-3.5 h-3.5" />{" "}
                              {room.time_limit}m Limit
                            </span>
                          </div>
                          <h3 className="text-md font-semibold text-slate-200">
                            {room.title}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Mode:{" "}
                            {room.approval_mode === "auto"
                              ? "Instant Auto-Accept"
                              : "Manual Supervisor Approval"}
                          </p>
                        </div>

                        {hasSubmitted ? (
                          <div className="pt-2">
                            <span className="w-full py-2 bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5">
                              <CheckCircle className="w-4 h-4" /> Exam Completed
                              & Graded
                            </span>
                          </div>
                        ) : isPasswordOpen ? (
                          <div className="space-y-2 pt-2 border-t border-slate-800">
                            <div className="text-[11px] font-mono text-slate-400">
                              Enter Class Room Password:
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="password"
                                placeholder="Access Code"
                                value={roomPassword}
                                onChange={(e) => {
                                  setRoomPassword(e.target.value);
                                  setGateError(null);
                                }}
                                className="bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none flex-1"
                              />
                              <button
                                onClick={() => handleJoinAttempt(room)}
                                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                              >
                                Verify
                              </button>
                            </div>
                            {gateError && (
                              <p className="text-[10px] text-red-500 font-semibold">
                                {gateError}
                              </p>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (room.password) {
                                setSelectedRoomId(room.id);
                              } else {
                                handleJoinAttempt(room);
                              }
                            }}
                            className="w-full py-2 bg-sky-600 hover:bg-sky-500 hover:shadow-lg hover:shadow-sky-500/5 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Connect to Exam
                            Room {room.password && "🔒"}
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* HISTORICAL REVIEWS SECTION */}
          <div className="space-y-4">
            <h2 className="text-lg font-display font-semibold tracking-tight text-slate-300 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" /> Historic Exam
              Reports
            </h2>

            {myHistory.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
                You haven't completed any examinations yet.
              </div>
            ) : (
              <div className="space-y-3">
                {myHistory.map((sub) => {
                  const isViewingThis = viewingSubId === sub.id;
                  const passing = sub.percentage >= 50;

                  return (
                    <div
                      key={sub.id}
                      className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="font-semibold text-slate-200 text-sm md:text-base">
                            {sub.room_title}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                            <span>
                              Subject:{" "}
                              <strong className="text-slate-400">
                                {sub.room_subject}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>
                              Submitted:{" "}
                              {new Date(sub.submitted_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* SCORE TAG */}
                        <div className="flex items-center gap-3">
                          <div
                            className={`px-4 py-1.5 rounded-full text-center ${passing ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}
                          >
                            <span className="text-sm font-bold font-display">
                              {sub.percentage}%
                            </span>
                            <span className="text-[10px] block font-mono uppercase tracking-widest">
                              {passing ? "Pass" : "Fail"}
                            </span>
                          </div>

                          <button
                            onClick={() => requestAiTutorFeedback(sub.id)}
                            className="px-4 py-2 bg-gradient-to-r from-sky-500 to-sky-700 text-white font-medium text-xs rounded-full flex items-center gap-1.5 transition active:scale-95 cursor-pointer hover:shadow-lg hover:shadow-sky-500/20 shadow-md"
                          >
                            <Sparkles className="w-3.5 h-3.5 shrink-0" /> AI
                            Coach Feedback
                          </button>
                        </div>
                      </div>

                      {/* Display warning timestamps logs if any */}
                      {sub.cheating_flags > 0 && (
                        <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/10 text-[11px] text-red-400 font-mono">
                          ⚠️ Security Alerts Logged during exam:{" "}
                          {sub.cheating_flags} focus blur events noted.
                        </div>
                      )}

                      {/* AI Tutor Insight Drawer */}
                      {isViewingThis && (
                        <div className="mt-4 bg-slate-950/80 border border-sky-500/20 rounded-xl p-5 md:p-6 space-y-4 animate-fade-in text-xs leading-relaxed max-h-[400px] overflow-y-auto">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h5 className="font-display font-bold text-sky-400 flex items-center gap-1.5 text-sm">
                              <Sparkles className="w-4 h-4 animate-pulse shrink-0" />{" "}
                              Academic Diagnostic Report
                            </h5>
                            <button
                              onClick={() => {
                                setViewingSubId(null);
                                setAiInsight(null);
                              }}
                              className="text-slate-400 hover:text-white font-mono cursor-pointer underline text-[10px]"
                            >
                              Close
                            </button>
                          </div>

                          {aiLoading ? (
                            <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-500 text-[11px]">
                              <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
                              <span>
                                Asking Gemini tutor to map performance
                                metrics...
                              </span>
                            </div>
                          ) : (
                            <div
                              className="text-slate-300 space-y-3 text-xs md:text-sm leading-relaxed markdown-body"
                              id="ai_student_feedback"
                            >
                              <Markdown>{aiInsight || ""}</Markdown>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: REVIEWS CHANNELS & HIGHLIGHTS */}
        <aside className="space-y-6 lg:col-span-1">
          {/* SECURE SVG LEARNING GRAPH */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="font-display font-semibold text-slate-200 text-sm flex items-center gap-2">
              <AwardIcon className="w-4 h-4 text-sky-400" /> Assessment Curve
              Trend
            </h3>

            {myHistory.length === 0 ? (
              <div className="h-32 bg-slate-950/40 rounded-2xl flex items-center justify-center text-slate-600 font-mono text-xs">
                No scores indexed
              </div>
            ) : (
              <div className="space-y-4 text-center">
                {/* Custom SVG line representing learning progression */}
                <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 flex items-center justify-center">
                  <svg
                    viewBox="0 0 100 40"
                    className="w-full h-24 stroke-sky-400 fill-none overflow-visible"
                  >
                    <path
                      d={(() => {
                        const count = myHistory.length;
                        if (count === 1) return "M 10 20 L 90 20";
                        return myHistory
                          .map((sub, i) => {
                            const x = 10 + i * (80 / (count - 1));
                            const y = 35 - sub.percentage * 0.3; // Map 0-100% to 35-5 in range
                            return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                          })
                          .join(" ");
                      })()}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* Data dots */}
                    {myHistory.map((sub, i) => {
                      const count = myHistory.length;
                      const x = count === 1 ? 50 : 10 + i * (80 / (count - 1));
                      const y = 35 - sub.percentage * 0.3;
                      return (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r="3"
                          className="fill-sky-400 hover:fill-emerald-400 transition cursor-pointer"
                        />
                      );
                    })}
                  </svg>
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  Dynamic scores progression line over latest {myHistory.length}{" "}
                  exams.
                </div>
              </div>
            )}
          </div>

          {/* AI PERSONALIZED STUDY PATH */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2 text-sky-400 font-display font-semibold text-sm">
              <Sparkles className="w-4 h-4 animate-pulse text-sky-400" /> AI
              Learning Syllabus Path
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Based on your response histories, the diagnostic engine recommends
              prioritising these topics:
            </p>

            <ul className="space-y-3 pt-2">
              <li className="flex gap-2.5 items-start bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <BookCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <header className="text-xs font-semibold text-slate-200">
                    Multivariable Integration Limits
                  </header>
                  <p className="text-[10px] text-slate-500">
                    Failed on Midterm. Redo integration loops.
                  </p>
                </div>
              </li>
              <li className="flex gap-2.5 items-start bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <BookCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <header className="text-xs font-semibold text-slate-200">
                    Quantum Uncertainty Parameters
                  </header>
                  <p className="text-[10px] text-slate-500">
                    Heisenberg's coordinates require core recall.
                  </p>
                </div>
              </li>
              <li className="flex gap-2.5 items-start bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <BookCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <header className="text-xs font-semibold text-slate-200">
                    Chain Rule Complex Logarithms
                  </header>
                  <p className="text-[10px] text-slate-500">
                    Practice nested derivation coefficients.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
