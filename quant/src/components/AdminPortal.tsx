/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Users,
  Shield,
  ShieldAlert,
  Check,
  Ban,
  Eye,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface AdminPortalProps {
  authToken: string;
}

export default function AdminPortal({ authToken }: AdminPortalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actioningUserId, setActioningUserId] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Fetch platform statistics
      const statsRes = await fetch("/api/admin/analytics", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch institutional users list
      const usersRes = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [authToken]);

  const handleToggleUserStatus = async (
    userId: string,
    currentStatus: "active" | "banned",
  ) => {
    setActioningUserId(userId);
    const newStatus = currentStatus === "active" ? "banned" : "active";
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // Update state locally
        setUsers(
          users.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)),
        );
        fetchAdminData(); // Refresh global numbers
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActioningUserId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in" id="admin_portal_container">
      {/* HEADER STATS BANNER */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center relative overflow-hidden shadow-xl">
        <div className="space-y-2">
          <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-400 rounded-full font-mono uppercase tracking-wider">
            Dono Governance Panel
          </span>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-100 tracking-tight">
            System Administration
          </h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Audit institutional student/teacher populations, manage access keys,
            and evaluate global server health benchmarks.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          id="btn_admin_refresh"
          className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white shrink-0 cursor-pointer border border-slate-700 transition"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="text-xs text-slate-500 font-mono">
              Registered Accounts
            </span>
            <div className="text-2xl font-bold font-display text-slate-100 mt-1">
              {stats.totalUsersCount}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="text-xs text-slate-500 font-mono">
              Students Census
            </span>
            <div className="text-2xl font-bold font-display text-sky-400 mt-1">
              {stats.studentsCount}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="text-xs text-slate-500 font-mono">
              Teachers Register
            </span>
            <div className="text-2xl font-bold font-display text-emerald-400 mt-1">
              {stats.teachersCount}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="text-xs text-slate-500 font-mono">
              Assessments Active
            </span>
            <div className="text-2xl font-bold font-display text-amber-500 mt-1">
              {stats.roomsCount}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <span className="text-xs text-slate-500 font-mono">
              Total Submissions
            </span>
            <div className="text-2xl font-bold font-display text-pink-400 mt-1">
              {stats.submissionsCount}
            </div>
          </div>
        </div>
      )}

      {/* DETAILED USERS CENSUS LIST */}
      <div className="space-y-4">
        <h2 className="text-lg font-display font-semibold tracking-tight text-slate-300 flex items-center gap-2">
          <Users className="w-5 h-5 text-sky-400" /> Platform Security
          Directories
        </h2>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500 text-sm bg-slate-900 rounded-2xl border border-slate-800">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" /> Retrieving
            census catalogs
          </div>
        ) : users.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
            No register records found.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-500 font-mono text-xs font-semibold uppercase">
                    <th className="px-6 py-4">Account Profile</th>
                    <th className="px-6 py-4">Assigned Role</th>
                    <th className="px-6 py-4">Institutional Affidavits</th>
                    <th className="px-6 py-4">Local ID / Dept</th>
                    <th className="px-6 py-4 text-center">Identity Status</th>
                    <th className="px-6 py-4 text-right">Restrict Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-850 transition text-slate-300"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-200">
                          {item.full_name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {item.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold font-mono tracking-wider ${
                            item.role === "admin"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/15"
                              : item.role === "teacher"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
                                : "bg-sky-500/10 text-sky-400 border border-sky-500/15"
                          }`}
                        >
                          {item.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {item.institution}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500">
                        {item.role === "student"
                          ? item.student_id
                          : item.department || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            item.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          }`}
                        >
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {item.role === "admin" ? (
                          <span className="text-xs text-slate-600 font-mono">
                            System Owner
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              handleToggleUserStatus(item.id, item.status)
                            }
                            disabled={actioningUserId === item.id}
                            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider transition select-none flex items-center justify-center gap-1.5 ml-auto cursor-pointer ${
                              item.status === "active"
                                ? "bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/15"
                                : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/15"
                            }`}
                          >
                            {actioningUserId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : item.status === "active" ? (
                              <>
                                <Ban className="w-3.5 h-3.5" /> Suspend
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" /> Restore
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
