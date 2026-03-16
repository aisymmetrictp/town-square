"use client";

import { useEffect, useState, useCallback } from "react";

interface User {
  id: number;
  clerkId: string;
  repName: string;
  repCode: string;
  role: string;
}

interface Rep {
  repName: string;
  repCode: string;
}

const ROLES = ["rep", "manager", "admin"];

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // New user form
  const [newClerkId, setNewClerkId] = useState("");
  const [newRepName, setNewRepName] = useState("");
  const [newRepCode, setNewRepCode] = useState("");
  const [newRole, setNewRole] = useState("rep");
  const [adding, setAdding] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/reps").then((r) => r.json()),
    ])
      .then(([usersData, repsData]) => {
        if (Array.isArray(usersData)) setUsers(usersData);
        else setError(usersData.error || "Failed to load users");
        if (Array.isArray(repsData)) setReps(repsData);
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

  async function handleAdd() {
    if (!newClerkId || !newRepName || !newRepCode) {
      setError("All fields are required");
      return;
    }
    setAdding(true);
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clerkId: newClerkId,
        repName: newRepName,
        repCode: newRepCode,
        role: newRole,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewClerkId("");
      setNewRepName("");
      setNewRepCode("");
      setNewRole("rep");
      fetchData();
    } else {
      setError(data.error || "Failed to add user");
    }
    setAdding(false);
  }

  function handleRepSelect(repName: string) {
    const rep = reps.find((r) => r.repName === repName);
    if (rep) {
      setNewRepName(rep.repName);
      setNewRepCode(rep.repCode);
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

      {/* Add user */}
      <div className="border rounded-lg p-6 max-w-lg">
        <h2 className="text-lg font-semibold mb-4">Add User</h2>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Clerk User ID
            </label>
            <input
              value={newClerkId}
              onChange={(e) => setNewClerkId(e.target.value)}
              placeholder="user_..."
              className="border rounded px-3 py-1.5 text-sm w-full"
            />
            <p className="text-xs text-gray-400 mt-1">
              Find this in the Clerk Dashboard under Users
            </p>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Link to Rep (from invoices)
            </label>
            <select
              onChange={(e) => handleRepSelect(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm w-full"
              defaultValue=""
            >
              <option value="" disabled>
                Select a rep...
              </option>
              {reps.map((r) => (
                <option key={r.repName} value={r.repName}>
                  {r.repName} ({r.repCode})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Rep Name
              </label>
              <input
                value={newRepName}
                onChange={(e) => setNewRepName(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Rep Code
              </label>
              <input
                value={newRepCode}
                onChange={(e) => setNewRepCode(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm w-full"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm w-full"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAdd}
            disabled={adding}
            className="bg-black text-white rounded px-5 py-2 text-sm hover:bg-gray-800 disabled:opacity-50 w-full"
          >
            {adding ? "Adding..." : "Add User"}
          </button>
        </div>
      </div>
    </div>
  );
}
