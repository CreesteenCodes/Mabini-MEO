import { Users, Monitor, Database, Cpu, ArrowDown, ArrowRight, Globe, Code2, Server, Layers } from "lucide-react";

const NAVY = "#28539b";
const BLUE = "#3568b5";
const BLUE_DARK = "#28539b";

const users = [
  { label: "Head Engineer", icon: "👷", role: "Head Engineer" },
  { label: "Staff - Encoder", icon: "🏗️", role: "Staff - Encoder" },
  { label: "Staff - Inspector", icon: "🔍", role: "Staff - Inspector" },
  { label: "Staff - Validator", icon: "👤", role: "Staff - Validator" },
];

const frontendItems = [
  {
    icon: Globe,
    title: "Next.js UI",
    desc: "Page routing, SSR, React components",
    color: BLUE,
  },
  {
    icon: Layers,
    title: "shadcn/ui + Tailwind CSS",
    desc: "Design system, utility-first styling",
    color: BLUE,
  },
  {
    icon: Code2,
    title: "API Routes & Server Actions",
    desc: "Business logic, data mutations",
    color: BLUE,
  },
];

const backendItems = [
  {
    icon: Database,
    title: "Local SQLite Database",
    desc: "Persistent local road, inspection, maintenance, and user records",
    color: "#6990cc",
  },
  {
    icon: Cpu,
    title: "Local Prioritization",
    desc: "Rule-based maintenance recommendations",
    color: "#a4bce2",
  },
];

function LayerHeader({ label, icon: Icon }: { label: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: BLUE }}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <span className="text-xs font-bold tracking-widest uppercase text-white/50">{label}</span>
    </div>
  );
}

function ConnectorArrow() {
  return (
    <div className="flex flex-col items-center py-2">
      <div className="w-px h-6" style={{ background: `${BLUE}66` }} />
      <ArrowDown className="w-4 h-4" style={{ color: `${BLUE}99` }} />
    </div>
  );
}

export function SystemArchitecture() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: "#28539b" }}
    >
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: BLUE }}>
            Bayan ng Mabini — Municipal Engineering Office
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-sky-200">System Architecture</h1>
          <p className="text-white/40 text-sm mt-1">Local Road Monitoring & Maintenance System</p>
        </div>

        {/* USER LAYER */}
        <div
          className="rounded-2xl p-6 mb-2 border"
          style={{ background: `${NAVY}cc`, borderColor: `${BLUE}33` }}
        >
          <LayerHeader label="User Layer" icon={Users} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {users.map((u) => (
              <div
                key={u.label}
                className="rounded-xl p-4 flex flex-col items-center gap-2 border text-center"
                style={{ background: "#ffffff08", borderColor: `${BLUE}22` }}
              >
                <span className="text-3xl">{u.icon}</span>
                <p className="text-white text-sm font-semibold leading-tight">{u.label}</p>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: `${BLUE}22`, color: BLUE }}
                >
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        <ConnectorArrow />

        {/* FRONTEND LAYER */}
        <div
          className="rounded-2xl p-6 mb-2 border"
          style={{ background: `${NAVY}cc`, borderColor: `${BLUE}33` }}
        >
          <LayerHeader label="Frontend Layer" icon={Monitor} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {frontendItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl p-4 flex gap-3 border"
                  style={{ background: "#ffffff08", borderColor: `${BLUE}22` }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${BLUE}22` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: BLUE }} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{item.title}</p>
                    <p className="text-white/40 text-xs mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Framework badge */}
          <div className="mt-3 flex items-center gap-2">
            <div
              className="px-3 py-1 rounded-full text-xs font-bold border"
              style={{ borderColor: `${BLUE}44`, color: BLUE, background: `${BLUE}11` }}
            >
              Next.js Framework
            </div>
            <ArrowRight className="w-3 h-3 text-white/20" />
            <span className="text-white/30 text-xs">Primary application framework powering all layers</span>
          </div>
        </div>

        <ConnectorArrow />

        {/* BACKEND LAYER */}
        <div
          className="rounded-2xl p-6 border"
          style={{ background: `${NAVY}cc`, borderColor: `${BLUE}33` }}
        >
          <LayerHeader label="Backend Layer" icon={Server} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {backendItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl p-4 flex gap-3 border"
                  style={{ background: "#ffffff08", borderColor: `${BLUE}22` }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${BLUE}22` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: "#a4bce2" }} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{item.title}</p>
                    <p className="text-white/40 text-xs mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs text-white/30">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: BLUE }} />
            Frontend services
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#a4bce2" }} />
            Backend / external services
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowDown className="w-3 h-3" />
            Data flow direction
          </span>
        </div>
      </div>
    </div>
  );
}
