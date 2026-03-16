"use client";

import { useEffect, useState, useCallback } from "react";
import { Mail, Check } from "lucide-react";

interface User {
  id: number;
  clerkId: string;
  repName: string;
  repCode: string;
  role: string;
}

const ROLES = ["rep", "manager", "admin"];

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
        else setError(data.error || "Failed to load users");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleRoleChange(id: number, role: string) {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    });
    fetchData();
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Remove ${name} from the system?`)) return;
    await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    fetchData();
  }

  async function handleInvite() {
    if (!inviteEmail) {
      setError("Email is required");
      return;
    }
    setInviting(true);
    setError("");
    setInviteSuccess("");
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteSuccess(`Invitation sent to ${inviteEmail}`);
        setInviteEmail("");
        setTimeout(() => setInviteSuccess(""), 5000);
      } else {
        setError(data.error || "Failed to send invitation");
      }
    } finally {
      setInviting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">User Management</h1>

      {/* Current users */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-3">
          Current Users ({users.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Name</th>
                <th className="py-2">Rep Code</th>
                <th className="py-2">Clerk ID</th>
                <th className="py-2">Role</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="py-2 font-medium">{u.repName}</td>
                  <td className="py-2 text-gray-500">{u.repCode}</td>
                  <td className="py-2 text-xs text-gray-400 font-mono">
                    {u.clerkId.slice(0, 16)}...
                  </td>
                  <td className="py-2">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => handleDelete(u.id, u.repName)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite user */}
      <div className="border rounded-lg p-6 max-w-lg">
        <h2 className="text-lg font-semibold mb-2">Invite User</h2>
        <p className="text-sm text-gray-500 mb-4">
          Send an email invitation. They&apos;ll be added as a manager when they sign up.
        </p>

        {inviteSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
            <Check size={16} className="text-emerald-600" />
            <p className="text-sm text-emerald-800">{inviteSuccess}</p>
          </div>
        )}

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              placeholder="colleague@company.com"
              className="border rounded-lg pl-9 pr-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail}
            className="bg-slate-900 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {inviting ? "Sending..." : "Send Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}
