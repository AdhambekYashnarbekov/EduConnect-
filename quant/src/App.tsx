/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  LogOut,
  Key,
  UserCheck,
  Play,
  ArrowRight,
  Users,
  GraduationCap,
  Monitor,
  Sparkles,
  BookOpen,
} from "lucide-react";
import StudentPortal from "./components/StudentPortal";
import TeacherPortal from "./components/TeacherPortal";
import AdminPortal from "./components/AdminPortal";
import ExamScreen from "./components/ExamScreen";
import { AuthResponse, TestRoom, Question } from "./types";

export default function App() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Auth Forms
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [regRole, setRegRole] = useState<"student" | "teacher">("student");

  // Forms states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [institution, setInstitution] = useState("");
  const [studentIdInput, setStudentIdInput] = useState("");
  const [departmentInput, setDepartmentInput] = useState("");

  // Handlers and feedbacks
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active testing chamber overlay states
  const [activeSession, setActiveSession] = useState<{
    room: TestRoom;
    questions: Question[];
  } | null>(null);

  // Automatic session restore
  useEffect(() => {
    const savedToken = localStorage.getItem("quant_token");
    if (savedToken) {
      restoreSession(savedToken);
    }
  }, []);

  const restoreSession = async (token: string) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAuthToken(token);
        setCurrentUser(data.user);
        localStorage.setItem("quant_token", token);
      } else {
        handleLogout();
      }
    } catch (e) {
      handleLogout();
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    localStorage.removeItem("quant_token");
    setAuthError(null);
    setSuccessMsg(null);
  };

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!email || !password) return;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.error || "Login verification failed.");
        return;
      }

      setAuthToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem("quant_token", data.token);
      setSuccessMsg("Logged in successfully!");
      // Reset text inputs
      setEmail("");
      setPassword("");
    } catch (err) {
      setAuthError("Could not reach secure login server.");
    }
  };

  // Register handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSuccessMsg(null);

    if (!email || !password || !fullName || !institution) {
      setAuthError("Please fill in all requested fields.");
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: regRole,
          full_name: fullName,
          email,
          password,
          institution,
          student_id: regRole === "student" ? studentIdInput : undefined,
          department: regRole === "teacher" ? departmentInput : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.error || "Registration validation failed.");
        return;
      }

      setAuthToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem("quant_token", data.token);
      setSuccessMsg("Account registered successfully!");

      // Clear inputs
      setFullName("");
      setEmail("");
      setPassword("");
      setInstitution("");
      setStudentIdInput("");
      setDepartmentInput("");
    } catch (err) {
      setAuthError("Connection issue during registration.");
    }
  };

  // ACTOR SIMULATOR HELPER FOR LECTURERS & EVALUATORS
  const simulateActorLogin = async (simEmail: string, simPass: string) => {
    setAuthError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: simEmail, password: simPass }),
      });
      const data = await response.json();
      if (response.ok) {
        setAuthToken(data.token);
        setCurrentUser(data.user);
        localStorage.setItem("quant_token", data.token);
      } else {
        setAuthError(`Simulation failed: ${data.error}`);
      }
    } catch (e) {
      setAuthError("Failed to mock simulator endpoints.");
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative"
      id="quant_root"
    >
      {/* 1. DEVELOPER DEMO ACTOR SWITCHER BAR */}
      <div
        className="bg-slate-900/90 border-b border-sky-500/20 px-4 py-2 flex flex-wrap gap-2 items-center justify-between shadow-md relative z-[100] backdrop-blur-sm"
        id="actor_switcher_bar"
      >
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold tracking-widest text-sky-450 text-sky-400 uppercase">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Sandbox Actor
          Simulator
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              simulateActorLogin("teacher@quant.edu", "teacher123")
            }
            className={`px-3 py-1 text-[10px] font-bold font-mono rounded-md border transition cursor-pointer ${
              currentUser?.email === "teacher@quant.edu"
                ? "bg-sky-500/10 border-sky-500 text-sky-400 font-bold"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            👨‍🏫 Dr. Mitchell (Lecturer)
          </button>
          <button
            onClick={() =>
              simulateActorLogin("student1@quant.edu", "student123")
            }
            className={`px-3 py-1 text-[10px] font-bold font-mono rounded-md border transition cursor-pointer ${
              currentUser?.email === "student1@quant.edu"
                ? "bg-sky-500/10 border-sky-500 text-sky-400 font-bold"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            🎓 Alex Mercer (Student)
          </button>
          <button
            onClick={() =>
              simulateActorLogin("student2@quant.edu", "student123")
            }
            className={`px-3 py-1 text-[10px] font-bold font-mono rounded-md border transition cursor-pointer ${
              currentUser?.email === "student2@quant.edu"
                ? "bg-sky-500/10 border-sky-500 text-sky-400 font-bold"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            🎓 Emma Watson (Student)
          </button>
          <button
            onClick={() => simulateActorLogin("admin@quant.edu", "admin123")}
            className={`px-3 py-1 text-[10px] font-bold font-mono rounded-md border transition cursor-pointer ${
              currentUser?.email === "admin@quant.edu"
                ? "bg-sky-500/10 border-sky-500 text-sky-400 font-bold"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            🛡️ Evelyn Carter (Admin)
          </button>
        </div>

        <div className="text-[10px] font-mono text-slate-500">
          Evaluator shortcuts
        </div>
      </div>

      {/* 2. CHIEF HEADER & BRAND CAROUSEL (IF LOGGED IN) */}
      {currentUser && !activeSession && (
        <nav
          className="bg-slate-900 border-b border-slate-850 px-6 py-4 flex items-center justify-between sticky top-0 z-45"
          id="main_dashboard_navbar"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-700 flex items-center justify-center font-display font-extrabold text-white text-base shadow-md shadow-sky-500/15">
              D
            </div>
            <div>
              <span className="font-display font-bold text-lg text-slate-100 tracking-tight leading-none block">
                Dono
              </span>
              <span className="text-[10px] font-mono text-sky-400 lowercase tracking-wider">
                {currentUser.institution}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-200">
                {currentUser.full_name}
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                {currentUser.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              id="btn_logout"
              className="p-2 bg-slate-850 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-red-400 border border-slate-800 hover:border-slate-750 cursor-pointer transition flex items-center gap-1 text-xs font-mono"
              title="Logout session"
            >
              <LogOut className="w-4 h-4" />{" "}
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </nav>
      )}

      {/* 3. DYNAMIC WORKSPACE ROUTER VIEWPORT */}
      {activeSession ? (
        <ExamScreen
          room={activeSession.room}
          questions={activeSession.questions}
          authToken={authToken!}
          onFinished={() => {
            setActiveSession(null);
            // Force status reload
            window.location.reload();
          }}
        />
      ) : currentUser ? (
        <main
          className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8"
          id="quant_dashboard_main_wrapper"
        >
          {currentUser.role === "student" && (
            <StudentPortal
              user={currentUser}
              authToken={authToken!}
              onEnterExam={(room, questions) => {
                setActiveSession({ room, questions });
              }}
            />
          )}

          {currentUser.role === "teacher" && (
            <TeacherPortal user={currentUser} authToken={authToken!} />
          )}

          {currentUser.role === "admin" && (
            <AdminPortal authToken={authToken!} />
          )}
        </main>
      ) : (
        /* 4. LANDING AND AUTHENTICATION GATEWAY */
        <div
          className="flex-1 flex flex-col justify-center items-center p-6"
          id="quant_auth_lobby"
        >
          <div className="max-w-md w-full text-center space-y-8 mb-6 mt-4">
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-sky-500 to-sky-700 flex items-center justify-center font-display font-extrabold text-white text-3xl mx-auto shadow-xl shadow-sky-500/10">
                D
              </div>
              <h1 className="text-4xl font-display font-extrabold text-slate-100 tracking-tight leading-none">
                Dono
              </h1>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                AI-Powered Academic Examination & Deep Learner Diagnostic
                Ecosystem.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-850 shadow-2xl rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Form Title & Toggles */}
            <div
              className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800"
              id="auth_portal_toggles"
            >
              <button
                type="button"
                onClick={() => setIsRegisterMode(false)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition overflow-hidden cursor-pointer ${
                  !isRegisterMode
                    ? "bg-sky-500 text-white shadow-md shadow-sky-500/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setIsRegisterMode(true)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition overflow-hidden cursor-pointer ${
                  isRegisterMode
                    ? "bg-sky-500 text-white shadow-md shadow-sky-500/10"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-xl text-center font-medium">
                {authError}
              </p>
            )}

            {successMsg && (
              <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl text-center font-medium">
                {successMsg}
              </p>
            )}

            {/* REGISTER PORTAL FORM */}
            {isRegisterMode ? (
              <form
                onSubmit={handleRegisterSubmit}
                className="space-y-4"
                id="register_form"
              >
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-mono font-bold text-left block">
                    Educational Capacity:
                  </label>
                  <div
                    className="grid grid-cols-2 gap-3"
                    id="selection_reg_role"
                  >
                    <button
                      type="button"
                      onClick={() => setRegRole("student")}
                      className={`py-3 px-4 rounded-xl border text-center font-medium font-mono text-xs cursor-pointer transition ${
                        regRole === "student"
                          ? "bg-sky-500/10 border-sky-500 text-sky-400"
                          : "bg-slate-950 border-slate-850 text-slate-400"
                      }`}
                    >
                      🎓 Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole("teacher")}
                      className={`py-3 px-4 rounded-xl border text-center font-medium font-mono text-xs cursor-pointer transition ${
                        regRole === "teacher"
                          ? "bg-sky-500/10 border-sky-500 text-sky-400"
                          : "bg-slate-950 border-slate-850 text-slate-400"
                      }`}
                    >
                      👨‍🏫 Teacher / Prof
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-mono text-left block">
                    Full Name:
                  </label>
                  <input
                    type="text"
                    required
                    required-placeholder="E.g. Dr. Arthur Mitchell"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-sky-500 rounded-xl px-4 py-2 text-xs placeholder-slate-700 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-mono text-left block">
                      Institutional Email:
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-sky-500 rounded-xl px-4 py-2 text-xs placeholder-slate-700 text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-mono text-left block">
                      Create Password:
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-sky-500 rounded-xl px-4 py-2 text-xs placeholder-slate-700 text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-mono text-left block">
                    Institution Name:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stanford University"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-sky-500 rounded-xl px-4 py-2 text-xs placeholder-slate-700 text-slate-200 focus:outline-none"
                  />
                </div>

                {/* Sub Role details inputs */}
                {regRole === "student" ? (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-xs text-slate-400 font-mono text-left block">
                      Student ID Number:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. STU-2026-004"
                      value={studentIdInput}
                      onChange={(e) => setStudentIdInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-sky-500 rounded-xl px-4 py-2 text-xs placeholder-slate-700 text-slate-100 focus:outline-none font-mono"
                    />
                  </div>
                ) : (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-xs text-slate-400 font-mono text-left block">
                      Department Name:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Computer Science Science"
                      value={departmentInput}
                      onChange={(e) => setDepartmentInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-sky-500 rounded-xl px-4 py-2 text-xs placeholder-slate-700 text-slate-100 focus:outline-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  id="btn_register"
                  className="w-full mt-4 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition select-none flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  Verify Registrations <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* LOGIN PORTAL FORM */
              <form
                onSubmit={handleLoginSubmit}
                className="space-y-4"
                id="login_form"
              >
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-mono text-left block">
                    Email Address:
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. teacher@quant.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs placeholder-slate-700 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-mono text-left block">
                    Password:
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Verification Key"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs placeholder-slate-700 text-slate-100 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  id="btn_login"
                  className="w-full mt-4 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition select-none flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  Confirm Sign In <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 5. GREETING FOOTER */}
      <footer className="py-6 border-t border-slate-900 text-center text-[10px] font-mono text-slate-600 shrink-0">
        Dono Assessment Services, International Inc. © 2026. All Rights
        Reserved.
      </footer>
    </div>
  );
}
