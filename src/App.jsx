import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid
} from "recharts";
import {
  Scale, Dumbbell, TrendingUp, Compass, Settings as Cog,
  Plus, Minus, Check, AlertTriangle, Info, ChevronLeft, ChevronRight,
  RotateCcw, Trash2, Download, Upload
} from "lucide-react";

/* ───────────────────────── helpers ───────────────────────── */

const iso = (d) => {
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const todayISO = () => iso(new Date());
const addDays = (isoStr, n) => {
  const d = new Date(isoStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return iso(d);
};
const skDate = (isoStr) => {
  const d = new Date(isoStr + "T12:00:00");
  return `${d.getDate()}.${d.getMonth() + 1}.`;
};
const skDay = (isoStr) => ["Ne", "Po", "Ut", "St", "Št", "Pi", "So"][new Date(isoStr + "T12:00:00").getDay()];
const n1 = (v) => (v === null || v === undefined || Number.isNaN(v) ? "–" : Number(v).toFixed(1));
const n2 = (v) => (v === null || v === undefined || Number.isNaN(v) ? "–" : Number(v).toFixed(2));
const n0 = (v) => (v === null || v === undefined || Number.isNaN(v) ? "–" : Math.round(v).toString());

const bmrMifflin = (sex, kg, cm, age) =>
  sex === "z" ? 10 * kg + 6.25 * cm - 5 * age - 161 : 10 * kg + 6.25 * cm - 5 * age + 5;

const ACTIVITY = [
  { id: "sed", label: "Sedavá práca, málo chôdze", f: 1.2 },
  { id: "light", label: "Sedavá práca + 3–4 tréningy", f: 1.375 },
  { id: "mod", label: "Aktívnejší deň + 4–5 tréningov", f: 1.55 },
  { id: "high", label: "Fyzická práca + tréningy", f: 1.725 },
];

const e1rm = (w, r) => (r > 0 ? w * (1 + r / 30) : 0);

/* ───────────────────────── training templates ───────────────────────── */

const TEMPLATES = {
  "UPPER A": [
    { name: "Bench Press", step: 2.5, lo: 5, hi: 8 },
    { name: "Lat Pulldown", step: 5, lo: 6, hi: 10 },
    { name: "Incline DB Press", step: 2, lo: 6, hi: 10 },
    { name: "Iso lateral pulldown", step: 5, lo: 8, hi: 12 },
    { name: "Lateral Raises stroj", step: 5, lo: 10, hi: 15 },
    { name: "Triceps Pushdown", step: 2.5, lo: 8, hi: 12 },
    { name: "EZ Curl", step: 2.5, lo: 8, hi: 12 },
  ],
  "LOWER A": [
    { name: "Back Squat", step: 5, lo: 3, hi: 6 },
    { name: "Romanian Deadlift", step: 5, lo: 6, hi: 10 },
    { name: "Leg Press", step: 10, lo: 6, hi: 10 },
    { name: "Leg Curl", step: 5, lo: 8, hi: 12 },
    { name: "Calves", step: 5, lo: 10, hi: 15 },
    { name: "Hyperextenzia", step: 5, lo: 8, hi: 12 },
  ],
  "UPPER B": [
    { name: "OHP", step: 2, lo: 5, hi: 8 },
    { name: "Pullups / Pulldown", step: 5, lo: 5, hi: 10 },
    { name: "DB Bench", step: 2, lo: 6, hi: 10 },
    { name: "Cable Row", step: 5, lo: 8, hi: 12 },
    { name: "Rear Delt Fly", step: 5, lo: 10, hi: 15 },
    { name: "Skullcrusher", step: 2.5, lo: 6, hi: 10 },
    { name: "Hammer Curl", step: 2, lo: 8, hi: 12 },
  ],
  "LOWER B": [
    { name: "Hack Squat", step: 5, lo: 5, hi: 8 },
    { name: "Leg Press", step: 10, lo: 6, hi: 10 },
    { name: "Bulgarian Split Squat", step: 2.5, lo: 8, hi: 12 },
    { name: "Leg Curl", step: 5, lo: 8, hi: 12 },
    { name: "Calves", step: 5, lo: 10, hi: 15 },
    { name: "Hyperextenzia", step: 5, lo: 8, hi: 12 },
  ],
};
const SPLITS = Object.keys(TEMPLATES);

/* ───────────────────────── storage ───────────────────────── */

const PREFIX = "trener:";

const store = {
  async get(key, fallback) {
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      if (raw === null) return fallback;
      const parsed = JSON.parse(raw);
      return parsed === null ? fallback : parsed;
    } catch {
      return fallback;
    }
  },
  async set(key, value) {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
};

/* ───────────────────────── UI atoms ───────────────────────── */

const Readout = ({ value, unit, label, tone = "ink", size = "lg" }) => {
  const tones = {
    ink: "text-slate-900",
    steel: "text-sky-800",
    brass: "text-amber-700",
    good: "text-emerald-700",
    warn: "text-rose-700",
    mute: "text-slate-400",
  };
  const sizes = { sm: "text-xl", md: "text-3xl", lg: "text-5xl" };
  return (
    <div>
      <div className={`font-mono font-semibold tabular-nums leading-none ${sizes[size]} ${tones[tone]}`}>
        {value}
        {unit && <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>}
      </div>
      {label && (
        <div className="mt-2 text-xs uppercase tracking-widest text-slate-400">{label}</div>
      )}
    </div>
  );
};

const Card = ({ children, className = "" }) => (
  <div className={`bg-white border border-slate-200 rounded-sm p-5 ${className}`}>{children}</div>
);

const Label = ({ children }) => (
  <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">{children}</div>
);

const NumField = ({ value, onChange, unit, step = 1, placeholder = "" }) => (
  <div className="flex items-stretch border border-slate-300 rounded-sm bg-white focus-within:border-sky-700">
    <button
      onClick={() => onChange(Math.max(0, (Number(value) || 0) - step))}
      className="px-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-inset"
      aria-label="Znížiť"
    >
      <Minus size={14} />
    </button>
    <input
      type="number"
      inputMode="decimal"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className="flex-1 min-w-0 text-center font-mono tabular-nums py-2 focus:outline-none"
    />
    {unit && <span className="self-center pr-2 text-xs text-slate-400">{unit}</span>}
    <button
      onClick={() => onChange((Number(value) || 0) + step)}
      className="px-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-inset"
      aria-label="Zvýšiť"
    >
      <Plus size={14} />
    </button>
  </div>
);

const Bar7 = ({ pct, tone }) => (
  <div className="h-1 bg-slate-100 rounded-sm overflow-hidden">
    <div
      className={`h-full transition-all duration-500 ${tone}`}
      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
    />
  </div>
);

/* ───────────────────────── coach engine ───────────────────────── */

function buildAdvice({ profile, days, workouts, rate, avgNow, weekAvgs }) {
  const out = [];
  const logged = days.filter((d) => d.weight != null);
  const kcalDays = days.filter((d) => d.kcal != null);

  if (logged.length < 7) {
    out.push({
      level: "info",
      title: "Zbieraj dáta ešte pár dní",
      body: `Máš ${logged.length} zápisov váhy. Na spoľahlivý 7-dňový priemer treba aspoň 7, ideálne 14. Dovtedy nemá zmysel nič meniť – jednotlivé dni skáču o 1–2 kg kvôli vode a tráveniu.`,
    });
    return out;
  }

  const bw = avgNow || profile.weight;
  const pct = rate != null && bw ? (Math.abs(rate) / bw) * 100 : null;

  if (rate == null) {
    out.push({ level: "info", title: "Ešte nemám dva plné týždne", body: "Trend počítam z rozdielu dvoch 7-dňových priemerov. Loguj ďalej." });
  } else if (rate > 0.15) {
    out.push({
      level: "warn",
      title: "Priemer ide hore",
      body: `Za posledný týždeň +${n2(rate)} kg. Ak si nemenil jedlo, skontroluj soľ, sacharidy a či logguješ aj drobnosti (oleje, omáčky, nápoje). Ak to potrvá 2 týždne, uber ~150 kcal.`,
    });
  } else if (pct != null && pct > 1.0 && rate < 0) {
    out.push({
      level: "alert",
      title: "Chudneš príliš rýchlo",
      body: `${n2(Math.abs(rate))} kg/týždeň je ${n1(pct)} % telesnej hmotnosti. Nad 1 % rastie riziko straty svalu a poklesu výkonov. Pridaj 150–200 kcal denne a sleduj ďalší týždeň.`,
    });
  } else if (pct != null && pct >= 0.5) {
    out.push({
      level: "good",
      title: "Tempo je v optimálnom pásme",
      body: `${n2(Math.abs(rate))} kg/týždeň (${n1(pct)} % hmotnosti). Nemeň nič, drž kalórie aj tréning tak, ako sú.`,
    });
  } else if (pct != null && pct >= 0.25) {
    out.push({
      level: "good",
      title: "Tempo je mierne, ale funguje",
      body: `${n2(Math.abs(rate))} kg/týždeň. Konzervatívne tempo lepšie chráni svaly. Ak ti to vyhovuje, pokračuj; ak chceš rýchlejšie, pridaj radšej chôdzu než rez v jedle.`,
    });
  } else {
    const stalled = weekAvgs.length >= 3 &&
      Math.abs(weekAvgs[weekAvgs.length - 1].avg - weekAvgs[weekAvgs.length - 3].avg) < 0.4;
    out.push({
      level: stalled ? "warn" : "info",
      title: stalled ? "Priemer stagnuje dva týždne" : "Zmena je zatiaľ malá",
      body: stalled
        ? "Uber 100–150 kcal denne ALEBO pridaj jeden kardio blok týždenne – nie oboje naraz, inak nebudeš vedieť, čo zabralo."
        : "Jeden týždeň s malou zmenou nie je plató. Počkaj ešte týždeň, kým budeš čokoľvek meniť.",
    });
  }

  // strength trend
  const byEx = {};
  workouts.forEach((w) => {
    w.exercises.forEach((ex) => {
      const top = ex.sets.reduce((b, s) => Math.max(b, e1rm(s.weight || 0, s.reps || 0)), 0);
      if (top > 0) {
        byEx[ex.name] = byEx[ex.name] || [];
        byEx[ex.name].push({ date: w.date, top });
      }
    });
  });
  let down = 0, up = 0, tracked = 0;
  Object.values(byEx).forEach((arr) => {
    if (arr.length < 2) return;
    arr.sort((a, b) => a.date.localeCompare(b.date));
    tracked++;
    const delta = arr[arr.length - 1].top - arr[arr.length - 2].top;
    if (delta < -1) down++;
    if (delta > 1) up++;
  });
  if (tracked >= 3) {
    if (down >= Math.ceil(tracked / 2)) {
      out.push({
        level: "alert",
        title: "Sila klesá vo väčšine cvikov",
        body: `${down} z ${tracked} sledovaných cvikov šlo dole oproti minulému tréningu. To je najsilnejší signál, že deficit je pritvrdý alebo chýba regenerácia. Pridaj kalórie skôr, než uberieš z tréningu.`,
      });
    } else if (up >= 2) {
      out.push({
        level: "good",
        title: "Sila drží alebo rastie",
        body: `${up} z ${tracked} cvikov sa zlepšilo. V deficite je to znak, že sval si držíš – presne to chceš.`,
      });
    }
  }

  // protein
  const pDays = days.filter((d) => d.protein != null);
  if (pDays.length >= 4 && bw) {
    const avgP = pDays.reduce((s, d) => s + d.protein, 0) / pDays.length;
    const perKg = avgP / bw;
    if (perKg < 1.6) {
      out.push({
        level: "warn",
        title: "Bielkoviny sú nízko",
        body: `Priemer ${n0(avgP)} g (${n1(perKg)} g/kg). V deficite miier na 1,8–2,2 g/kg, teda ${n0(bw * 1.8)}–${n0(bw * 2.2)} g denne.`,
      });
    }
  }

  // fiber
  const fDays = days.filter((d) => d.fiber != null);
  if (fDays.length >= 4) {
    const avgF = fDays.reduce((s, d) => s + d.fiber, 0) / fDays.length;
    if (avgF < 25) {
      out.push({
        level: "info",
        title: "Vláknina pod 25 g",
        body: `Priemer ${n0(avgF)} g. Vyššia vláknina výrazne pomáha so sýtosťou pri diéte – zelenina, ovsené vločky, strukoviny.`,
      });
    }
  }

  // adherence
  const last14 = days.slice(-14);
  const loggedKcal = last14.filter((d) => d.kcal != null).length;
  if (last14.length >= 10 && loggedKcal < last14.length * 0.7) {
    out.push({
      level: "warn",
      title: "Chýbajú zápisy jedla",
      body: `Za posledné dva týždne máš ${loggedKcal} z ${last14.length} dní. Nezapísané dni sú najčastejšia príčina „záhadného“ plató.`,
    });
  }

  if (kcalDays.length >= 5) {
    const avgK = kcalDays.slice(-14).reduce((s, d) => s + d.kcal, 0) / Math.min(14, kcalDays.length);
    if (profile.tdee && avgK > profile.tdee - 100) {
      out.push({
        level: "warn",
        title: "Príjem je blízko výdaja",
        body: `Priemer ${n0(avgK)} kcal oproti odhadovanému výdaju ${n0(profile.tdee)} kcal. Pri takom malom rozdiele sa váha hýbať nebude.`,
      });
    }
  }

  return out;
}

/* ───────────────────────── app ───────────────────────── */

export default function App() {
  const [tab, setTab] = useState("dnes");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [log, setLog] = useState({});
  const [workouts, setWorkouts] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await store.get("profile", null);
      const l = await store.get("daily-log", {});
      const w = await store.get("workout-log", []);
      setProfile(p);
      setLog(l || {});
      setWorkouts(w || []);
      setLoading(false);
    })();
  }, []);

  const flash = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }, []);

  const saveProfile = async (p) => { setProfile(p); await store.set("profile", p); flash(); };
  const saveLog = async (l) => { setLog(l); await store.set("daily-log", l); flash(); };
  const saveWorkouts = async (w) => { setWorkouts(w); await store.set("workout-log", w); flash(); };

  /* derived */
  const days = useMemo(() => {
    const keys = Object.keys(log).sort();
    if (!keys.length) return [];
    const out = [];
    let cur = keys[0];
    const last = keys[keys.length - 1];
    const end = last < todayISO() ? todayISO() : last;
    let guard = 0;
    while (cur <= end && guard < 1000) {
      out.push({ date: cur, ...(log[cur] || {}) });
      cur = addDays(cur, 1);
      guard++;
    }
    return out;
  }, [log]);

  const series = useMemo(() => {
    return days.map((d, i) => {
      const win = days.slice(Math.max(0, i - 6), i + 1).map((x) => x.weight).filter((v) => v != null);
      return {
        date: d.date,
        label: skDate(d.date),
        weight: d.weight ?? null,
        avg: win.length >= 4 ? win.reduce((a, b) => a + b, 0) / win.length : null,
        kcal: d.kcal ?? null,
      };
    });
  }, [days]);

  const avgNow = useMemo(() => {
    const w = days.slice(-7).map((d) => d.weight).filter((v) => v != null);
    return w.length >= 4 ? w.reduce((a, b) => a + b, 0) / w.length : null;
  }, [days]);

  const avgPrev = useMemo(() => {
    const w = days.slice(-14, -7).map((d) => d.weight).filter((v) => v != null);
    return w.length >= 4 ? w.reduce((a, b) => a + b, 0) / w.length : null;
  }, [days]);

  const rate = avgNow != null && avgPrev != null ? avgNow - avgPrev : null;

  const weekAvgs = useMemo(() => {
    const out = [];
    for (let i = days.length; i > 0; i -= 7) {
      const chunk = days.slice(Math.max(0, i - 7), i);
      const w = chunk.map((d) => d.weight).filter((v) => v != null);
      const k = chunk.map((d) => d.kcal).filter((v) => v != null);
      if (w.length >= 3) {
        out.unshift({
          from: chunk[0].date,
          to: chunk[chunk.length - 1].date,
          avg: w.reduce((a, b) => a + b, 0) / w.length,
          kcal: k.length ? k.reduce((a, b) => a + b, 0) / k.length : null,
          n: w.length,
        });
      }
    }
    return out.map((wk, i, arr) => ({ ...wk, delta: i > 0 ? wk.avg - arr[i - 1].avg : null }));
  }, [days]);

  const advice = useMemo(() => {
    if (!profile) return [];
    return buildAdvice({ profile, days, workouts, rate, avgNow, weekAvgs });
  }, [profile, days, workouts, rate, avgNow, weekAvgs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-xs uppercase tracking-widest text-slate-400">Načítavam…</div>
      </div>
    );
  }

  if (!profile) return <Onboarding onDone={saveProfile} />;

  const TABS = [
    { id: "dnes", label: "Dnes", icon: Scale },
    { id: "trening", label: "Tréning", icon: Dumbbell },
    { id: "progres", label: "Progres", icon: TrendingUp },
    { id: "trener", label: "Tréner", icon: Compass },
    { id: "nastavenia", label: "Profil", icon: Cog },
  ];

  return (
    <div className="min-h-screen bg-stone-100 text-slate-900 pb-24 overflow-x-hidden" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <header className="border-b border-slate-200 bg-stone-50 sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">Tréner</div>
            <div className="text-xs uppercase tracking-widest text-slate-400 truncate">
              {profile.name || "Plán"} · cieľ {n1(profile.goalWeight)} kg
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono tabular-nums text-lg leading-none">
              {avgNow != null ? n1(avgNow) : n1(profile.weight)}
              <span className="text-xs text-slate-400 ml-1">kg</span>
            </div>
            <div className="text-xs uppercase tracking-widest text-slate-400">
              {avgNow != null ? "7-dňový priemer" : "štart"}
            </div>
          </div>
        </div>
      </header>

      <main key={tab} className="max-w-3xl mx-auto px-4 py-5 space-y-4 animate-fade-in">
        {tab === "dnes" && <Today profile={profile} log={log} saveLog={saveLog} avgNow={avgNow} rate={rate} />}
        {tab === "trening" && <Training workouts={workouts} save={saveWorkouts} />}
        {tab === "progres" && <Progress series={series} weekAvgs={weekAvgs} workouts={workouts} profile={profile} />}
        {tab === "trener" && <Coach advice={advice} profile={profile} rate={rate} avgNow={avgNow} weekAvgs={weekAvgs} />}
        {tab === "nastavenia" && <Profile profile={profile} save={saveProfile} />}
      </main>

      {saved && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs uppercase tracking-widest px-4 py-2 rounded-sm flex items-center gap-2 animate-fade-in">
          <Check size={12} /> Uložené
        </div>
      )}

      <nav className="fixed bottom-0 inset-x-0 bg-stone-50 border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto grid grid-cols-5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`py-3 px-1 flex flex-col items-center gap-1 border-t-2 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-inset ${
                  on ? "border-amber-600 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                <Icon size={17} />
                <span className="text-[10px] leading-none uppercase tracking-wide whitespace-nowrap">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ───────────────────────── onboarding ───────────────────────── */

function Onboarding({ onDone }) {
  const [f, setF] = useState({
    name: "", sex: "m", age: 25, height: 190, weight: 99, goalWeight: 95, activity: "light",
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const bmr = bmrMifflin(f.sex, f.weight, f.height, f.age);
  const tdee = bmr * (ACTIVITY.find((a) => a.id === f.activity)?.f || 1.375);
  const floor = Math.max(1500, Math.round(bmr));
  const target = Math.max(floor, Math.round((tdee - 600) / 10) * 10);
  const protein = Math.round(f.weight * 2);

  return (
    <div className="min-h-screen bg-stone-100 text-slate-900 py-8 px-4 overflow-x-hidden">
      <div className="max-w-md mx-auto space-y-5">
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-700 mb-2">Nastavenie</div>
          <h1 className="text-3xl font-semibold tracking-tight leading-tight">Poďme nastaviť východiskový bod</h1>
          <p className="text-sm text-slate-500 mt-2">
            Z týchto čísel spočítam odhadovaný výdaj energie a rozumný cieľ. Všetko sa dá neskôr zmeniť.
          </p>
        </div>

        <Card className="space-y-4">
          <div>
            <Label>Meno (nepovinné)</Label>
            <input
              value={f.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full border border-slate-300 rounded-sm px-3 py-2 focus:outline-none focus:border-sky-700"
              placeholder="Napr. Kajo"
            />
          </div>
          <div>
            <Label>Pohlavie</Label>
            <div className="grid grid-cols-2 gap-2">
              {[["m", "Muž"], ["z", "Žena"]].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => set("sex", v)}
                  className={`py-2 text-sm border rounded-sm ${f.sex === v ? "border-sky-800 bg-sky-800 text-white" : "border-slate-300 bg-white hover:border-slate-400"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Vek</Label><NumField value={f.age} onChange={(v) => set("age", v)} unit="r" /></div>
            <div><Label>Výška</Label><NumField value={f.height} onChange={(v) => set("height", v)} unit="cm" /></div>
            <div><Label>Váha teraz</Label><NumField value={f.weight} onChange={(v) => set("weight", v)} unit="kg" step={0.5} /></div>
            <div><Label>Cieľová váha</Label><NumField value={f.goalWeight} onChange={(v) => set("goalWeight", v)} unit="kg" step={0.5} /></div>
          </div>
          <div>
            <Label>Denná aktivita</Label>
            <div className="space-y-2">
              {ACTIVITY.map((a) => (
                <button
                  key={a.id}
                  onClick={() => set("activity", a.id)}
                  className={`w-full text-left px-3 py-2 text-sm border rounded-sm flex justify-between items-center ${
                    f.activity === a.id ? "border-sky-800 bg-sky-50" : "border-slate-300 bg-white hover:border-slate-400"
                  }`}
                >
                  <span>{a.label}</span>
                  <span className="font-mono text-xs text-slate-400">×{a.f}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900 border-slate-900">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="font-mono tabular-nums text-2xl text-white">{n0(tdee)}</div>
              <div className="text-xs uppercase tracking-widest text-slate-400 mt-1">Výdaj / deň</div>
            </div>
            <div>
              <div className="font-mono tabular-nums text-2xl text-amber-500">{n0(target)}</div>
              <div className="text-xs uppercase tracking-widest text-slate-400 mt-1">Cieľ kcal</div>
            </div>
            <div>
              <div className="font-mono tabular-nums text-2xl text-white">{n0(protein)}</div>
              <div className="text-xs uppercase tracking-widest text-slate-400 mt-1">Bielkoviny g</div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4 leading-relaxed">
            Cieľ mieri na úbytok okolo 0,6 kg týždenne a nikdy neklesne pod {n0(floor)} kcal. Odhad výdaja je len
            východisko – po dvoch týždňoch dát ho tréner prepočíta podľa reality.
          </p>
        </Card>

        <button
          onClick={() =>
            onDone({
              ...f,
              tdee: Math.round(tdee),
              bmr: Math.round(bmr),
              kcalTarget: target,
              proteinTarget: protein,
              fatTarget: Math.round((f.weight * 0.8)),
              fiberTarget: 30,
              startWeight: f.weight,
              startDate: todayISO(),
            })
          }
          className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 text-sm uppercase tracking-widest rounded-sm focus:outline-none focus:ring-2 focus:ring-slate-900 active:scale-[0.98]"
        >
          Začať
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── today ───────────────────────── */

function Today({ profile, log, saveLog, avgNow, rate }) {
  const [date, setDate] = useState(todayISO());
  const entry = log[date] || {};
  const upd = (k, v) => saveLog({ ...log, [date]: { ...entry, [k]: v } });

  const kcalPct = entry.kcal ? (entry.kcal / profile.kcalTarget) * 100 : 0;
  const carbTarget = Math.max(
    50,
    Math.round((profile.kcalTarget - profile.proteinTarget * 4 - profile.fatTarget * 9) / 4)
  );

  const macros = [
    { k: "protein", label: "Bielkoviny", target: profile.proteinTarget, tone: "bg-sky-700" },
    { k: "carbs", label: "Sacharidy", target: carbTarget, tone: "bg-amber-600" },
    { k: "fat", label: "Tuky", target: profile.fatTarget, tone: "bg-slate-700" },
    { k: "fiber", label: "Vláknina", target: profile.fiberTarget, tone: "bg-emerald-700" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setDate(addDays(date, -1))} className="p-2 text-slate-400 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-700" aria-label="Predchádzajúci deň">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <div className="text-sm font-medium">{skDay(date)} {skDate(date)}</div>
          {date === todayISO() && <div className="text-xs uppercase tracking-widest text-amber-700">dnes</div>}
        </div>
        <button
          onClick={() => setDate(addDays(date, 1))}
          disabled={date >= todayISO()}
          className="p-2 text-slate-400 hover:text-slate-900 disabled:opacity-25 focus:outline-none focus:ring-2 focus:ring-sky-700"
          aria-label="Nasledujúci deň"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <Card>
        <div className="flex items-end justify-between gap-4">
          <Readout
            value={entry.weight != null ? n1(entry.weight) : "—"}
            unit="kg"
            label="Ranná váha"
          />
          <div className="text-right">
            <div className="font-mono tabular-nums text-lg">{avgNow != null ? n2(avgNow) : "—"}</div>
            <div className="text-xs uppercase tracking-widest text-slate-400 mt-1">7-dňový priemer</div>
            {rate != null && (
              <div className={`font-mono text-xs mt-1 ${rate < 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {rate > 0 ? "+" : ""}{n2(rate)} kg / týž.
              </div>
            )}
          </div>
        </div>
        <div className="mt-4">
          <NumField value={entry.weight} onChange={(v) => upd("weight", v)} unit="kg" step={0.1} placeholder="102,4" />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Ráno po prebudení, po toalete, pred jedlom a pitím.
        </p>
      </Card>

      <Card>
        <div className="flex items-end justify-between mb-3">
          <Readout
            value={entry.kcal != null ? n0(entry.kcal) : "—"}
            unit="kcal"
            size="md"
            tone={entry.kcal > profile.kcalTarget * 1.1 ? "warn" : "ink"}
            label={`Cieľ ${n0(profile.kcalTarget)} kcal`}
          />
          {entry.kcal != null && (
            <div className="font-mono text-sm text-slate-400">{n0(kcalPct)} %</div>
          )}
        </div>
        <Bar7 pct={kcalPct} tone={kcalPct > 110 ? "bg-rose-600" : "bg-slate-900"} />
        <div className="mt-4">
          <NumField value={entry.kcal} onChange={(v) => upd("kcal", v)} unit="kcal" step={50} placeholder="2200" />
        </div>
      </Card>

      <Card className="space-y-4">
        <Label>Makrá</Label>
        {macros.map((m) => {
          const val = entry[m.k];
          const pct = val ? (val / m.target) * 100 : 0;
          return (
            <div key={m.k}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm">{m.label}</span>
                <span className="font-mono tabular-nums text-sm">
                  {val != null ? n0(val) : "—"}
                  <span className="text-slate-400"> / {m.target} g</span>
                </span>
              </div>
              <Bar7 pct={pct} tone={m.tone} />
              <div className="mt-2">
                <NumField value={val} onChange={(v) => upd(m.k, v)} unit="g" step={5} />
              </div>
            </div>
          );
        })}
      </Card>

      <Card>
        <Label>Poznámka</Label>
        <textarea
          value={entry.note || ""}
          onChange={(e) => upd("note", e.target.value)}
          rows={2}
          placeholder="Zlý spánok, cestovanie, viac soli…"
          className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-sky-700"
        />
      </Card>
    </div>
  );
}

/* ───────────────────────── training ───────────────────────── */

function Training({ workouts, save }) {
  const [split, setSplit] = useState("UPPER A");
  const [date, setDate] = useState(todayISO());
  const [draft, setDraft] = useState(null);

  const history = useMemo(
    () => [...workouts].sort((a, b) => b.date.localeCompare(a.date)),
    [workouts]
  );

  const lastFor = useCallback(
    (exName) => {
      for (const w of history) {
        const ex = w.exercises.find((e) => e.name === exName);
        if (ex && ex.sets.some((s) => s.weight)) return { date: w.date, sets: ex.sets };
      }
      return null;
    },
    [history]
  );

  const startSession = () => {
    setDraft({
      id: `w-${Date.now()}`,
      date,
      split,
      exercises: TEMPLATES[split].map((t) => {
        const last = lastFor(t.name);
        return {
          name: t.name,
          sets: last ? last.sets.map((s) => ({ weight: s.weight, reps: null })) : [{ weight: null, reps: null }, { weight: null, reps: null }],
        };
      }),
    });
  };

  const suggestion = (t) => {
    const last = lastFor(t.name);
    if (!last) return "Prvý záznam – zvoľ váhu, pri ktorej zvládneš cieľové opakovania s rezervou 1–2 opakovaní.";
    const top = last.sets.reduce((b, s) => (e1rm(s.weight || 0, s.reps || 0) > e1rm(b.weight || 0, b.reps || 0) ? s : b), last.sets[0]);
    if ((top.reps || 0) >= t.hi) {
      return `Minule ${n1(top.weight)} × ${top.reps}. Pridaj ${t.step} kg a vráť sa na ${t.lo}–${t.lo + 2} opakovaní.`;
    }
    return `Minule ${n1(top.weight)} × ${top.reps}. Skús rovnakú váhu o 1 opakovanie viac (cieľ ${t.hi}).`;
  };

  if (draft) {
    const tpl = TEMPLATES[draft.split];
    const setSet = (ei, si, k, v) => {
      const ex = draft.exercises.map((e, i) =>
        i !== ei ? e : { ...e, sets: e.sets.map((s, j) => (j !== si ? s : { ...s, [k]: v })) }
      );
      setDraft({ ...draft, exercises: ex });
    };
    const addSet = (ei) => {
      const ex = draft.exercises.map((e, i) =>
        i !== ei ? e : { ...e, sets: [...e.sets, { weight: e.sets[e.sets.length - 1]?.weight ?? null, reps: null }] }
      );
      setDraft({ ...draft, exercises: ex });
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-amber-700">{draft.split}</div>
            <div className="text-sm text-slate-500">{skDay(draft.date)} {skDate(draft.date)}</div>
          </div>
          <button onClick={() => setDraft(null)} className="text-xs uppercase tracking-widest text-slate-400 hover:text-slate-900">
            Zrušiť
          </button>
        </div>

        {draft.exercises.map((ex, ei) => {
          const t = tpl.find((x) => x.name === ex.name) || { lo: 6, hi: 10, step: 2.5 };
          const last = lastFor(ex.name);
          return (
            <Card key={ex.name}>
              <div className="flex justify-between items-baseline">
                <div className="font-medium">{ex.name}</div>
                <div className="text-xs font-mono text-slate-400">{t.lo}–{t.hi} opak.</div>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{suggestion(t)}</p>

              <div className="mt-3 space-y-2">
                {ex.sets.map((s, si) => (
                  <div key={si} className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400 w-6">{si + 1}.</span>
                    <div className="flex-1"><NumField value={s.weight} onChange={(v) => setSet(ei, si, "weight", v)} unit="kg" step={t.step} /></div>
                    <span className="text-slate-300">×</span>
                    <div className="w-20"><NumField value={s.reps} onChange={(v) => setSet(ei, si, "reps", v)} step={1} /></div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-3">
                <button onClick={() => addSet(ei)} className="text-xs uppercase tracking-widest text-sky-800 hover:text-sky-900">
                  + séria
                </button>
                {last && (
                  <div className="font-mono text-xs text-slate-400">
                    minule {last.sets.map((s) => `${n1(s.weight)}×${s.reps ?? "?"}`).join("  ")}
                  </div>
                )}
              </div>
            </Card>
          );
        })}

        <button
          onClick={() => {
            const clean = {
              ...draft,
              exercises: draft.exercises
                .map((e) => ({ ...e, sets: e.sets.filter((s) => s.weight != null && s.reps != null) }))
                .filter((e) => e.sets.length),
            };
            if (clean.exercises.length) save([...workouts, clean]);
            setDraft(null);
          }}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 text-sm uppercase tracking-widest rounded-sm focus:outline-none focus:ring-2 focus:ring-amber-600 active:scale-[0.98]"
        >
          Uložiť tréning
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <Label>Nový tréning</Label>
        <div className="grid grid-cols-2 gap-2">
          {SPLITS.map((s) => (
            <button
              key={s}
              onClick={() => setSplit(s)}
              className={`py-3 text-sm border rounded-sm font-medium ${
                split === s ? "border-sky-800 bg-sky-800 text-white" : "border-slate-300 bg-white hover:border-slate-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Label>Dátum</Label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-slate-300 rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-sky-700"
          />
        </div>
        <button
          onClick={startSession}
          className="w-full mt-3 bg-amber-600 hover:bg-amber-700 text-white py-3 text-sm uppercase tracking-widest rounded-sm focus:outline-none focus:ring-2 focus:ring-slate-900 active:scale-[0.98]"
        >
          Otvoriť {split}
        </button>
      </Card>

      <div>
        <Label>História</Label>
        <div className="space-y-2">
          {history.length === 0 && (
            <Card><p className="text-sm text-slate-500">Zatiaľ žiadny tréning. Vyber split a začni.</p></Card>
          )}
          {history.slice(0, 12).map((w) => (
            <Card key={w.id}>
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-xs uppercase tracking-widest text-amber-700">{w.split}</span>
                  <span className="text-xs text-slate-400 ml-2 font-mono">{skDate(w.date)}</span>
                </div>
                <button
                  onClick={() => save(workouts.filter((x) => x.id !== w.id))}
                  className="text-slate-300 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-700"
                  aria-label="Zmazať tréning"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {w.exercises.map((ex) => (
                  <div key={ex.name} className="flex justify-between text-sm">
                    <span className="text-slate-600">{ex.name}</span>
                    <span className="font-mono tabular-nums text-slate-900">
                      {ex.sets.map((s) => `${n1(s.weight)}×${s.reps}`).join("  ")}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── progress ───────────────────────── */

function Progress({ series, weekAvgs, workouts, profile }) {
  const exNames = useMemo(() => {
    const s = new Set();
    workouts.forEach((w) => w.exercises.forEach((e) => s.add(e.name)));
    return [...s].sort();
  }, [workouts]);
  const [ex, setEx] = useState(exNames[0] || "");

  const strength = useMemo(() => {
    return workouts
      .filter((w) => w.exercises.some((e) => e.name === ex))
      .map((w) => {
        const e = w.exercises.find((x) => x.name === ex);
        const top = e.sets.reduce((b, s) => Math.max(b, e1rm(s.weight || 0, s.reps || 0)), 0);
        const best = e.sets.reduce((b, s) => (e1rm(s.weight || 0, s.reps || 0) > e1rm(b.weight || 0, b.reps || 0) ? s : b), e.sets[0]);
        return { date: w.date, label: skDate(w.date), e1rm: Math.round(top * 10) / 10, best: `${n1(best.weight)}×${best.reps}` };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [workouts, ex]);

  const wSeries = series.filter((s) => s.weight != null || s.avg != null);
  const kSeries = series.filter((s) => s.kcal != null);

  return (
    <div className="space-y-4">
      <Card>
        <Label>Váha a 7-dňový priemer</Label>
        {wSeries.length < 2 ? (
          <p className="text-sm text-slate-500">Zapíš aspoň dva dni, aby sa dal nakresliť trend.</p>
        ) : (
          <div className="h-56 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={wSeries}>
                <CartesianGrid stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#a8a29e" }} interval="preserveStartEnd" />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 10, fill: "#a8a29e" }} width={38} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 2, border: "1px solid #e7e5e4" }}
                  formatter={(v, k) => [n2(v) + " kg", k === "avg" ? "priemer" : "denná"]}
                />
                {profile.goalWeight && (
                  <ReferenceLine y={profile.goalWeight} stroke="#d97706" strokeDasharray="4 4" />
                )}
                <Line type="monotone" dataKey="weight" stroke="#cbd5e1" strokeWidth={1.5} dot={{ r: 2 }} connectNulls />
                <Line type="monotone" dataKey="avg" stroke="#0c4a6e" strokeWidth={2.5} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-xs text-slate-400 mt-2">
          Tmavá čiara je priemer – to je signál. Svetlá je denná váha, tá skáče a nič neznamená.
        </p>
      </Card>

      {weekAvgs.length > 0 && (
        <Card>
          <Label>Týždenný súhrn</Label>
          <div className="space-y-2">
            {weekAvgs.map((w, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <div className="font-mono text-sm">{skDate(w.from)}–{skDate(w.to)}</div>
                  <div className="text-xs text-slate-400">{w.n} meraní{w.kcal ? ` · ${n0(w.kcal)} kcal` : ""}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono tabular-nums text-lg">{n2(w.avg)}</div>
                  {w.delta != null && (
                    <div className={`font-mono text-xs ${w.delta < 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {w.delta > 0 ? "+" : ""}{n2(w.delta)} kg
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {kSeries.length > 1 && (
        <Card>
          <Label>Príjem energie</Label>
          <div className="h-40 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kSeries}>
                <CartesianGrid stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#a8a29e" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "#a8a29e" }} width={38} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 2, border: "1px solid #e7e5e4" }} formatter={(v) => [n0(v) + " kcal", "príjem"]} />
                <ReferenceLine y={profile.kcalTarget} stroke="#0c4a6e" strokeDasharray="4 4" />
                <Bar dataKey="kcal" fill="#d97706" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {exNames.length > 0 && (
        <Card>
          <Label>Sila v čase</Label>
          <select
            value={ex}
            onChange={(e) => setEx(e.target.value)}
            className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm mb-3 bg-white focus:outline-none focus:border-sky-700"
          >
            {exNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          {strength.length < 2 ? (
            <p className="text-sm text-slate-500">Na graf treba aspoň dva tréningy s týmto cvikom.</p>
          ) : (
            <>
              <div className="h-40 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={strength}>
                    <CartesianGrid stroke="#e7e5e4" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#a8a29e" }} />
                    <YAxis domain={["dataMin - 5", "dataMax + 5"]} tick={{ fontSize: 10, fill: "#a8a29e" }} width={38} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 2, border: "1px solid #e7e5e4" }}
                      formatter={(v, k, p) => [`${n1(v)} kg · ${p.payload.best}`, "odhad 1RM"]}
                    />
                    <Line type="monotone" dataKey="e1rm" stroke="#0c4a6e" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t border-slate-100">
                <div>
                  <div className="font-mono text-sm">{strength[0].best}</div>
                  <div className="text-xs uppercase tracking-widest text-slate-400 mt-1">{skDate(strength[0].date)}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">{strength[strength.length - 1].best}</div>
                  <div className="text-xs uppercase tracking-widest text-slate-400 mt-1">{skDate(strength[strength.length - 1].date)}</div>
                </div>
              </div>
            </>
          )}
          <p className="text-xs text-slate-400 mt-2">
            Odhad 1RM zjednocuje váhu aj opakovania do jedného čísla, takže 100×8 a 110×6 sa dajú porovnať.
          </p>
        </Card>
      )}
    </div>
  );
}

/* ───────────────────────── coach ───────────────────────── */

function Coach({ advice, profile, rate, avgNow, weekAvgs }) {
  const styles = {
    good: { box: "border-l-4 border-emerald-700 bg-emerald-50", icon: Check, ic: "text-emerald-700" },
    info: { box: "border-l-4 border-sky-800 bg-sky-50", icon: Info, ic: "text-sky-800" },
    warn: { box: "border-l-4 border-amber-600 bg-amber-50", icon: AlertTriangle, ic: "text-amber-700" },
    alert: { box: "border-l-4 border-rose-700 bg-rose-50", icon: AlertTriangle, ic: "text-rose-700" },
  };

  const cur = avgNow ?? profile.weight;
  const toGo = cur - profile.goalWeight;
  const weeks = rate != null && rate < -0.05 ? toGo / Math.abs(rate) : null;

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900 border-slate-900">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="font-mono tabular-nums text-2xl text-white">{n1(toGo)}</div>
            <div className="text-xs uppercase tracking-widest text-slate-400 mt-1">kg do cieľa</div>
          </div>
          <div>
            <div className={`font-mono tabular-nums text-2xl ${rate != null && rate < 0 ? "text-emerald-400" : "text-amber-500"}`}>
              {rate != null ? `${rate > 0 ? "+" : ""}${n2(rate)}` : "—"}
            </div>
            <div className="text-xs uppercase tracking-widest text-slate-400 mt-1">kg / týždeň</div>
          </div>
          <div>
            <div className="font-mono tabular-nums text-2xl text-white">{weeks != null ? n0(weeks) : "—"}</div>
            <div className="text-xs uppercase tracking-widest text-slate-400 mt-1">týždňov</div>
          </div>
        </div>
        {weeks != null && (
          <p className="text-xs text-slate-400 mt-4">
            Pri súčasnom tempe si na {n1(profile.goalWeight)} kg približne o {n0(weeks)} týždňov. Odhad sa mení každý
            týždeň – čím viac dát, tým je presnejší.
          </p>
        )}
      </Card>

      <div className="space-y-3">
        {advice.map((a, i) => {
          const s = styles[a.level] || styles.info;
          const Icon = s.icon;
          return (
            <div key={i} className={`p-4 rounded-sm ${s.box}`}>
              <div className="flex items-start gap-3">
                <Icon size={16} className={`mt-1 shrink-0 ${s.ic}`} />
                <div>
                  <div className="font-medium text-sm">{a.title}</div>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{a.body}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Card>
        <Label>Pravidlá, podľa ktorých radím</Label>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span>Nad 1 % hmotnosti / týždeň</span>
            <span className="font-mono text-rose-700">pridaj kcal</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span>0,5 – 1 % / týždeň</span>
            <span className="font-mono text-emerald-700">nemeň nič</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span>Pod 0,25 % dva týždne</span>
            <span className="font-mono text-amber-700">–150 kcal</span>
          </div>
          <div className="flex justify-between">
            <span>Sila klesá vo väčšine cvikov</span>
            <span className="font-mono text-rose-700">kcal má prednosť</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4 leading-relaxed">
          Toto je nástroj na sledovanie tvojich vlastných dát, nie náhrada za lekára ani výživového poradcu. Ak sa
          objaví únava, závraty, výpadky výkonu alebo iné zdravotné ťažkosti, poraď sa s odborníkom.
        </p>
      </Card>
    </div>
  );
}

/* ───────────────────────── profile ───────────────────────── */

function Profile({ profile, save }) {
  const [f, setF] = useState(profile);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const [confirm, setConfirm] = useState(false);
  const [importState, setImportState] = useState(null);

  const downloadBackup = async () => {
    const [p, log, workouts] = await Promise.all([
      store.get("profile", null),
      store.get("daily-log", {}),
      store.get("workout-log", []),
    ]);
    const backup = { app: "trener", version: 1, exportedAt: new Date().toISOString(), profile: p, log, workouts };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trener-zaloha-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== "trener" || typeof data.profile === "undefined") {
        setImportState({ error: "Tento súbor nevyzerá ako záloha z tejto appky." });
        return;
      }
      setImportState({ pending: data });
    } catch {
      setImportState({ error: "Súbor sa nedá prečítať – nie je to platný JSON." });
    }
  };

  const confirmRestore = async () => {
    const data = importState.pending;
    await store.set("profile", data.profile ?? null);
    await store.set("daily-log", data.log ?? {});
    await store.set("workout-log", data.workouts ?? []);
    window.location.reload();
  };

  const bmr = bmrMifflin(f.sex, f.weight, f.height, f.age);
  const tdee = bmr * (ACTIVITY.find((a) => a.id === f.activity)?.f || 1.375);
  const floor = Math.max(1500, Math.round(bmr));
  const tooLow = f.kcalTarget < floor;
  const deficit = tdee - f.kcalTarget;
  const projected = (deficit * 7) / 7700;

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <Label>Telo</Label>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Vek</Label><NumField value={f.age} onChange={(v) => set("age", v)} unit="r" /></div>
          <div><Label>Výška</Label><NumField value={f.height} onChange={(v) => set("height", v)} unit="cm" /></div>
          <div><Label>Váha</Label><NumField value={f.weight} onChange={(v) => set("weight", v)} unit="kg" step={0.5} /></div>
          <div><Label>Cieľ</Label><NumField value={f.goalWeight} onChange={(v) => set("goalWeight", v)} unit="kg" step={0.5} /></div>
        </div>
        <div>
          <Label>Aktivita</Label>
          <div className="space-y-2">
            {ACTIVITY.map((a) => (
              <button
                key={a.id}
                onClick={() => set("activity", a.id)}
                className={`w-full text-left px-3 py-2 text-sm border rounded-sm ${
                  f.activity === a.id ? "border-sky-800 bg-sky-50" : "border-slate-300 bg-white hover:border-slate-400"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <Label>Denné ciele</Label>
        <div><Label>Kalórie</Label><NumField value={f.kcalTarget} onChange={(v) => set("kcalTarget", v)} unit="kcal" step={50} /></div>
        {tooLow && (
          <div className="p-3 bg-rose-50 border-l-4 border-rose-700 text-sm text-slate-700">
            <strong className="block text-rose-700">Pod bezpečnou hranicou</strong>
            Odhadovaný pokojový výdaj je {n0(bmr)} kcal. Dlhodobý príjem pod touto úrovňou pri štyroch tréningoch
            týždenne vedie k strate svalu, únave a poklesu výkonov. Nastav aspoň {n0(floor)} kcal.
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Bielk.</Label><NumField value={f.proteinTarget} onChange={(v) => set("proteinTarget", v)} unit="g" step={5} /></div>
          <div><Label>Tuky</Label><NumField value={f.fatTarget} onChange={(v) => set("fatTarget", v)} unit="g" step={5} /></div>
          <div><Label>Vláknina</Label><NumField value={f.fiberTarget} onChange={(v) => set("fiberTarget", v)} unit="g" step={1} /></div>
        </div>

        <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-3">
          <div><Readout size="sm" value={n0(tdee)} label="výdaj" tone="steel" /></div>
          <div><Readout size="sm" value={n0(deficit)} label="deficit" tone="brass" /></div>
          <div><Readout size="sm" value={n2(projected)} label="kg/týž. odhad" tone={Math.abs(projected) > 1 ? "warn" : "good"} /></div>
        </div>
      </Card>

      <button
        onClick={() => save({ ...f, tdee: Math.round(tdee), bmr: Math.round(bmr) })}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 text-sm uppercase tracking-widest rounded-sm focus:outline-none focus:ring-2 focus:ring-amber-600 active:scale-[0.98]"
      >
        Uložiť profil
      </button>

      <Card className="space-y-3">
        <Label>Záloha</Label>
        <p className="text-sm text-slate-500">Dáta sú len v tomto prehliadači. Stiahni si zálohu, nech o ne neprídeš.</p>
        <div className="flex gap-2">
          <button
            onClick={downloadBackup}
            className="flex-1 flex items-center justify-center gap-2 border border-slate-300 bg-white hover:border-slate-400 py-2 text-sm uppercase tracking-widest rounded-sm active:scale-[0.98]"
          >
            <Download size={14} /> Stiahnuť
          </button>
          <button
            onClick={() => document.getElementById("backup-file-input").click()}
            className="flex-1 flex items-center justify-center gap-2 border border-slate-300 bg-white hover:border-slate-400 py-2 text-sm uppercase tracking-widest rounded-sm active:scale-[0.98]"
          >
            <Upload size={14} /> Nahrať
          </button>
          <input id="backup-file-input" type="file" accept="application/json" className="hidden" onChange={handleFileSelect} />
        </div>
        {importState?.error && <p className="text-sm text-rose-700">{importState.error}</p>}
        {importState?.pending && (
          <div className="p-3 bg-amber-50 border-l-4 border-amber-600 space-y-3">
            <p className="text-sm text-slate-700">
              Nahradí všetky súčasné dáta zálohou
              {importState.pending.exportedAt ? ` z ${new Date(importState.pending.exportedAt).toLocaleDateString("sk-SK")}` : ""}.
              Späť sa to vrátiť nedá.
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmRestore}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 text-sm uppercase tracking-widest rounded-sm active:scale-[0.98]"
              >
                Obnoviť
              </button>
              <button
                onClick={() => setImportState(null)}
                className="flex-1 border border-slate-300 py-2 text-sm uppercase tracking-widest rounded-sm active:scale-[0.98]"
              >
                Zrušiť
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <Label>Vymazať dáta</Label>
        {!confirm ? (
          <button onClick={() => setConfirm(true)} className="text-sm text-slate-500 hover:text-rose-700 flex items-center gap-2">
            <RotateCcw size={14} /> Vymazať všetko a začať odznova
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Zmaže profil, denník aj tréningy. Späť sa to vrátiť nedá.</p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await store.set("profile", null);
                  await store.set("daily-log", {});
                  await store.set("workout-log", []);
                  window.location.reload();
                }}
                className="flex-1 bg-rose-700 text-white py-2 text-sm uppercase tracking-widest rounded-sm active:scale-[0.98]"
              >
                Vymazať
              </button>
              <button onClick={() => setConfirm(false)} className="flex-1 border border-slate-300 py-2 text-sm uppercase tracking-widest rounded-sm active:scale-[0.98]">
                Späť
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
