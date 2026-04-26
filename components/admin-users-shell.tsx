"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { fetchAdminUsers, updateAdminUserStatus, type AuthUser, type UserStatus } from "@/lib/auth";

function statusBadge(status: UserStatus) {
  if (status === "APPROVED") {
    return "badge-soft green";
  }
  if (status === "PENDING") {
    return "badge-soft gold";
  }
  return "badge-soft red";
}

export function AdminUsersShell() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionUserId, setActionUserId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  async function loadUsers() {
    try {
      const result = await fetchAdminUsers();
      setUsers(result);
      setMessage("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load users.");
      setMessageTone("error");
    } finally {
      setPageLoading(false);
    }
  }

  async function handleStatusChange(targetUser: AuthUser, status: UserStatus) {
    try {
      setActionUserId(targetUser.id);
      const updated = await updateAdminUserStatus(targetUser.id, status);
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(`${updated.email} updated to ${updated.status}.`);
      setMessageTone("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update user status.");
      setMessageTone("error");
    } finally {
      setActionUserId(null);
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (!loading && user?.role !== "ADMIN") {
      router.replace("/");
      return;
    }
    if (!loading && user?.role === "ADMIN") {
      void loadUsers();
    }
  }, [loading, router, user]);

  if (loading || pageLoading) {
    return <div className="muted">Loading admin approvals...</div>;
  }

  if (!user || user.role !== "ADMIN") {
    return <div className="muted">Admin access required.</div>;
  }

  return (
    <section className="dashboard-panel">
      <div className="p-3 p-lg-4">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
          <div>
            <h2 className="panel-title mb-2">User Approval Desk</h2>
            <div className="muted">
              Review pending Gmail signups and move accounts between approved, rejected, and blocked states.
            </div>
          </div>
          <button className="btn btn-outline-light" onClick={() => void loadUsers()} type="button">
            Refresh
          </button>
        </div>

        {message ? (
          <div className={`alert ${messageTone === "success" ? "alert-success" : "alert-danger"}`}>{message}</div>
        ) : null}

        <div className="table-responsive">
          <table className="table table-dark align-middle mb-0">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.id}>
                  <td>{item.email}</td>
                  <td>{item.name || "-"}</td>
                  <td>{item.role}</td>
                  <td>
                    <span className={statusBadge(item.status)}>{item.status}</span>
                  </td>
                  <td>{item.created_at ? new Date(item.created_at).toLocaleString() : "-"}</td>
                  <td>{item.last_login_at ? new Date(item.last_login_at).toLocaleString() : "-"}</td>
                  <td>
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        className="btn btn-sm btn-success"
                        disabled={actionUserId === item.id || item.status === "APPROVED"}
                        onClick={() => void handleStatusChange(item, "APPROVED")}
                        type="button"
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-sm btn-outline-warning"
                        disabled={actionUserId === item.id || item.status === "REJECTED"}
                        onClick={() => void handleStatusChange(item, "REJECTED")}
                        type="button"
                      >
                        Reject
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        disabled={actionUserId === item.id || item.status === "BLOCKED"}
                        onClick={() => void handleStatusChange(item, "BLOCKED")}
                        type="button"
                      >
                        Block
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length ? (
                <tr>
                  <td className="muted" colSpan={7}>
                    No users found yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
