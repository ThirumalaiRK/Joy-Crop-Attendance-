# Joy-Crop-Attendance-

**Enterprise-Grade Live Biometric Attendance & HRMS System**  
Built with **Next.js (App Router)**, **Supabase PostgreSQL & Realtime**, **ZKTeco Biometrics SDK (Raw TCP/IP)**, and **Tailwind CSS**.

---

## 🏢 Overview

Joy Corporate Attendance is a high-performance HRMS and biometric synchronization platform connecting physical on-premise hardware terminals (ZKTeco Identix K90 Pro / Mantra MFS110) with cloud infrastructure.

### Key Capabilities:
- ⚡ **Live Attendance Engine**: Real-time punch processing with automatic working hours, break deductions, and late calculations.
- 🔒 **Enterprise RBAC & Identity**: Role-based access control (Super Admin, HR Manager, Employee) with secure credential provisioning and temporary password reset.
- 📟 **Direct Hardware TCP Integration**: 2-way sync with ZKTeco machines on port `4370` supporting user enrollment, template push/pull, and hardware purge on deletion.
- 📱 **Employee Self-Service Portal**: Mobile-responsive check-in/out, live shift status, break trackers, and attendance history.
- 📊 **Executive Analytics & PDF/Excel Export**: Interactive KPI cards, automated payroll calculations, and audit logs.

---

## 🛠️ Project Structure

```
Joy-Crop-Attendance-/
├── apps/
│   ├── web/               # Next.js 16 Production Web App & Serverless API Routes
│   └── connector/         # Node.js On-Premise Hardware Gateway (Socket.IO + TCP)
├── packages/
│   └── biometrics-sdk/    # High-Performance ZKTeco & Mantra Hardware SDK
├── supabase/              # SQL Migration Schemas & Database Functions
└── README.md
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18+ or v20+
- **Supabase**: Active PostgreSQL project
- **Hardware Terminal (Optional for dev)**: ZKTeco biometric device connected via local LAN.

### 2. Environment Setup
Create a `.env.local` inside `apps/web`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_CONNECTOR_URL=http://localhost:4000
```

### 3. Install & Run
```bash
# Install dependencies
npm install

# Start development servers (Next.js web app + hardware connector)
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) for the Executive Dashboard.

---

## ☁️ Deployment (Vercel)

1. Import this repository into **Vercel**.
2. Set the **Root Directory** to `apps/web`.
3. Add the required environment variables in the Vercel project settings.
4. Click **Deploy**.

---

## 📄 License
Private & Confidential — Joy Corporate Solutions Pvt. Ltd.
