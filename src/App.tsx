import { useState, useEffect, useCallback } from "react";
import api from "./lib/api";

function fmtTime(d: string) {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function fmtInterval(s: number) {
  return s < 60 ? s + "s" : Math.floor(s / 60) + "m";
}

interface User {
  id: string;
  name: string;
  avatar: string;
}

interface PingLog {
  id: string;
  serviceId: string;
  status: string;
  responseTime: number;
  message?: string;
  createdAt: string;
}

interface Service {
  id: string;
  name: string;
  url: string;
  interval: number;
  enabled: boolean;
  status: string;
  responseTime?: number;
  uptime?: number;
  lastPing?: string;
  logs?: PingLog[];
}

function Countdown({ lastPing, interval, enabled }: { lastPing?: string, interval: number, enabled: boolean }) {
  const [txt, setTxt] = useState("—");
  useEffect(() => {
    if (!enabled || !lastPing) { setTxt("—"); return; }
    const tick = () => {
      const last = new Date(lastPing).getTime();
      const diff = Math.max(0, Math.ceil((last + interval * 1000 - Date.now()) / 1000));
      setTxt(diff === 0 ? "soon" : diff < 60 ? diff + "s" : Math.ceil(diff / 60) + "m");
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [lastPing, interval, enabled]);
  return <span>{txt}</span>;
}

interface ServiceCardProps {
  service: Service;
  pinging: boolean;
  onPing: (id: string) => void;
  onToggle: (s: Service) => void;
  onEdit: (s: Service) => void;
  onDelete: (id: string) => void;
}

function ServiceCard({ service, pinging, onPing, onToggle, onEdit, onDelete }: ServiceCardProps) {
  const status = service.status || (service.enabled ? "pending" : null);
  const history = service.logs || [];

  const dotColor =
    status === "up" ? "bg-green-400"
      : status === "down" || status === "timeout" ? "bg-red-400"
        : "bg-zinc-600";

  const statusColor: Record<string, string> = {
    up: "text-green-400",
    down: "text-red-400",
    timeout: "text-amber-400",
    pending: "text-zinc-600",
  };

  const statusLabel: Record<string, string> = { up: "UP", down: "DOWN", timeout: "TIMEOUT", pending: "..." };

  const uptimeColor =
    service.uptime != null
      ? service.uptime >= 90 ? "text-green-400"
        : service.uptime < 60 ? "text-red-400"
          : "text-amber-400"
      : "text-white";

  const btnBase = "text-xs px-2 py-0.5 border border-zinc-700 rounded cursor-pointer transition-colors hover:bg-zinc-800";

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 transition-opacity duration-300 ${service.enabled ? "opacity-100" : "opacity-40"}`}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`}
              style={{ animation: pinging ? "pulse 0.8s infinite" : "none" }}
            />
            <span className="text-sm font-medium text-white">{service.name}</span>
          </div>
          <span className="text-xs text-zinc-500 block mt-0.5 ml-3.5">
            {service.url.replace(/^https?:\/\//, "")}
          </span>
        </div>
        {status && (
          <span className={`text-xs tracking-widest mt-0.5 ${statusColor[status] || ""}`}>{statusLabel[status] || "—"}</span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="text-xs text-zinc-500 mb-0.5">response</div>
          <div className="text-sm text-white">
            {service.responseTime != null ? service.responseTime + "ms" : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-0.5">uptime</div>
          <div className={`text-sm ${uptimeColor}`}>
            {service.uptime != null ? service.uptime + "%" : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-0.5">next ping</div>
          <div className="text-sm text-white">
            <Countdown lastPing={service.lastPing} interval={service.interval} enabled={service.enabled} />
          </div>
        </div>
      </div>

      {/* History bar chart */}
      {history.length > 0 && (
        <div className="flex gap-0.5 h-5 items-end">
          {[...history].reverse().slice(-24).map((h, i) => {
            const maxH = 20;
            const ph = h.status === "up"
              ? Math.min(maxH, Math.max(4, Math.round((h.responseTime / 1500) * maxH)))
              : maxH;
            return (
              <div
                key={h.id || i}
                className={`rounded-sm flex-1 ${h.status === "up" ? "bg-green-900" : "bg-red-900"}`}
                style={{ height: ph + "px", minWidth: 2, opacity: 0.35 + (i / 24) * 0.65 }}
              />
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
        <span className="text-xs text-zinc-600">
          every {fmtInterval(service.interval)} · {fmtTime(service.lastPing ?? "")}
        </span>
        <div className="flex gap-1">
          <button onClick={() => onPing(service.id)} className={`${btnBase} text-zinc-400`}>ping</button>
          <button onClick={() => onEdit(service)} className={`${btnBase} text-zinc-400`}>edit</button>
          <button onClick={() => onToggle(service)} className={`${btnBase} text-zinc-400`}>
            {service.enabled ? "pause" : "resume"}
          </button>
          <button onClick={() => onDelete(service.id)} className={`${btnBase} text-red-500`}>×</button>
        </div>
      </div>
    </div>
  );
}

interface AddFormProps {
  // @ts-ignore
  onAdd: (svc: any, id?: string) => void;
  initialData?: Service | null;
  onCancel?: () => void;
}

function AddForm({ onAdd, initialData = null, onCancel }: AddFormProps) {
  const [form, setForm] = useState(initialData ? {
    name: initialData.name,
    url: initialData.url,
    interval: initialData.interval.toString()
  } : { name: "", url: "https://", interval: "300" });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = () => {
    if (!form.name.trim() || form.url === "https://") return;
    const url = /^https?:\/\//.test(form.url) ? form.url : "https://" + form.url;
    onAdd({
      name: form.name.trim(),
      url,
      interval: Math.max(10, parseInt(form.interval) || 300),
    }, initialData?.id);
  };

  const inputCls =
    "bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-zinc-500 font-mono w-full transition-colors";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-3">
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs text-zinc-500">{initialData ? "edit service" : "add service"}</p>
        {initialData && (
          <button onClick={onCancel} className="text-[10px] text-zinc-600 hover:text-zinc-400 uppercase tracking-widest">cancel</button>
        )}
      </div>
      <div className="grid gap-2 items-center" style={{ gridTemplateColumns: "1fr 2fr 80px auto" }}>
        <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="name" className={inputCls} />
        <input value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://..." className={inputCls} />
        <input value={form.interval} onChange={(e) => set("interval", e.target.value)} type="number" min="10" placeholder="secs" className={inputCls} />
        <button
          onClick={submit}
          className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs rounded cursor-pointer whitespace-nowrap transition-colors"
        >
          {initialData ? "save" : "add"} ↗
        </button>
      </div>
      <p className="text-xs text-zinc-600 mt-2">
        tip: use 840s for Render services (fires before the 15 min spin-down threshold)
      </p>
    </div>
  );
}

function Login() {
  const loginUrl = (provider: string) => `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/${provider}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="text-center">
        <h1 className="text-2xl text-white mb-2">ping runner</h1>
        <p className="text-zinc-500 text-sm">Keep your services awake, effortlessly.</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <a
          href={loginUrl('google')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-zinc-950 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
        >
          Continue with Google
        </a>
        <a
          href={loginUrl('github')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 text-white rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
        >
          Continue with GitHub
        </a>
      </div>
    </div>
  );
}

export default function PingRunner() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [pinging, setPinging] = useState<Record<string, boolean>>({});

  const fetchServices = useCallback(async () => {
    try {
      const res = await api.get("/services");
      setServices(res.data);
    } catch (err) {
      console.error("Failed to fetch services", err);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const res = await api.get("/auth/profile");
      setUser(res.data);
      fetchServices();
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [fetchServices]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Polling for updates
  useEffect(() => {
    if (!user) return;
    const t = setInterval(fetchServices, 10000);
    return () => clearInterval(t);
  }, [user, fetchServices]);

  const addSvc = async (svc: any, id: any = null) => {
    try {
      if (id) {
        await api.put(`/services/${id}`, svc);
      } else {
        await api.post("/services", svc);
      }
      fetchServices();
      setShowAdd(false);
      setEditingService(null);
    } catch (err) {
      console.error(id ? "Update failed" : "Add failed", err);
    }
  };

  const toggleSvc = async (svc: Service) => {
    try {
      await api.put(`/services/${svc.id}`, { enabled: !svc.enabled });
      fetchServices();
    } catch (err) {
      console.error("Toggle failed", err);
    }
  };

  const deleteSvc = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await api.delete(`/services/${id}`);
      fetchServices();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const pingSvc = async (id: string) => {
    setPinging((p) => ({ ...p, [id]: true }));
    try {
      await api.post(`/services/${id}/ping`);
      setTimeout(fetchServices, 1000); // Wait a bit for worker to finish
    } catch (err) {
      console.error("Ping failed", err);
    } finally {
      setTimeout(() => setPinging((p) => ({ ...p, [id]: false })), 1000);
    }
  };

  const logout = async () => {
    await api.get("/auth/logout");
    setUser(null);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-zinc-500 font-mono">loading...</div>;

  if (!user) {
    return (
      <div className="bg-zinc-950 font-mono p-4 min-h-screen max-w-[1126px] mx-auto">
        <Login />
      </div>
    );
  }

  const active = services.filter((s) => s.enabled);
  const upN = active.filter((s) => s.status === "up").length;
  const downN = active.filter((s) => ["down", "timeout"].includes(s.status)).length;
  const pendN = active.filter((s) => s.status === "pending").length;
  const allGood = active.length > 0 && downN === 0 && pendN === 0;

  return (
    <div className="bg-zinc-950 font-mono p-4 min-h-screen max-w-[1126px] mx-auto">
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }`}</style>

      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${allGood ? "bg-green-400" : downN > 0 ? "bg-red-400" : "bg-zinc-500"}`} />
          <span className="text-base font-medium text-white underline decoration-green-500">ping runner</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4">
            <img src={user.avatar} className="w-5 h-5 rounded-full" alt="" />
            <span className="text-xs text-zinc-400">{user.name}</span>
            <button onClick={logout} className="text-[10px] text-zinc-600 hover:text-zinc-400 uppercase tracking-widest ml-1">logout</button>
          </div>
          <span className="text-xs text-green-400">{upN} up</span>
          <span className={`text-xs ${downN > 0 ? "text-red-400" : "text-zinc-500"}`}>{downN} down</span>
          {pendN > 0 && <span className="text-xs text-zinc-500">{pendN} pending</span>}
          <span className="text-xs text-zinc-600">{services.filter((s) => !s.enabled).length} paused</span>
          <button
            onClick={() => {
              setEditingService(null);
              setShowAdd((p) => !p);
            }}
            className="text-xs px-3 py-1 border border-zinc-700 rounded-full text-zinc-300 hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            {showAdd || editingService ? "cancel" : "+ add"}
          </button>
        </div>
      </div>

      {(showAdd || editingService) && (
        <AddForm
          // @ts-ignore
          onAdd={addSvc}
          initialData={editingService}
          onCancel={() => setEditingService(null)}
        />
      )}

      {/* Service grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {services.map((svc) => (
          <ServiceCard
            key={svc.id}
            service={svc}
            pinging={!!pinging[svc.id]}
            onPing={pingSvc}
            onToggle={toggleSvc}
            onEdit={(s) => {
              setEditingService(s);
              setShowAdd(false);
            }}
            onDelete={deleteSvc}
          />
        ))}
        {services.length === 0 && !showAdd && (
          <div className="col-span-2 py-20 text-center border border-dashed border-zinc-800 rounded-xl">
            <p className="text-zinc-600 text-sm mb-4">No services registered yet</p>
            <button onClick={() => setShowAdd(true)} className="text-xs text-zinc-400 border border-zinc-700 px-4 py-2 rounded-full hover:bg-zinc-900 transition-colors">+ add your first service</button>
          </div>
        )}
      </div>

      {/* Simplified Activity log (Optional: Fetch logs separately if needed) */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex justify-between items-center px-3 py-2 bg-zinc-900 border-b border-zinc-800">
          <span className="text-xs text-zinc-500">recent activity</span>
        </div>
        <div className="max-h-60 overflow-y-auto">
          {services.flatMap(s => s.logs || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50).map((log) => (
            <div
              key={log.id}
              className="grid gap-2 px-3 py-1.5 border-b border-zinc-800 text-xs items-center"
              style={{ gridTemplateColumns: "72px 130px 70px 1fr" }}
            >
              <span className="text-zinc-600">{fmtTime(log.createdAt)}</span>
              <span className="text-white truncate">{services.find(s => s.id === log.serviceId)?.name || '...'}</span>
              <span className={log.status === "up" ? "text-green-400" : log.status === "timeout" ? "text-amber-400" : "text-red-400"}>
                {log.status}
              </span>
              <span className="text-zinc-500">{log.message || log.responseTime + 'ms'}</span>
            </div>
          ))}
          {services.every(s => !s.logs || s.logs.length === 0) && (
            <div className="py-6 text-center text-xs text-zinc-600">waiting for pings...</div>
          )}
        </div>
      </div>
    </div>
  );
}