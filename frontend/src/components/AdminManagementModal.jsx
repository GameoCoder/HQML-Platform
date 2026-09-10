import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldAlert,
  UserPlus,
  KeyRound,
  Trash2,
  Edit3,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  FlaskConical,
  ShieldCheck,
  Activity,
  Cpu,
  Lock,
  User
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  getUsersList,
  createUser,
  resetUserPassword,
  updateUser,
  deleteUser
} from '../lib/api.js'

export default function AdminManagementModal({ isOpen, onClose }) {
  const { token, user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('users') // 'users' | 'create' | 'health'
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' })

  // New User Form State
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('doctor')
  const [newName, setNewName] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newDepartment, setNewDepartment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset Password State
  const [resetTargetUser, setResetTargetUser] = useState(null)
  const [resetNewPass, setResetNewPass] = useState('')

  const loadUsers = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const res = await getUsersList(token)
      if (res?.status === 'success' && Array.isArray(res?.users)) {
        setUsers(res.users)
      }
    } catch (err) {
      console.error('Error loading users:', err)
      setStatusMessage({ text: err.message || 'Failed to load user list', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (isOpen) {
      loadUsers()
    }
  }, [isOpen, loadUsers])

  const handleCreateUser = async (e) => {
    e?.preventDefault()
    if (!newUsername.trim() || !newPassword.trim()) {
      setStatusMessage({ text: 'Username and password are required.', type: 'error' })
      return
    }

    setIsSubmitting(true)
    setStatusMessage({ text: '', type: '' })
    try {
      const res = await createUser(token, {
        username: newUsername.trim(),
        password: newPassword.trim(),
        role: newRole,
        name: newName.trim(),
        title: newTitle.trim(),
        department: newDepartment.trim(),
      })

      if (res?.status === 'success') {
        setStatusMessage({ text: `User '${newUsername}' created successfully!`, type: 'success' })
        setNewUsername('')
        setNewPassword('')
        setNewName('')
        setNewTitle('')
        setNewDepartment('')
        setActiveTab('users')
        loadUsers()
      }
    } catch (err) {
      setStatusMessage({ text: err.message || 'Failed to create user', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async (e) => {
    e?.preventDefault()
    if (!resetTargetUser || !resetNewPass.trim()) return

    try {
      const res = await resetUserPassword(token, {
        username: resetTargetUser.username,
        new_password: resetNewPass.trim(),
      })
      if (res?.status === 'success') {
        setStatusMessage({ text: `Password for ${resetTargetUser.username} updated.`, type: 'success' })
        setResetTargetUser(null)
        setResetNewPass('')
        loadUsers()
      }
    } catch (err) {
      setStatusMessage({ text: err.message || 'Password reset failed', type: 'error' })
    }
  }

  const handleDeleteUser = async (username) => {
    if (username === 'admin') {
      alert('Cannot delete the root administrator account.')
      return
    }
    if (!window.confirm(`Are you sure you want to permanently delete user '${username}'?`)) {
      return
    }

    try {
      const res = await deleteUser(token, { username })
      if (res?.status === 'success') {
        setStatusMessage({ text: `User '${username}' deleted.`, type: 'success' })
        loadUsers()
      }
    } catch (err) {
      setStatusMessage({ text: err.message || 'Delete user failed', type: 'error' })
    }
  }

  if (!isOpen) return null

  const doctorCount = users.filter((u) => u.role === 'doctor').length
  const researcherCount = users.filter((u) => u.role === 'researcher').length
  const adminCount = users.filter((u) => u.role === 'admin').length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(5,4,7,0.85)', backdropFilter: 'blur(12px)' }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 15 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex h-[88vh] max-h-[850px] w-full max-w-5xl flex-col overflow-hidden rounded-[26px] border border-white/15"
        style={{
          background: 'linear-gradient(170deg, rgba(16,13,20,0.95) 0%, rgba(8,6,10,0.98) 100%)',
          boxShadow: '0 0 60px -10px rgba(216,27,64,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-crimson-400/40 bg-crimson-900/30 text-blush-200 shadow-[0_0_15px_rgba(216,27,64,0.5)]">
              <ShieldAlert size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold tracking-wide text-mist">
                  Administrator Governance Center
                </h3>
                <span className="rounded-md border border-crimson-400/30 bg-crimson-950/50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-blush-200">
                  Level-5 Root
                </span>
              </div>
              <p className="font-mono text-[11px] text-white/40">
                User Directory & Role-Based Access Control (RBAC) Management
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status Alerts */}
        {statusMessage.text && (
          <div
            className={`flex items-center justify-between px-6 py-2 font-mono text-xs ${
              statusMessage.type === 'error'
                ? 'border-b border-red-500/30 bg-red-950/40 text-red-300'
                : 'border-b border-green-500/30 bg-green-950/40 text-green-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage({ text: '', type: '' })}
              className="text-white/40 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-2.5 bg-white/[0.01]">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`rounded-xl px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'border border-blush-400/30 bg-crimson-900/30 text-blush-200 shadow-[0_0_12px_rgba(216,27,64,0.3)]'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              Active Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'create'
                  ? 'border border-teal-400/30 bg-teal-950/40 text-teal-200 shadow-[0_0_12px_rgba(20,184,166,0.3)]'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <UserPlus size={13} />
              + Create User
            </button>
          </div>

          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] text-white/50 hover:text-blush-200 transition-colors cursor-pointer"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-3 gap-3.5">
                <div className="rounded-2xl border border-teal-500/20 bg-teal-950/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10.5px] uppercase tracking-wider text-teal-300">
                      User 1 // Doctors
                    </span>
                    <Stethoscope size={16} className="text-teal-400" />
                  </div>
                  <div className="mt-2 font-display text-2xl font-bold text-mist">{doctorCount}</div>
                  <p className="mt-0.5 font-mono text-[10px] text-white/40">
                    Clearance: Chest X-Ray Images Only
                  </p>
                </div>

                <div className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10.5px] uppercase tracking-wider text-purple-300">
                      User 2 // Researchers
                    </span>
                    <FlaskConical size={16} className="text-purple-400" />
                  </div>
                  <div className="mt-2 font-display text-2xl font-bold text-mist">{researcherCount}</div>
                  <p className="mt-0.5 font-mono text-[10px] text-white/40">
                    Clearance: Images & Raw CSV Data
                  </p>
                </div>

                <div className="rounded-2xl border border-crimson-500/20 bg-crimson-950/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10.5px] uppercase tracking-wider text-blush-300">
                      User 3 // Admins
                    </span>
                    <ShieldCheck size={16} className="text-crimson-400" />
                  </div>
                  <div className="mt-2 font-display text-2xl font-bold text-mist">{adminCount}</div>
                  <p className="mt-0.5 font-mono text-[10px] text-white/40">
                    Clearance: Full Diagnostic & User Mgmt
                  </p>
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                <table className="w-full text-left font-body text-xs text-white/70">
                  <thead className="border-b border-white/10 bg-white/[0.03] font-mono text-[10.5px] uppercase tracking-wider text-white/40">
                    <tr>
                      <th className="px-4 py-3">Operator / Username</th>
                      <th className="px-4 py-3">Role & Clearance</th>
                      <th className="px-4 py-3">Full Name & Title</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {users.map((u) => (
                      <tr key={u.username} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-mist font-bold text-[11px]">
                              {u.username.slice(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <span className="font-semibold text-mist">{u.username}</span>
                              {u.is_default && (
                                <span className="ml-1.5 rounded border border-white/10 bg-white/[0.03] px-1 py-0.2 font-mono text-[8.5px] text-white/30">
                                  Default
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.8 text-[10.5px] uppercase font-semibold ${
                              u.role === 'doctor'
                                ? 'border border-teal-500/30 bg-teal-950/50 text-teal-300'
                                : u.role === 'researcher'
                                ? 'border border-purple-500/30 bg-purple-950/50 text-purple-300'
                                : 'border border-crimson-500/30 bg-crimson-950/50 text-blush-200'
                            }`}
                          >
                            {u.role === 'doctor' && <Stethoscope size={10} />}
                            {u.role === 'researcher' && <FlaskConical size={10} />}
                            {u.role === 'admin' && <ShieldCheck size={10} />}
                            {u.role}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-body">
                          <p className="font-medium text-mist">{u.name}</p>
                          <p className="text-[11px] text-white/40">{u.title}</p>
                        </td>

                        <td className="px-4 py-3.5 font-body text-white/50">{u.department}</td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setResetTargetUser(u)
                                setResetNewPass('')
                              }}
                              className="flex h-7 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-[10px] text-white/60 hover:border-blush-400/40 hover:text-blush-200 transition-colors cursor-pointer"
                              title="Reset Password"
                            >
                              <KeyRound size={11} />
                              <span>Pass</span>
                            </button>

                            {u.username !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(u.username)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/20 bg-red-950/20 text-red-400 hover:bg-red-900/40 transition-colors cursor-pointer"
                                title="Delete User"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-5 border-b border-white/10 pb-3">
                <h4 className="font-display text-base font-bold text-mist">Register New Diagnostic Operator</h4>
                <p className="font-mono text-[11px] text-white/40">
                  Provision new credentials and assign specific role constraints.
                </p>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4 font-body">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-wider text-white/50">
                      Username / ID *
                    </label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. dr_harrison"
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 px-3 text-xs text-mist placeholder:text-white/20 focus:border-blush-400/50 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-wider text-white/50">
                      Initial Password *
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 4 characters"
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 px-3 text-xs text-mist placeholder:text-white/20 focus:border-blush-400/50 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-wider text-white/50">
                    Clearance Role *
                  </label>
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => setNewRole('doctor')}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 transition-all ${
                        newRole === 'doctor'
                          ? 'border-teal-400 bg-teal-950/60 text-teal-200'
                          : 'border-white/10 bg-white/[0.02] text-white/50'
                      }`}
                    >
                      <Stethoscope size={15} />
                      <span className="font-semibold">Doctor</span>
                      <span className="text-[9px] text-white/40">Images Only</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewRole('researcher')}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 transition-all ${
                        newRole === 'researcher'
                          ? 'border-purple-400 bg-purple-950/60 text-purple-200'
                          : 'border-white/10 bg-white/[0.02] text-white/50'
                      }`}
                    >
                      <FlaskConical size={15} />
                      <span className="font-semibold">Researcher</span>
                      <span className="text-[9px] text-white/40">Images + Data</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewRole('admin')}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 transition-all ${
                        newRole === 'admin'
                          ? 'border-crimson-400 bg-crimson-950/60 text-blush-200'
                          : 'border-white/10 bg-white/[0.02] text-white/50'
                      }`}
                    >
                      <ShieldCheck size={15} />
                      <span className="font-semibold">Admin</span>
                      <span className="text-[9px] text-white/40">Full + Users</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-wider text-white/50">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Dr. Jane Doe, MD"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 px-3 text-xs text-mist placeholder:text-white/20 focus:border-blush-400/50 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-wider text-white/50">
                      Title / Designation
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Senior Radiologist"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 px-3 text-xs text-mist placeholder:text-white/20 focus:border-blush-400/50 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-mono text-[10.5px] uppercase tracking-wider text-white/50">
                    Department
                  </label>
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="e.g. Diagnostic Pulmonology & Critical Care"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 px-3 text-xs text-mist placeholder:text-white/20 focus:border-blush-400/50 focus:outline-none"
                  />
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-display text-xs font-semibold uppercase tracking-wider text-white transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      boxShadow: '0 0 20px rgba(16,185,129,0.4)',
                    }}
                  >
                    {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    <span>Deploy User Credentials</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Reset Password Modal Overlay */}
        <AnimatePresence>
          {resetTargetUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            >
              <div className="w-full max-w-sm rounded-2xl border border-blush-400/40 bg-zinc-950 p-5 shadow-[0_0_40px_rgba(216,27,64,0.4)]">
                <div className="mb-3 flex items-center justify-between">
                  <h5 className="font-display text-sm font-bold text-mist">
                    Reset Password for {resetTargetUser.username}
                  </h5>
                  <button
                    onClick={() => setResetTargetUser(null)}
                    className="text-white/40 hover:text-white"
                  >
                    <X size={15} />
                  </button>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-3">
                  <div>
                    <label className="mb-1 block font-mono text-[10px] uppercase text-white/50">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={resetNewPass}
                      onChange={(e) => setResetNewPass(e.target.value)}
                      placeholder="Enter new password..."
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 px-3 text-xs text-mist focus:border-blush-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setResetTargetUser(null)}
                      className="flex-1 rounded-xl border border-white/10 py-2 font-mono text-xs text-white/60 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-crimson-600 py-2 font-mono text-xs font-semibold text-white shadow-[0_0_15px_rgba(216,27,64,0.5)] hover:bg-crimson-500"
                    >
                      Update
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
