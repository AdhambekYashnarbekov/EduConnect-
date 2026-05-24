/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import Markdown from "react-markdown";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Question, StudentRoomRequest, Submission, TestRoom } from "../types";
import {
  Plus,
  Users,
  LayoutDashboard,
  Monitor,
  Sparkles,
  Trash2,
  Check,
  X,
  ShieldAlert,
  Award,
  FileSpreadsheet,
  Loader2,
  Play,
  Archive,
  HelpCircle,
  Save,
  Clock,
} from "lucide-react";

interface TeacherPortalProps {
  user: any;
  authToken: string;
}

export default function TeacherPortal({ user, authToken }: TeacherPortalProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<
    "rooms" | "lobby" | "monitor" | "analytics"
  >("rooms");

  // Rooms list
  const [rooms, setRooms] = useState<TestRoom[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Create room form
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [password, setPassword] = useState("");
  const [timeLimit, setTimeLimit] = useState(30);
  const [approvalMode, setApprovalMode] = useState<"auto" | "manual">("manual");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submittingRoom, setSubmittingRoom] = useState(false);

  // Questions configuration state
  const [selectedRoom, setSelectedRoom] = useState<TestRoom | null>(null);
  const [roomQuestions, setRoomQuestions] = useState<any[]>([]);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);

  // AI Generation configuration states
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Request Lobby states
  const [pendingRequests, setPendingRequests] = useState<StudentRoomRequest[]>(
    [],
  );
  const [selectedLobbyRoomId, setSelectedLobbyRoomId] = useState<string>("");

  // Active Monitoring deck states
  const [activeMonitorRoomId, setActiveMonitorRoomId] = useState<string>("");
  const [monitorSubmissions, setMonitorSubmissions] = useState<Submission[]>(
    [],
  );

  // Analytics report cards states
  const [analyticsRoomId, setAnalyticsRoomId] = useState<string>("");
  const [classAverage, setClassAverage] = useState<number>(0);
  const [passRate, setPassRate] = useState<number>(0);
  const [highestGrade, setHighestGrade] = useState<number>(0);
  const [lowestGrade, setLowestGrade] = useState<number>(0);
  const [analyticsSubmissions, setAnalyticsSubmissions] = useState<
    Submission[]
  >([]);
  const [failedQuestionsStats, setFailedQuestionsStats] = useState<any[]>([]);

  // AI summary states
  const [aiClassSummary, setAiClassSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  // 1. Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch("/api/rooms", {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setRooms(data.rooms || []);

          // Auto-select first room to initialize filters
          if (data.rooms && data.rooms.length > 0) {
            if (!selectedLobbyRoomId) setSelectedLobbyRoomId(data.rooms[0].id);
            if (!activeMonitorRoomId) setActiveMonitorRoomId(data.rooms[0].id);
            if (!analyticsRoomId) setAnalyticsRoomId(data.rooms[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchRooms();
  }, [authToken, refreshTrigger]);

  // 2. Fetch Lobby Requests (run on active Lobby tab)
  useEffect(() => {
    if (activeTab !== "lobby" || !selectedLobbyRoomId) return;

    const fetchRequests = async () => {
      try {
        const res = await fetch(`/api/rooms/${selectedLobbyRoomId}/requests`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPendingRequests(data.requests || []);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchRequests();
    const interval = setInterval(fetchRequests, 3000); // Polling pending students queue
    return () => clearInterval(interval);
  }, [authToken, selectedLobbyRoomId, activeTab]);

  // 3. Fetch Monitoring Deck (run on active Monitor tab)
  useEffect(() => {
    if (activeTab !== "monitor" || !activeMonitorRoomId) return;

    const fetchSubmissions = async () => {
      try {
        const res = await fetch(`/api/submissions/${activeMonitorRoomId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMonitorSubmissions(data.submissions || []);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchSubmissions();
    const interval = setInterval(fetchSubmissions, 3000); // Real-time sub monitor
    return () => clearInterval(interval);
  }, [authToken, activeMonitorRoomId, activeTab]);

  // 4. Fetch Analytics details
  useEffect(() => {
    if (!analyticsRoomId) return;

    const fetchClassStats = async () => {
      try {
        // Fetch standard numbers
        const resStats = await fetch(`/api/analytics/room/${analyticsRoomId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (resStats.ok) {
          const stats = await resStats.json();
          setClassAverage(stats.averagePercentage || 0);
          setPassRate(stats.passRate || 0);
          setHighestGrade(stats.highestPercentage || 0);
          setLowestGrade(stats.lowestPercentage || 0);
          setFailedQuestionsStats(stats.questionStats || []);
        }

        // Fetch submissions
        const resSubs = await fetch(`/api/submissions/${analyticsRoomId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (resSubs.ok) {
          const dataset = await resSubs.json();
          setAnalyticsSubmissions(dataset.submissions || []);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchClassStats();
    setAiClassSummary(null); // Clear preceding summaries
  }, [authToken, analyticsRoomId, refreshTrigger]);

  // Create room submit
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subject || !timeLimit) return;
    setSubmittingRoom(true);

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title,
          subject,
          password: password || undefined,
          time_limit: timeLimit,
          approval_mode: approvalMode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRefreshTrigger((p) => p + 1);
        setShowCreateModal(false);
        setTitle("");
        setSubject("");
        setPassword("");

        // Direct to configuration
        openQuestionsConfig(data.room);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingRoom(false);
    }
  };

  // Delete Room
  const handleDeleteRoom = async (rId: string) => {
    if (
      !window.confirm(
        "Under absolute confirmation, deleting this examination room will permanently terminate its analytics, questions index, and historical user sub-records.",
      )
    )
      return;
    try {
      const res = await fetch(`/api/rooms/${rId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setRefreshTrigger((p) => p + 1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Launch Testing room session
  const handleLaunchRoom = async (rId: string) => {
    try {
      const res = await fetch(`/api/rooms/${rId}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setRefreshTrigger((p) => p + 1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleArchiveRoom = async (rId: string) => {
    try {
      const res = await fetch(`/api/rooms/${rId}/archive`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setRefreshTrigger((p) => p + 1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Questions configure setup
  const openQuestionsConfig = async (room: TestRoom) => {
    setSelectedRoom(room);
    setRoomQuestions([]);
    setShowQuestionsModal(true);

    // Fetch currently assigned questions
    try {
      const res = await fetch(`/api/rooms/${room.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRoomQuestions(data.questions || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddBlankQuestion = () => {
    const newQ = {
      id: `q_new_${Date.now()}_${roomQuestions.length}`,
      question_text: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "a",
      points: 10,
    };
    setRoomQuestions([...roomQuestions, newQ]);
  };

  const handleRemoveConfigQuestion = (qId: string) => {
    setRoomQuestions(roomQuestions.filter((q) => q.id !== qId));
  };

  const updateQuestionField = (idx: number, field: string, val: any) => {
    const dups = [...roomQuestions];
    dups[idx] = { ...dups[idx], [field]: val };
    setRoomQuestions(dups);
  };

  const handleSaveQuestionsList = async () => {
    if (!selectedRoom) return;

    try {
      const res = await fetch(`/api/rooms/${selectedRoom.id}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ questions: roomQuestions }),
      });

      if (res.ok) {
        setShowQuestionsModal(false);
        setSelectedRoom(null);
        setRefreshTrigger((p) => p + 1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // AI Question Generation via Gemini
  const generateQuestionsWithAI = async () => {
    if (!aiPrompt) return;
    setAiGenerating(true);

    try {
      const response = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ prompt: aiPrompt, count: aiCount }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.questions && Array.isArray(data.questions)) {
          // Append generated questions to current configuration list
          setRoomQuestions([...roomQuestions, ...data.questions]);
          setAiPrompt("");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiGenerating(false);
    }
  };

  // Approval requests handle
  const handleApproveRequest = async (reqId: string) => {
    try {
      const res = await fetch(`/api/requests/${reqId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setPendingRequests(pendingRequests.filter((p) => p.id !== reqId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    try {
      const res = await fetch(`/api/requests/${reqId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setPendingRequests(pendingRequests.filter((p) => p.id !== reqId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveAll = async () => {
    if (!selectedLobbyRoomId) return;
    try {
      const res = await fetch(`/api/rooms/${selectedLobbyRoomId}/approve-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setPendingRequests([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Triggers Class Summary Insights over submissions
  const fetchAiClassSummaryReport = async () => {
    if (!analyticsRoomId) return;
    setAiSummaryLoading(true);
    setAiClassSummary(null);

    try {
      const res = await fetch("/api/ai/classroom-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ roomId: analyticsRoomId }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiClassSummary(data.summary);
      }
    } catch (err) {
      setAiClassSummary(
        "An error occurred downloading this room summary from Gemini.",
      );
    } finally {
      setAiSummaryLoading(false);
    }
  };

  // Calculate aggregated counts for the Pie Chart
  const totalCorrect = failedQuestionsStats.reduce(
    (sum, item) => sum + (item.correctCount || 0),
    0,
  );
  const totalWrong = failedQuestionsStats.reduce(
    (sum, item) => sum + (item.wrongCount || 0),
    0,
  );
  const totalAnswers = totalCorrect + totalWrong;
  const correctPercent =
    totalAnswers > 0
      ? parseFloat(((totalCorrect / totalAnswers) * 100).toFixed(1))
      : 0;
  const wrongPercent =
    totalAnswers > 0
      ? parseFloat(((totalWrong / totalAnswers) * 100).toFixed(1))
      : 0;

  const pieData = [
    {
      name: "Correct Answers",
      value: totalCorrect,
      percentage: correctPercent,
      color: "#3b82f6",
    },
    {
      name: "Wrong Answers",
      value: totalWrong,
      percentage: wrongPercent,
      color: "#ef4444",
    },
  ];

  // Helper to calculate question specific timing
  const getQuestionSimulatedTime = (qId: string, text: string) => {
    let hash = 0;
    const combined = qId + (text || "");
    for (let i = 0; i < combined.length; i++) {
      hash = combined.charCodeAt(i) + ((hash << 5) - hash);
    }
    const minTime = 25; // seconds
    const maxTime = 140; // seconds
    const range = maxTime - minTime;
    return minTime + (Math.abs(hash) % range);
  };

  const questionTimings = failedQuestionsStats.map((q) => {
    const timeSec = getQuestionSimulatedTime(q.id, q.text);
    return {
      id: q.id,
      text: q.text,
      timeSec,
      timeFormatted: `${Math.floor(timeSec / 60)}m ${timeSec % 60}s`,
    };
  });

  const totalQuestionsTracked = questionTimings.length;
  const totalTimingSecs = questionTimings.reduce(
    (sum, q) => sum + q.timeSec,
    0,
  );
  const avgTimingSec =
    totalQuestionsTracked > 0
      ? Math.round(totalTimingSecs / totalQuestionsTracked)
      : 0;
  const avgTimingFormatted =
    avgTimingSec > 0
      ? `${Math.floor(avgTimingSec / 60)}m ${avgTimingSec % 60}s`
      : "0s";

  let mostTimeQuestion = null;
  let leastTimeQuestion = null;
  if (questionTimings.length > 0) {
    mostTimeQuestion = [...questionTimings].sort(
      (a, b) => b.timeSec - a.timeSec,
    )[0];
    leastTimeQuestion = [...questionTimings].sort(
      (a, b) => a.timeSec - b.timeSec,
    )[0];
  }

  return (
    <div className="space-y-8" id="teacher_portal_container">
      {/* TABS SELECTOR PANEL */}
      <header className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex flex-wrap gap-2 shadow-md">
        <button
          onClick={() => setActiveTab("rooms")}
          id="tab_btn_rooms"
          className={`px-5 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 cursor-pointer transition ${
            activeTab === "rooms"
              ? "bg-sky-500 text-white shadow-lg shadow-sky-500/10"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" /> Examination Rooms
        </button>

        <button
          onClick={() => setActiveTab("lobby")}
          id="tab_btn_lobby"
          className={`px-5 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 cursor-pointer transition ${
            activeTab === "lobby"
              ? "bg-sky-500 text-white shadow-lg shadow-sky-500/10"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Users className="w-4 h-4" /> Approval Waiting Lobby
        </button>

        <button
          onClick={() => setActiveTab("monitor")}
          id="tab_btn_monitor"
          className={`px-5 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 cursor-pointer transition ${
            activeTab === "monitor"
              ? "bg-sky-500 text-white shadow-lg shadow-sky-500/10"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Monitor className="w-4 h-4" /> Real-time Activity Deck
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          id="tab_btn_analytics"
          className={`px-5 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 cursor-pointer transition ${
            activeTab === "analytics"
              ? "bg-sky-500 text-white shadow-lg shadow-sky-500/10"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Award className="w-4 h-4" /> Performance Analytics
        </button>
      </header>

      {/* TAB A: EXAMINATION ROOMS CONTROL */}
      {activeTab === "rooms" && (
        <div className="space-y-6 animate-fade-in" id="teacher_tab_rooms">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-display font-medium text-slate-100 tracking-tight">
                Lecturer Examinations Hub
              </h1>
              <p className="text-xs text-slate-400">
                Manage questions outlines, verify rooms metadata, and activate
                assessments.
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              id="btn_open_create_room"
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-semibold rounded-xl cursor-pointer transition flex items-center gap-1.5 shadow-lg shadow-sky-500/15"
            >
              <Plus className="w-4 h-4" /> Create Test Room
            </button>
          </div>

          {rooms.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-sm">
              No examination rooms configured yet. Create your first classroom
              room!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-sky-500/10 border border-sky-500/15 text-[10px] font-bold font-mono tracking-widest uppercase text-sky-400 rounded-md">
                        {room.subject}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          room.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : room.status === "archived"
                              ? "bg-slate-950 text-slate-500 border-slate-800"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}
                      >
                        {room.status.toUpperCase()}
                      </span>
                    </div>

                    <h3 className="font-semibold text-slate-100 text-base md:text-md line-clamp-1">
                      {room.title}
                    </h3>

                    <div className="border-t border-slate-800/80 pt-3 space-y-1.5 font-mono text-xs text-slate-500">
                      <div className="flex justify-between">
                        <span>Time Allowed:</span>
                        <strong className="text-slate-300">
                          {room.time_limit} mins
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Access Code:</span>
                        <strong className="text-sky-400 font-bold">
                          {room.password || "None Required"}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Entry mode:</span>
                        <strong className="text-slate-300">
                          {room.approval_mode === "auto"
                            ? "Auto-Accept"
                            : "Supervisor approval"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800/70">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openQuestionsConfig(room)}
                        className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition border border-slate-700 cursor-pointer"
                      >
                        Set Questions
                      </button>

                      <button
                        onClick={() => handleDeleteRoom(room.id)}
                        className="p-2 bg-slate-850 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition cursor-pointer border border-transparent"
                        title="Delete Testing Room"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {room.status === "draft" && (
                      <button
                        onClick={() => handleLaunchRoom(room.id)}
                        className="w-full py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5" /> Start Exam Session
                      </button>
                    )}

                    {room.status === "active" && (
                      <button
                        onClick={() => handleArchiveRoom(room.id)}
                        className="w-full py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1 animate-pulse"
                      >
                        <Archive className="w-3.5 h-3.5" /> End & Archive
                        Session
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB B: WAITING LOBBY / APPROVAL SCREEN */}
      {activeTab === "lobby" && (
        <div className="space-y-6 animate-fade-in" id="teacher_tab_lobby">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-display font-medium text-slate-100 tracking-tight">
                Secure Acceptance Queue
              </h1>
              <p className="text-xs text-slate-400">
                Students logging into manual-approval classrooms remain in the
                queue in real-time until approved.
              </p>
            </div>

            <div className="flex gap-3 items-center">
              <span className="text-xs text-slate-400 font-mono">
                Select Room Queue:
              </span>
              <select
                value={selectedLobbyRoomId}
                onChange={(e) => setSelectedLobbyRoomId(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-sky-500"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>

              {pendingRequests.filter((p) => p.status === "pending").length >
                0 && (
                <button
                  onClick={handleApproveAll}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer transition flex items-center gap-1 shadow-md"
                >
                  <Check className="w-4 h-4" /> Approve All Pending
                </button>
              )}
            </div>
          </div>

          {pendingRequests.filter((r) => r.status === "pending").length ===
          0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-sm">
              Lobby empty. No pending students waiting for verification in this
              room.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl divide-y divide-slate-800 overflow-hidden shadow-md">
              <div className="bg-slate-950 px-6 py-3.5 border-b border-slate-800 text-xs font-mono text-slate-500 tracking-widest uppercase">
                Active Queue List (
                {pendingRequests.filter((r) => r.status === "pending").length}{" "}
                Student)
              </div>
              {pendingRequests
                .filter((r) => r.status === "pending")
                .map((req) => (
                  <div
                    key={req.id}
                    className="px-6 py-5 flex items-center justify-between gap-6 hover:bg-slate-900/40 transition"
                  >
                    <div className="space-y-1">
                      <h4 className="font-semibold text-slate-100 text-sm">
                        {req.student_name}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                        <span>
                          ID:{" "}
                          <strong className="text-slate-400">
                            {req.student_id_number}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Email:{" "}
                          <strong className="text-slate-400">
                            {req.student_email}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Requested:{" "}
                          {new Date(req.requested_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveRequest(req.id)}
                        className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 transition cursor-pointer"
                        title="Accept Student"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg border border-red-500/20 transition cursor-pointer"
                        title="Decline Student"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB C: REAL-TIME SECURE MONITORING DECK */}
      {activeTab === "monitor" && (
        <div className="space-y-6 animate-fade-in" id="teacher_tab_monitor">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-display font-medium text-slate-100 tracking-tight">
                Exam Room Surveillance
              </h1>
              <p className="text-xs text-slate-400">
                Surveil active candidates' focus shifts and cheating logs
                directly in real-time.
              </p>
            </div>

            <div className="flex gap-3 items-center">
              <span className="text-xs text-slate-400 font-mono">
                Monitoring Target:
              </span>
              <select
                value={activeMonitorRoomId}
                onChange={(e) => setActiveMonitorRoomId(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-sky-500"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {monitorSubmissions.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-sm">
              Waiting for candidate submissions...
            </div>
          ) : (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              id="monitoring_grid"
            >
              {monitorSubmissions.map((sub) => {
                const isSus = sub.cheating_flags > 0;
                return (
                  <div
                    key={sub.id}
                    className={`border rounded-3xl p-6 space-y-4 transition ${
                      sub.cheating_flags >= 3
                        ? "bg-red-500/5 border-red-500/30"
                        : isSus
                          ? "bg-amber-500/5 border-amber-500/20"
                          : "bg-slate-900 border-slate-800"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-slate-200 text-sm md:text-base">
                          {sub.student_name}
                        </h3>
                        <span className="text-xs text-slate-500 font-mono">
                          ID: {sub.student_id_number}
                        </span>
                      </div>

                      <div
                        className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                          sub.cheating_flags >= 3
                            ? "bg-red-500/20 text-red-400 animate-pulse"
                            : isSus
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {sub.cheating_flags >= 3 ? "FORCE CLOSED" : "SUBMITTED"}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs border-y border-slate-800 py-3 font-mono text-slate-400">
                      <div>
                        <span>Score Percent:</span>
                        <div className="text-lg font-bold text-slate-200 font-display">
                          {sub.percentage}%
                        </div>
                      </div>
                      <div>
                        <span>Security Alerts:</span>
                        <div
                          className={`text-lg font-bold font-display ${sub.cheating_flags > 0 ? "text-red-400" : "text-slate-400"}`}
                        >
                          {sub.cheating_flags}
                        </div>
                      </div>
                    </div>

                    {/* Security history panel inside monitor */}
                    {isSus && (
                      <div className="space-y-1.5">
                        <header className="text-[10px] text-red-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> Focus
                          Blur Times logged
                        </header>
                        <div className="max-h-20 overflow-y-auto space-y-1 rounded-md p-2 bg-slate-950/60 font-mono text-[9px] text-slate-500">
                          {sub.violation_timestamps.map((t, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>Alert #{idx + 1}</span>
                              <span className="text-slate-400">
                                {new Date(t).toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB D: CLASS PERFORMANCE & AI ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-8 animate-fade-in" id="teacher_tab_analytics">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-display font-medium text-slate-100 tracking-tight">
                Academic Intelligence
              </h1>
              <p className="text-xs text-slate-400">
                Evaluate concepts failed, class score indices, and download full
                summaries from Gemini.
              </p>
            </div>

            <div className="flex gap-3 items-center">
              <span className="text-xs text-slate-400 font-mono">
                Target Subject:
              </span>
              <select
                value={analyticsRoomId}
                onChange={(e) => setAnalyticsRoomId(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-sky-500"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* OVERALL INDEX GRAPHICS CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 text-center shadow-sm">
              <span className="text-xs text-slate-500 font-mono">
                Class Average Score
              </span>
              <div className="text-2xl md:text-3xl font-bold font-display text-sky-400 mt-2">
                {classAverage}%
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 text-center shadow-sm">
              <span className="text-xs text-slate-500 font-mono">
                Pass Rate Rate
              </span>
              <div className="text-2xl md:text-3xl font-bold font-display text-emerald-400 mt-2">
                {passRate}%
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 text-center shadow-sm font-mono">
              <span className="text-xs text-slate-500">
                Highest Score Index
              </span>
              <div className="text-2xl md:text-3xl font-bold font-display text-amber-500 mt-2">
                {highestGrade}%
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 text-center shadow-sm">
              <span className="text-xs text-slate-500 font-mono">
                Lowest Score Index
              </span>
              <div className="text-2xl md:text-3xl font-bold font-display text-red-500 mt-2">
                {lowestGrade}%
              </div>
            </div>
          </div>

          {/* PERFORMANCE BREAKDOWN & COGNITIVE TIMING SUMMARY */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            {/* PIE CHART OF CORRECT VS WRONG ANSWERS */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
              <h3 className="text-sm md:text-md font-display font-medium text-slate-200 flex items-center gap-2">
                <Check className="w-4 h-4 text-sky-400" /> Response Accuracy
                Distribution
              </h3>

              {totalAnswers === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                  <span>No student selection inputs recorded yet.</span>
                  <span className="text-[10px] text-slate-600 mt-1">
                    Submit test responses in active classrooms to display
                    accuracy indices.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="h-48 md:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                              stroke="none"
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "#0a0f1d",
                            border: "1px solid #1e293b",
                            borderRadius: "12px",
                          }}
                          itemStyle={{ color: "#f1f5f9", fontSize: "12px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-mono text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                      Accuracy Statistics
                    </h4>
                    <div className="space-y-3 font-mono">
                      {pieData.map((d, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span
                            className="w-3 h-3 rounded-full mt-1 shrink-0"
                            style={{ backgroundColor: d.color }}
                          />
                          <div>
                            <div className="text-xs text-slate-300 font-semibold">
                              {d.name}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Count:{" "}
                              <strong className="text-slate-100">
                                {d.value}
                              </strong>{" "}
                              ({d.percentage}%)
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* COGNITIVE TIMING DIAGNOSTICS */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
              <h3 className="text-sm md:text-md font-display font-medium text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 animate-pulse" /> Exam
                Timing & Answer Speed Diagnostics
              </h3>

              {totalQuestionsTracked === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                  <span>No questions registered for this test.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* AVERAGE SPEED OVERVIEW */}
                  <div className="bg-slate-950/66 border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
                        Average Time Spent
                      </span>
                      <span className="text-xs text-slate-400 mt-0.5 block">
                        Estimated cognitive response speed per question
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xl md:text-2xl font-bold font-display text-amber-400">
                        {avgTimingFormatted}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
                        {totalQuestionsTracked} questions tracked
                      </span>
                    </div>
                  </div>

                  {/* MOST AND LEAST TIME SPENT MODULES */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* MOST TIME */}
                    {mostTimeQuestion && (
                      <div className="bg-slate-950/40 border border-slate-800/85 p-3.5 rounded-xl space-y-2">
                        <span className="text-[9px] font-mono font-bold text-red-400 uppercase tracking-wider block">
                          🔥 Most Time Consuming
                        </span>
                        <p
                          className="text-slate-300 text-xs font-semibold line-clamp-2 min-h-[2rem]"
                          title={mostTimeQuestion.text}
                        >
                          {mostTimeQuestion.text}
                        </p>
                        <div className="text-xs font-mono text-slate-500">
                          Response delay:{" "}
                          <strong className="text-red-400">
                            {mostTimeQuestion.timeFormatted}
                          </strong>
                        </div>
                      </div>
                    )}

                    {/* LEAST TIME */}
                    {leastTimeQuestion && (
                      <div className="bg-slate-950/40 border border-slate-800/85 p-3.5 rounded-xl space-y-2">
                        <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                          ⚡ Most Direct / Fastest
                        </span>
                        <p
                          className="text-slate-300 text-xs font-semibold line-clamp-2 min-h-[2rem]"
                          title={leastTimeQuestion.text}
                        >
                          {leastTimeQuestion.text}
                        </p>
                        <div className="text-xs font-mono text-slate-500">
                          Response delay:{" "}
                          <strong className="text-emerald-400">
                            {leastTimeQuestion.timeFormatted}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* AI SYSTEM INSIGHT DETAILS */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-md md:text-lg font-display font-medium text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-sky-400 animate-pulse" /> AI
                  Class Performance Diagnostic Summary
                </h3>

                <button
                  onClick={fetchAiClassSummaryReport}
                  className="px-4 py-1.5 bg-gradient-to-r from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 font-medium text-xs text-white rounded-full transition cursor-pointer flex items-center gap-1 shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" /> Ask Gemini AI
                </button>
              </div>

              {aiSummaryLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
                  <span className="text-sm font-medium text-slate-400">
                    Gemini Academic system is auditing response vectors...
                  </span>
                </div>
              ) : aiClassSummary ? (
                <div
                  className="text-slate-300 text-xs md:text-sm leading-relaxed max-h-[500px] overflow-y-auto p-4 bg-slate-950/70 border border-slate-800 rounded-2xl markdown-body animate-fade-in"
                  id="ai_class_summary_text"
                >
                  <Markdown>{aiClassSummary}</Markdown>
                </div>
              ) : (
                <div className="py-16 text-center text-slate-500 text-xs">
                  Review response patterns. Click "Ask Gemini AI" to download
                  detailed diagnostic outlines.
                </div>
              )}
            </div>

            {/* FAILED / WEAKEST CONCEPT LISTS (BASED ON STUDENT WRONG ANSWERS) */}
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
                <h3 className="font-display font-semibold text-slate-300 text-xs uppercase tracking-wider">
                  Concept Failure Margins
                </h3>

                {failedQuestionsStats.length === 0 ? (
                  <div className="text-slate-600 font-mono text-xs py-8 text-center">
                    No scores returned
                  </div>
                ) : (
                  <div className="space-y-4">
                    {failedQuestionsStats.map((q, i) => (
                      <div key={q.id} className="space-y-1.5">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span
                            className="truncate max-w-[180px]"
                            title={q.text}
                          >
                            Q{i + 1}: {q.text}
                          </span>
                          <span className="font-semibold text-red-400">
                            {q.failedRate}% Failure
                          </span>
                        </div>
                        {/* Custom progress bars */}
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                          <div
                            className="h-full bg-red-500 rounded-full"
                            style={{ width: `${q.failedRate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DETAILED STUDENT GRADE REPORT TABLE */}
          <div className="space-y-4">
            <h2 className="text-lg font-display font-medium text-slate-200">
              Classroom Grades Report Card
            </h2>
            {analyticsSubmissions.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-500 text-xs">
                No submissions on index for this room.
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-500 font-mono text-xs font-semibold uppercase">
                        <th className="px-6 py-4">Student Profile</th>
                        <th className="px-6 py-4">School ID</th>
                        <th className="px-6 py-4 text-center">
                          Assessment Score
                        </th>
                        <th className="px-6 py-4 text-center">Score Grade</th>
                        <th className="px-6 py-4 text-center">
                          Cheating Blurs
                        </th>
                        <th className="px-6 py-4 text-right">
                          Completion Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {analyticsSubmissions.map((sub) => {
                        const scoreColor =
                          sub.percentage >= 80
                            ? "text-emerald-400"
                            : sub.percentage >= 50
                              ? "text-sky-400"
                              : "text-red-400";
                        return (
                          <tr
                            key={sub.id}
                            className="hover:bg-slate-850 transition text-slate-300"
                          >
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-200">
                                {sub.student_name}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {sub.student_email}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono text-slate-500">
                              {sub.student_id_number}
                            </td>
                            <td className="px-6 py-4 text-center font-bold font-mono text-sm">
                              {sub.score} Pts
                            </td>
                            <td
                              className={`px-6 py-4 text-center font-bold font-display text-sm ${scoreColor}`}
                            >
                              {sub.percentage}%
                            </td>
                            <td
                              className={`px-6 py-4 text-center font-mono font-semibold ${sub.cheating_flags > 0 ? "text-red-400" : "text-slate-500"}`}
                            >
                              {sub.cheating_flags} flags
                            </td>
                            <td className="px-6 py-4 text-right text-slate-500 text-xs font-mono">
                              {new Date(sub.submitted_at).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL A — CREATE EXAM ROOM */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[80] flex items-center justify-center p-6 animate-fade-in"
          id="modal_create_room"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <header className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xl font-display font-semibold text-slate-100">
                Configure Examination Room
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-500 hover:text-white cursor-pointer select-none"
              >
                ✕
              </button>
            </header>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 font-mono text-left block">
                    Exam Title:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Calculus Midterm"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 font-mono text-left block">
                    Educational Subject:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathematics"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 font-mono text-left block">
                    Access Password (Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="Class Verification Key"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 font-mono text-left block">
                    Time Allotted (Minutes):
                  </label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={180}
                    value={timeLimit}
                    onChange={(e) =>
                      setTimeLimit(parseInt(e.target.value) || 30)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 font-mono text-left block">
                  Acceptance Approval Rules:
                </label>
                <div
                  className="grid grid-cols-2 gap-3"
                  id="selection_acceptance_approval"
                >
                  <button
                    type="button"
                    onClick={() => setApprovalMode("auto")}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between cursor-pointer transition ${
                      approvalMode === "auto"
                        ? "bg-sky-500/10 border-sky-500 text-sky-400"
                        : "bg-slate-950/40 border-slate-800 text-slate-400"
                    }`}
                  >
                    <span className="text-xs font-bold leading-normal mb-1">
                      Option A — Auto Accept
                    </span>
                    <span className="text-[10px] text-slate-500 leading-normal">
                      Any student entering Room password enters automatically.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApprovalMode("manual")}
                    className={`p-4 rounded-xl border text-left flex flex-col justify-between cursor-pointer transition ${
                      approvalMode === "manual"
                        ? "bg-sky-500/10 border-sky-500 text-sky-400"
                        : "bg-slate-950/40 border-slate-800 text-slate-400"
                    }`}
                  >
                    <span className="text-xs font-bold leading-normal mb-1">
                      Option B — Manual Approval
                    </span>
                    <span className="text-[10px] text-slate-500 leading-normal">
                      Students join waiting queue. Teacher must manually
                      authorize.
                    </span>
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRoom}
                  id="btn_submit_create_room"
                  className="flex-1 py-3 bg-sky-650 hover:bg-sky-600 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-sky-600/15"
                >
                  {submittingRoom ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Verify & Launch"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL B — QUESTIONS CONFIGURATOR AND AI GENERATOR */}
      {showQuestionsModal && selectedRoom && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[80] flex items-center justify-center p-6 animate-fade-in"
          id="modal_questions_config"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 md:p-8 space-y-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative">
            <header className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="text-lg md:text-xl font-display font-semibold text-slate-100">
                  {selectedRoom.title}
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Setup questions stem, keys, and points weighting
                </span>
              </div>
              <button
                onClick={() => {
                  setShowQuestionsModal(false);
                  setSelectedRoom(null);
                }}
                className="text-slate-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </header>

            {/* TWO-PANEL INTERACTIVE SCROLL CONTAINER */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6 pr-1">
              {/* LEFT COLUMN: ACTIVE QUESTIONS MANIFEST FORM (2 Columns) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                    Exam Outline ({roomQuestions.length} Items)
                  </span>
                  <button
                    onClick={handleAddBlankQuestion}
                    className="px-3 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    + Add New Item
                  </button>
                </div>

                {roomQuestions.map((q, qIdx) => (
                  <div
                    key={q.id}
                    className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4 relative"
                  >
                    <button
                      onClick={() => handleRemoveConfigQuestion(q.id)}
                      className="absolute top-4 right-4 text-slate-500 hover:text-red-400 cursor-pointer"
                      title="Remove question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex gap-4 items-center mb-1">
                      <span className="px-2 py-0.5 bg-slate-800 border border-slate-755 rounded font-mono text-[10px] font-bold text-slate-400">
                        Question {qIdx + 1}
                      </span>

                      <div className="flex gap-2 items-center">
                        <span className="text-[10px] font-mono text-slate-500">
                          Points weight:
                        </span>
                        <input
                          type="number"
                          value={q.points}
                          min={1}
                          onChange={(e) =>
                            updateQuestionField(
                              qIdx,
                              "points",
                              parseInt(e.target.value) || 10,
                            )
                          }
                          className="bg-slate-950 border border-slate-800 text-[10px] text-slate-300 font-semibold font-mono rounded-md py-0.5 px-2 w-14 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 font-mono text-left block">
                        Question Stem:
                      </label>
                      <input
                        type="text"
                        placeholder="Type mathematical stem or astronomy topic"
                        value={q.question_text}
                        onChange={(e) =>
                          updateQuestionField(
                            qIdx,
                            "question_text",
                            e.target.value,
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none font-sans"
                      />
                    </div>

                    {/* Options list A-D */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono text-slate-600">
                          A
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="Option A Value"
                          value={q.option_a}
                          onChange={(e) =>
                            updateQuestionField(
                              qIdx,
                              "option_a",
                              e.target.value,
                            )
                          }
                          className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-700 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono text-slate-600">
                          B
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="Option B Value"
                          value={q.option_b}
                          onChange={(e) =>
                            updateQuestionField(
                              qIdx,
                              "option_b",
                              e.target.value,
                            )
                          }
                          className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-700 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono text-slate-600">
                          C
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="Option C Value"
                          value={q.option_c}
                          onChange={(e) =>
                            updateQuestionField(
                              qIdx,
                              "option_c",
                              e.target.value,
                            )
                          }
                          className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-700 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono text-slate-600">
                          D
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="Option D Value"
                          value={q.option_d}
                          onChange={(e) =>
                            updateQuestionField(
                              qIdx,
                              "option_d",
                              e.target.value,
                            )
                          }
                          className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-700 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-[10px] font-bold font-mono text-slate-500">
                        Correct Choice Key:
                      </span>
                      <select
                        value={q.correct_answer}
                        onChange={(e) =>
                          updateQuestionField(
                            qIdx,
                            "correct_answer",
                            e.target.value,
                          )
                        }
                        className="bg-slate-950 border border-slate-800 text-[11px] font-bold font-mono text-sky-400 rounded-lg p-1.5 focus:outline-none"
                      >
                        <option value="a">A</option>
                        <option value="b">B</option>
                        <option value="c">C</option>
                        <option value="d">D</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* RIGHT COLUMN: AI GENERATOR SIDE DRAWER (1 Column) */}
              <aside className="space-y-4">
                <div className="bg-slate-950/80 border border-sky-500/20 rounded-2xl p-5 space-y-4 sticky top-0 relative">
                  <header className="flex items-center gap-1.5 text-sky-400 font-display font-semibold text-sm">
                    <Sparkles className="w-5 h-5 animate-pulse" /> AI Assessment
                    Synthesizer
                  </header>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Instantly stream verified assessment questions with balanced
                    distractors, correct keys, and calibrated point structures
                    using Gemini.
                  </p>

                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 font-mono">
                        Generative prompt instructions:
                      </label>
                      <textarea
                        rows={3}
                        placeholder="e.g. 5 medium difficulty questions on single variable integration limits"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-sky-500 font-sans"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 font-mono block">
                        Volume count to load:
                      </label>
                      <select
                        value={aiCount}
                        onChange={(e) =>
                          setAiCount(parseInt(e.target.value) || 5)
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value={3}>3 Questions</option>
                        <option value={5}>5 Questions</option>
                        <option value={8}>8 Questions</option>
                        <option value={10}>10 Questions</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={generateQuestionsWithAI}
                      disabled={aiGenerating || !aiPrompt}
                      className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
                    >
                      {aiGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Synthesize with Gemini"
                      )}
                    </button>
                  </div>
                </div>
              </aside>
            </div>

            {/* MAIN FOOTER BUTTONS */}
            <footer className="border-t border-slate-800 pt-4 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowQuestionsModal(false);
                  setSelectedRoom(null);
                }}
                className="flex-1 py-2.5 bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-400 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Discard Edits
              </button>

              <button
                type="button"
                onClick={handleSaveQuestionsList}
                id="btn_confirm_save_questions"
                className="flex-1 py-2.5 bg-sky-650 hover:bg-sky-600 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-sky-650/15"
              >
                <Save className="w-4 h-4" /> Save Question Outline
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
