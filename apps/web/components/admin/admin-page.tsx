"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type UserRole = "USER" | "ADMIN";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

type CreateUserForm = {
  email: string;
  password: string;
  name: string;
  role: UserRole;
};

type UpdateUserForm = {
  email: string;
  name: string;
  password: string;
  role: UserRole;
};

function getErrorMessage(error: unknown, fallback = "Request failed") {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

export function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [createForm, setCreateForm] = useState<CreateUserForm>({
    email: "",
    password: "",
    name: "",
    role: "USER",
  });

  const [updateForm, setUpdateForm] = useState<UpdateUserForm>({
    email: "",
    name: "",
    password: "",
    role: "USER",
  });

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        setError("");
        const data = await apiFetch<User[]>("/admin/users", { token });

        if (cancelled) return;

        setUsers(data);

        if (data.length > 0) {
          const first = data[0];
          setSelectedUser(first);
          setUpdateForm({
            email: first.email,
            name: first.name ?? "",
            password: "",
            role: first.role,
          });
        }
      } catch (err: unknown) {
        if (cancelled) return;

        const message = getErrorMessage(err, "Failed to load users");
        setError(message);

        if (message.toLowerCase().includes("unauthorized")) {
          localStorage.removeItem("accessToken");
          router.push("/login");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [router, token]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;

    return users.filter((user) => {
      const name = user.name?.toLowerCase() ?? "";
      return (
        user.email.toLowerCase().includes(q) ||
        name.includes(q) ||
        user.role.toLowerCase().includes(q)
      );
    });
  }, [search, users]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const created = await apiFetch<User>("/admin/users", {
        method: "POST",
        token,
        body: createForm,
      });

      setUsers((prev) => [created, ...prev]);
      setSelectedUser(created);
      setUpdateForm({
        email: created.email,
        name: created.name ?? "",
        password: "",
        role: created.role,
      });
      setCreateForm({
        email: "",
        password: "",
        name: "",
        role: "USER",
      });
      setSuccess("User created successfully");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create user"));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !selectedUser) return;

    setSaving(true);
    setError("");
    setSuccess("");

    const payload: {
      email?: string;
      name?: string;
      password?: string;
      role?: UserRole;
    } = {
      email: updateForm.email.trim(),
      name: updateForm.name.trim(),
      role: updateForm.role,
    };

    if (updateForm.password.trim()) {
      payload.password = updateForm.password.trim();
    }

    try {
      const updated = await apiFetch<User>(`/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        token,
        body: payload,
      });

      setUsers((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSelectedUser(updated);
      setUpdateForm({
        email: updated.email,
        name: updated.name ?? "",
        password: "",
        role: updated.role,
      });
      setSuccess("User updated successfully");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to update user"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId: string) {
    if (!token) return;

    const confirmed = window.confirm("Delete this user?");
    if (!confirmed) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiFetch(`/admin/users/${userId}`, {
        method: "DELETE",
        token,
      });

      setUsers((prev) => prev.filter((item) => item.id !== userId));
      setSuccess("User deleted successfully");

      if (selectedUser?.id === userId) {
        const remaining = users.filter((item) => item.id !== userId);
        const nextUser = remaining[0] ?? null;
        setSelectedUser(nextUser);
        setUpdateForm(
          nextUser
            ? {
                email: nextUser.email,
                name: nextUser.name ?? "",
                password: "",
                role: nextUser.role,
              }
            : {
                email: "",
                name: "",
                password: "",
                role: "USER",
              },
        );
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to delete user"));
    } finally {
      setSaving(false);
    }
  }

  function selectUser(user: User) {
    setSelectedUser(user);
    setUpdateForm({
      email: user.email,
      name: user.name ?? "",
      password: "",
      role: user.role,
    });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="h-10 w-56 animate-pulse rounded-2xl bg-gray-200" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="h-[70vh] animate-pulse rounded-3xl bg-gray-200" />
          <div className="h-[70vh] animate-pulse rounded-3xl bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-gray-500">Admin Panel</p>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="mt-1 text-gray-600">
              Create, edit, delete, and change user roles.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <Stat label="Total" value={users.length} />
            <Stat
              label="Admin"
              value={users.filter((user) => user.role === "ADMIN").length}
            />
            <Stat
              label="User"
              value={users.filter((user) => user.role === "USER").length}
            />
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700">
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Create user</h2>
              <p className="text-sm text-gray-500">
                Admin can create a new account directly.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleCreate}>
              <Field
                label="Email"
                type="email"
                value={createForm.email}
                onChange={(value) =>
                  setCreateForm((prev) => ({ ...prev, email: value }))
                }
                placeholder="newuser@example.com"
              />

              <Field
                label="Password"
                type="password"
                value={createForm.password}
                onChange={(value) =>
                  setCreateForm((prev) => ({ ...prev, password: value }))
                }
                placeholder="Minimum 6 characters"
              />

              <Field
                label="Name"
                value={createForm.name}
                onChange={(value) =>
                  setCreateForm((prev) => ({ ...prev, name: value }))
                }
                placeholder="Optional"
              />

              <SelectField
                label="Role"
                value={createForm.role}
                onChange={(value) =>
                  setCreateForm((prev) => ({ ...prev, role: value as UserRole }))
                }
                options={[
                  { label: "USER", value: "USER" },
                  { label: "ADMIN", value: "ADMIN" },
                ]}
              />

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-black px-4 py-3 text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Create user"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Users</h2>
              <p className="text-sm text-gray-500">
                Click to edit or delete.
              </p>
            </div>

            <input
              className="mb-4 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-black/10"
              placeholder="Search by name, email, role"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {filteredUsers.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-center text-gray-500">
                  No users found.
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const active = selectedUser?.id === user.id;

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => selectUser(user)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-black bg-gray-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{user.email}</p>
                          <p className="mt-1 text-sm text-gray-500">
                            {user.name || "No name"}
                          </p>
                        </div>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase">
                          {user.role}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </aside>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Edit user</h2>
              <p className="text-sm text-gray-500">
                Update profile, role, password, or delete the selected user.
              </p>
            </div>

            {selectedUser ? (
              <button
                type="button"
                onClick={() => handleDelete(selectedUser.id)}
                disabled={saving}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
              >
                Delete
              </button>
            ) : null}
          </div>

          {selectedUser ? (
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleUpdate}>
              <Field
                label="Email"
                type="email"
                value={updateForm.email}
                onChange={(value) =>
                  setUpdateForm((prev) => ({ ...prev, email: value }))
                }
              />

              <SelectField
                label="Role"
                value={updateForm.role}
                onChange={(value) =>
                  setUpdateForm((prev) => ({ ...prev, role: value as UserRole }))
                }
                options={[
                  { label: "USER", value: "USER" },
                  { label: "ADMIN", value: "ADMIN" },
                ]}
              />

              <div className="md:col-span-2">
                <Field
                  label="Name"
                  value={updateForm.name}
                  onChange={(value) =>
                    setUpdateForm((prev) => ({ ...prev, name: value }))
                  }
                />
              </div>

              <div className="md:col-span-2">
                <Field
                  label="Password"
                  type="password"
                  value={updateForm.password}
                  onChange={(value) =>
                    setUpdateForm((prev) => ({ ...prev, password: value }))
                  }
                  placeholder="Leave blank if not changing"
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-black px-5 py-3 text-white disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setUpdateForm({
                      email: selectedUser.email,
                      name: selectedUser.name ?? "",
                      password: "",
                      role: selectedUser.role,
                    })
                  }
                  className="rounded-2xl border px-5 py-3"
                >
                  Reset form
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-2xl border border-dashed p-8 text-center text-gray-500">
              Select a user from the list to edit.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-gray-50 px-4 py-3 text-center">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type={type}
        className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-black/10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <select
        className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-black/10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}