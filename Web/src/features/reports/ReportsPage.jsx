// web/src/features/reports/ReportsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useSelector } from "react-redux"; 
import { selectToken } from "../../store"; 

async function getJsonAuth(path, token) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    throw new Error("Authentication token is missing.");
  }

  const res = await fetch(path, { headers, credentials: "omit" }); // Use 'omit' with Bearer token
  
  if (!res.ok) {
    const text = await res.text();
    let errorMsg = `HTTP ${res.status}`;
    try {
      const jsonError = JSON.parse(text);
      errorMsg = jsonError.error || jsonError.message || errorMsg;
    } catch (e) {
      errorMsg = `${errorMsg}: ${text}`;
    }
    throw new Error(errorMsg);
  }
  
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}


function normalizeDoses(series) {
  if (!Array.isArray(series)) return [];
  return series.map((row) => {
    const date =
      row?.date ??
      row?.day ??
      row?.ds ??
      row?._id?.date ??
      row?._id ??
      "";
    const count =
      Number(row?.count ?? row?.doses ?? row?.total ?? row?.value ?? 0);
    return { date: String(date), count: Number.isFinite(count) ? count : 0 };
  });
}

function normalizeGender(g) {
  const src = g || {};
  const keys = Object.keys(src).reduce((acc, k) => {
    acc[k.toLowerCase()] = Number(src[k] ?? 0);
    return acc;
  }, {});
  return {
    male: Number(keys.male ?? 0),
    female: Number(keys.female ?? 0),
    other: Number(keys.other ?? 0),
    unspecified: Number(keys.unspecified ?? keys.unknown ?? 0),
  };
}

function normalizeAgeBuckets(buckets) {
  if (!Array.isArray(buckets)) return [];
  return buckets.map((b) => {
    const label =
      b?.label ??
      b?.range ??
      b?.bucket ??
      (b?.min != null && b?.max != null ? `${b.min}-${b.max}` : String(b?._id ?? ""));
    const count = Number(b?.count ?? b?.total ?? b?.value ?? 0);
    return { label: String(label || ""), count: Number.isFinite(count) ? count : 0 };
  });
}

function useResizeRerender() {
  const [, setTick] = useState(0);
  const containerRef = useRef(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !window.ResizeObserver) return;
    const ro = new ResizeObserver(() => setTick((t) => t + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return containerRef;
}


export default function ReportsPage() {
  const [dosesPerDay, setDosesPerDay] = useState([]);
  const [gender, setGender] = useState({ male: 0, female: 0, other: 0, unspecified: 0 });
  const [ageBuckets, setAgeBuckets] = useState([]);
  const [coverage, setCoverage] = useState({ totalRegistered: 0, vaccinated: 0, percent: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [raw1, setRaw1] = useState(null);
  const [raw2, setRaw2] = useState(null);
  const [raw3, setRaw3] = useState(null);

  const token = useSelector(selectToken);

  async function load() {
    if (!token) {
      setErr("You must be logged in as an Admin to view reports.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErr(null);

      const [p1, p2, p3] = await Promise.all([
        getJsonAuth("/api/reports/doses-per-day?days=30", token),
        getJsonAuth("/api/reports/demographics", token),
        getJsonAuth("/api/reports/coverage", token),
      ]);

      setRaw1(p1);
      setRaw2(p2);
      setRaw3(p3);

      console.log("[reports] doses-per-day raw:", p1);
      console.log("[reports] demographics raw:", p2);
      console.log("[reports] coverage raw:", p3);

      setDosesPerDay(normalizeDoses(p1?.series ?? p1?.data ?? p1));
      setGender(normalizeGender(p2?.gender));
      setAgeBuckets(normalizeAgeBuckets(p2?.ageBuckets ?? p2?.ages ?? p2?.data));
      setCoverage(
        p3?.coverage ?? {
          totalRegistered: Number(p3?.totalRegistered ?? 0),
          vaccinated: Number(p3?.vaccinated ?? 0),
          percent: Number(p3?.percent ?? 0),
        }
      );
    } catch (e) {
      setErr(e.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]); 

  const percentCovered = useMemo(() => {
    const { percent, totalRegistered, vaccinated } = coverage || {};
    if (typeof percent === "number" && percent >= 0) return Math.round(percent);
    const tr = Number(totalRegistered || 0);
    const v = Number(vaccinated || 0);
    return tr > 0 ? Math.round((v / tr) * 100) : 0;
  }, [coverage]);
  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 m-0">Reports</h1>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-outline-light" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Reload"}
          </button>
          <span className="text-secondary small">{loading ? "Loading…" : "Live"}</span>
        </div>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      <div className="row g-3 mb-3">
        <StatCard
          title="Coverage"
          value={`${percentCovered}%`}
          sub={`${coverage.vaccinated ?? 0} / ${coverage.totalRegistered ?? 0}`}
        />
        <StatCard
          title="Last 7 days"
          value={dosesPerDay.slice(-7).reduce((s, d) => s + Number(d?.count || 0), 0)}
          sub="Doses administered"
        />
        <StatCard
          title="Gender mix"
          value={`${genderPct(gender, "female")}% / ${genderPct(gender, "male")}%`}
          sub="F / M"
        />
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card bg-dark border h-100">
            <div className="card-body">
              <h2 className="h6 mb-3">Doses per day</h2>
              <BarChart data={dosesPerDay} />
              {(!dosesPerDay || dosesPerDay.length === 0) && (
                <div className="text-secondary small mt-2">No data</div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card bg-dark border h-100">
            <div className="card-body">
              <h2 className="h6 mb-3">Gender breakdown</h2>
              <PieChart gender={gender} />
              {(Object.values(gender).reduce((s, n) => s + Number(n), 0) === 0) && (
                <div className="text-secondary small mt-2">No data</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-dark border mt-3">
        <div className="card-body">
          <h2 className="h6 mb-3">Age distribution</h2>
          <AgeBars data={ageBuckets} />
          {(!ageBuckets || ageBuckets.length === 0) && (
            <div className="text-secondary small mt-2">No data</div>
          )}
        </div>
      </div>

      {/* Debug panel */}
      <details className="mt-3">
        <summary className="text-secondary">Debug</summary>
        <pre className="small text-secondary mt-2">
{JSON.stringify(
  {
    lengths: {
      dosesPerDay: dosesPerDay?.length ?? 0,
      ageBuckets: ageBuckets?.length ?? 0,
      genderTotal: Object.values(gender || {}).reduce((s, n) => s + Number(n || 0), 0),
    },
    sample: {
      dosesPerDay: dosesPerDay?.slice?.(0, 3),
      ageBuckets: ageBuckets?.slice?.(0, 3),
      gender,
    },
    raw: {
      dosesPerDay: raw1,
      demographics: raw2,
      coverage: raw3,
    },
  },
  null,
  2
)}
        </pre>
      </details>
    </div>
  );
}

function StatCard({ title, value, sub }) {
  return (
    <div className="col-12 col-md-4">
      <div className="card bg-dark border h-100">
        <div className="card-body">
          <div className="text-secondary small">{title}</div>
          <div className="display-6">{value}</div>
          {sub && <div className="text-secondary small">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function genderPct(g, key) {
  const total = Object.values(g || {}).reduce((s, n) => s + Number(n || 0), 0) || 1;
  return Math.round(((Number(g?.[key] || 0)) / total) * 100);
}

/** --- BarChart: doses per day --- */
function BarChart({ data }) {
  const wrapRef = useResizeRerender();
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) return;

    const width = el.clientWidth || 640;
    const height = 260;
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };

    const dates = data.map((d) => d.date);
    const counts = data.map((d) => Number(d?.count || 0));

    const x = d3.scaleBand().domain(dates).range([margin.left, width - margin.right]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(counts) || 1]).nice().range([height - margin.bottom, margin.top]);

    const svg = d3
      .select(el)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    const color = d3.scaleLinear().domain([0, Math.max(data.length - 1, 1)]).range(["#6ea8fe", "#20c997"]);

    svg
      .append("g")
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", (d) => x(d.date))
      .attr("y", (d) => y(Number(d?.count || 0)))
      .attr("width", x.bandwidth())
      .attr("height", (d) => y(0) - y(Number(d?.count || 0)))
      .attr("rx", 4)
      .attr("fill", (_d, i) => color(i));

    const axColor = "#adb5bd";
    const formatTick = (d) => {
      if (d instanceof Date && !isNaN(d)) return d3.timeFormat("%m-%d")(d);
      const s = String(d || "");
      return s.length >= 7 ? s.slice(5) : s;
    };

    const xAxis = (g) =>
      g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(formatTick))
        .call((s) => s.selectAll("text").style("font-size", "10px").style("fill", axColor))
        .call((s) => s.selectAll("line").style("stroke", axColor))
        .call((s) => s.selectAll("path").style("stroke", axColor));

    const yAxis = (g) =>
      g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(5))
        .call((s) => s.selectAll("text").style("font-size", "10px").style("fill", axColor))
        .call((s) => s.selectAll("line").style("stroke", axColor))
        .call((s) => s.selectAll("path").style("stroke", axColor));

    svg.append("g").call(xAxis);
    svg.append("g").call(yAxis);
  }, [data]);

  return (
    <div ref={wrapRef}>
      <div ref={ref} />
    </div>
  );
}

/** --- PieChart: gender --- */
function PieChart({ gender }) {
  const wrapRef = useResizeRerender();
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";

    const entries = Object.entries(gender || {}).filter(([, v]) => Number(v) > 0);
    if (entries.length === 0) return;

    const total = entries.reduce((s, [, v]) => s + Number(v || 0), 0) || 1;
    const width = 320;
    const height = 260;
    const radius = Math.min(width, height) / 2 - 10;

    const svg = d3
      .select(el)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const color = d3
      .scaleOrdinal()
      .domain(entries.map((d) => d[0]))
      .range(["#ffb3c1", "#91e0ff", "#ffe69c", "#c0c0c0"]);

    const pie = d3.pie().value((d) => Number(d[1]));
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    svg
      .selectAll("path")
      .data(pie(entries))
      .join("path")
      .attr("d", arc)
      .attr("fill", (d) => color(d.data[0]));

    svg
      .selectAll("text")
      .data(pie(entries))
      .join("text")
      .attr("transform", (d) => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("fill", "#dee2e6")
      .text((d) => {
        const pct = Math.round((Number(d.data[1] || 0) / total) * 100);
        return `${d.data[0]} (${pct}%)`;
      });
  }, [gender]);

  return (
    <div ref={wrapRef}>
      <div ref={ref} />
    </div>
  );
}

/** --- AgeBars: horizontal bars --- */
function AgeBars({ data }) {
  const wrapRef = useResizeRerender();
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";

    const safe = Array.isArray(data) ? data : [];
    if (safe.length === 0) return;

    const width = el.clientWidth || 640;
    const counts = safe.map((d) => Number(d?.count || 0));
    const height = 26 * Math.max(safe.length, 1) + 30;
    const margin = { top: 10, right: 10, bottom: 20, left: 70 };

    const x = d3.scaleLinear().domain([0, d3.max(counts) || 1]).nice().range([margin.left, width - margin.right]);
    const y = d3
      .scaleBand()
      .domain(safe.map((d) => String(d?.label ?? "")))
      .range([margin.top, height - margin.bottom])
      .padding(0.2);

    const svg = d3
      .select(el)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    const color = d3.scaleLinear().domain([0, Math.max(safe.length - 1, 1)]).range(["#c29ffa", "#66d9e8"]);

    svg
      .append("g")
      .selectAll("rect")
      .data(safe)
      .join("rect")
      .attr("x", x(0))
      .attr("y", (d) => y(String(d?.label ?? "")))
      .attr("width", (d) => x(Number(d?.count || 0)) - x(0))
      .attr("height", y.bandwidth())
      .attr("rx", 4)
      .attr("fill", (_d, i) => color(i));

    const axColor = "#adb5bd";

    const xAxis = (g) =>
      g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(5))
        .call((s) => s.selectAll("text").style("font-size", "10px").style("fill", axColor))
        .call((s) => s.selectAll("line").style("stroke", axColor))
        .call((s) => s.selectAll("path").style("stroke", axColor));

    const yAxis = (g) =>
      g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .call((s) => s.selectAll("text").style("font-size", "10px").style("fill", axColor))
        .call((s) => s.selectAll("line").style("stroke", axColor))
        .call((s) => s.selectAll("path").style("stroke", axColor));

    svg.append("g").call(xAxis);
    svg.append("g").call(yAxis);
  }, [data]);

  return (
    <div ref={wrapRef}>
      <div ref={ref} />
    </div>
  );
}
