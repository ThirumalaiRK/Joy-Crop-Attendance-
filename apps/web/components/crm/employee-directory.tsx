'use me';
'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  ScanFace,
  Fingerprint,
  CreditCard,
  QrCode,
  MapPin,
  Flame,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Mail,
  Phone,
  Briefcase,
  ExternalLink,
  Trash2,
  Edit3,
  User,
  X,
} from 'lucide-react';
import { Employee } from '../../types';

interface EmployeeDirectoryProps {
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
  onAddEmployee: () => void;
  onDeleteEmployee?: (empId: string) => void;
  onEditEmployee?: (emp: Employee) => void;
}

export function EmployeeDirectory({ employees, onSelectEmployee, onAddEmployee, onDeleteEmployee, onEditEmployee }: EmployeeDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const departments = ['All', 'Engineering', 'Product & Design', 'Executive', 'Operations', 'Sales'];

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = departmentFilter === 'All' || emp.department.toLowerCase().includes(departmentFilter.toLowerCase());

    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-slate-100">Enterprise Staff Directory</h2>
            <p className="text-xs text-slate-400">Manage registered employees, biometric statuses, and performance metrics</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-mono font-bold text-slate-300 border border-slate-700">
            Total Staff: {employees.length}
          </span>
          <button
            onClick={onAddEmployee}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Enroll Employee</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID (e.g. EMP-0001), designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Department Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 mr-1 shrink-0" />
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setDepartmentFilter(dept)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                departmentFilter === dept
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEmployees.map((emp) => (
          <div
            key={emp.id}
            className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 transition-all duration-200 shadow-xl flex flex-col justify-between space-y-4 group"
          >
            {/* Card Top: Avatar & Name */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                {emp.avatar ? (
                  <img
                    src={emp.avatar}
                    alt={emp.name}
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-blue-500/30 group-hover:ring-blue-500 transition"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-lg ring-2 ring-blue-500/30 group-hover:ring-blue-500 transition">
                    {(emp.name || '?')[0]}
                  </div>
                )}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white truncate max-w-[160px]">{emp.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {emp.id}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-blue-400">{emp.designation}</span>
                  <span className="text-[11px] text-slate-400">{emp.department}</span>
                </div>
              </div>
            </div>

            {/* Performance Stats Badges */}
            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs">
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase">Attendance</span>
                <span className="font-extrabold text-emerald-400">{emp.attendanceScore}%</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase">Productivity</span>
                <span className="font-extrabold text-blue-400">{emp.productivityScore}%</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block uppercase">Streak</span>
                <span className="font-extrabold text-amber-400 flex items-center justify-center gap-0.5">
                  <Flame className="w-3 h-3 fill-amber-400" /> {emp.currentStreak}d
                </span>
              </div>
            </div>

            {/* Biometric Credentials Status Checklist */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Biometrics:</span>
              <div className="flex items-center gap-1.5">
                <span
                  title="Fingerprint"
                  className={`p-1 rounded ${emp.biometricStatus?.fingerprint ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'}`}
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                </span>
                <span
                  title="Face Recognition"
                  className={`p-1 rounded ${emp.biometricStatus?.face ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'}`}
                >
                  <ScanFace className="w-3.5 h-3.5" />
                </span>
                <span
                  title="Aadhaar Linked"
                  className={`p-1 rounded ${emp.biometricStatus?.aadhaar ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'}`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                </span>
                <span
                  title="Dynamic QR Pass"
                  className={`p-1 rounded ${emp.biometricStatus?.qr ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'}`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                </span>
                <span
                  title="GPS Geofence"
                  className={`p-1 rounded ${emp.biometricStatus?.gps ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'}`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Actions: View Profile, Edit, & Delete Employee */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectEmployee(emp)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white text-xs font-bold transition flex items-center justify-center gap-2 group-hover:shadow-lg"
              >
                <span>View Full Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              {onEditEmployee && (
                <button
                  onClick={() => setEditingEmployee(emp)}
                  title="Edit Employee Profile"
                  className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:text-blue-300 transition"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              {onDeleteEmployee && (
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to permanently delete employee "${emp.name}" (${emp.id})?`)) {
                      onDeleteEmployee(emp.id);
                    }
                  }}
                  title="Delete Employee Permanently"
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Employee Modal Overlay */}
      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSave={(updated) => {
            if (onEditEmployee) {
              onEditEmployee(updated);
            }
            setEditingEmployee(null);
          }}
        />
      )}
    </div>
  );
}

interface EditEmployeeModalProps {
  employee: Employee;
  onClose: () => void;
  onSave: (updated: Employee) => void;
}

export function EditEmployeeModal({ employee, onClose, onSave }: EditEmployeeModalProps) {
  const [name, setName] = useState(employee.name);
  const [designation, setDesignation] = useState(employee.designation);
  const [department, setDepartment] = useState(employee.department);
  const [shift, setShift] = useState(employee.shift || 'General Morning (09:00 AM - 06:00 PM)');
  const [email, setEmail] = useState(employee.email);
  const [phone, setPhone] = useState(employee.phone || '');
  const [manager, setManager] = useState(employee.manager || '');
  const [employmentStatus, setEmploymentStatus] = useState<'Full Time' | 'Contract' | 'Remote'>(employee.employmentStatus || 'Full Time');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Pending'>(employee.status || 'Active');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !designation || !email) {
      alert('Please fill in all required fields (Name, Designation, Email).');
      return;
    }
    onSave({
      ...employee,
      name,
      fullName: name,
      designation,
      department,
      shift,
      email,
      phone,
      manager,
      employmentStatus,
      status,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <form onSubmit={handleSave} className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10 text-left">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <User className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-slate-100">Edit Employee Profile</h3>
              <span className="text-[11px] text-slate-400">ID: {employee.id}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto bg-slate-950/20 text-xs text-slate-300">
          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="flex flex-col space-y-1.5 col-span-2">
              <label className="font-semibold text-slate-400">Employee Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/80 transition"
                required
              />
            </div>

            {/* Email */}
            <div className="flex flex-col space-y-1.5">
              <label className="font-semibold text-slate-400">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/80 transition"
                required
              />
            </div>

            {/* Phone */}
            <div className="flex flex-col space-y-1.5">
              <label className="font-semibold text-slate-400">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/80 transition"
              />
            </div>

            {/* Designation */}
            <div className="flex flex-col space-y-1.5">
              <label className="font-semibold text-slate-400">Designation *</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/80 transition"
                required
              />
            </div>

            {/* Department */}
            <div className="flex flex-col space-y-1.5">
              <label className="font-semibold text-slate-400">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500/80 transition"
              >
                <option value="IT">IT & Systems</option>
                <option value="Engineering">Engineering</option>
                <option value="Product & Design">Product & Design</option>
                <option value="Executive">Executive</option>
                <option value="Operations">Operations</option>
                <option value="Sales">Sales</option>
                <option value="Marketing & Growth">Marketing & Growth</option>
              </select>
            </div>

            {/* Shift */}
            <div className="flex flex-col space-y-1.5">
              <label className="font-semibold text-slate-400">Working Shift</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500/80 transition"
              >
                <option value="General Morning (09:00 AM - 06:00 PM)">General Morning (09:00 AM - 06:00 PM)</option>
                <option value="Morning Shift (06:00 AM - 02:00 PM)">Morning Shift (06:00 AM - 02:00 PM)</option>
                <option value="Evening Shift (02:00 PM - 10:00 PM)">Evening Shift (02:00 PM - 10:00 PM)</option>
                <option value="Night Shift (10:00 PM - 06:00 AM)">Night Shift (10:00 PM - 06:00 AM)</option>
              </select>
            </div>

            {/* Manager */}
            <div className="flex flex-col space-y-1.5">
              <label className="font-semibold text-slate-400">Reporting Manager</label>
              <input
                type="text"
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/80 transition"
              />
            </div>

             {/* Employment Status */}
            <div className="flex flex-col space-y-1.5">
              <label className="font-semibold text-slate-400">Employment Status</label>
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value as 'Full Time' | 'Contract' | 'Remote')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500/80 transition"
              >
                <option value="Full Time">Full Time</option>
                <option value="Contract">Contract</option>
                <option value="Remote">Remote</option>
              </select>
            </div>

            {/* Status */}
            <div className="flex flex-col space-y-1.5">
              <label className="font-semibold text-slate-400">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive' | 'Pending')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500/80 transition"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-900 border-t border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-xs font-bold text-slate-300 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg transition"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
