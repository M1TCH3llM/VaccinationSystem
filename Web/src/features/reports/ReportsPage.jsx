// web/src/features/reports/ReportsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

// Fallback demo data if API isn't ready yet
const demo = {
  dosesPerDay: [
    { date: "2025-10-20", count: 8 },
    { date: "2025-10-21", count: 12 },
    { date: "2025-10-22", count: 5 },
    { date: "2025-10-23", count: 14 },
    { date: "2025-10-24", count: 10 },
    { date: "2025-10-25", count: 16 },
    { date: "2025-10-26", count: 9 },
  ],
  demographics: {
    gender: { male: 42, female: 47, other: 11 },
    ageBuckets: [
      { label: "0–17", count: 6 },
      { label: "18–29", count: 24 },
      { label: "30–44", count: 28 },
      { label: "45–64", count: 29 },
      { label: "65+", count: 13 },
    ],
  },
  coverage: { totalRegistered: 200, vaccinated: 120 }, // 60%
};

async function safeGet(path) {
  try {
    const r = await fetch(path, { credentials: "include" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch {
    return null;
  }
}

export default function ReportsPage() {
  const [dosesPerDay, setDosesPerDay] = useState(demo.dosesPerDay);
  const [gender, setGender] = useState(demo.demographics.gender);
  const [ageBuckets, setAgeBuckets] = useState(demo.demographics.ageBuckets);
  const [coverage, setCoverage] = useState(demo.coverage);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // fetch from API if available; otherwise use demo
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      const [d1, d2, d3json] = await Promise.all([
        safeGet("/api/reports/doses-per-day"),
        safeGet("/api/reports/demographics"),
        safeGet("/api/reports/coverage"),
      ]);
      if (!alive) return;
      try {
        if (d1?.series?.length) setDosesPerDay(d1.series);
        if (d2?.gender) setGender(d2.gender);
        if (d2?.ageBuckets?.length) setAgeBuckets(d2.ageBuckets);
        if (d3json?.coverage) setCoverage(d3json.coverage);
      } catch (e) {
        setErr(e.message || "Failed to parse reports");
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const percentCovered = useMemo(() => {
    const { totalRegistered = 0, vaccinated = 0 } = coverage || {};
    return totalRegistered > 0 ? Math.round((vaccinated / totalRegistered) * 100) : 0;
  }, [coverage]);

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 m-0">Reports</h1>
        <span className="text-secondary small">{loading ? "Loading…" : "Up to date"}</span>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      {/* Watchlist-style summary cards */}
      <div className="row g-3 mb-3">
        <StatCard title="Coverage" value={`${percentCovered}%`} sub={`${coverage.vaccinated ?? 0} / ${coverage.totalRegistered ?? 0}`} />
        <StatCard title="Last 7 days" value={dosesPerDay.slice(-7).reduce((s, d) => s + (d.count || 0), 0)} sub="Doses administered" />
        <StatCard title="Gender mix" value={`${genderPct(gender, "female")}% / ${genderPct(gender, "male")}%`} sub="F / M" />
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card bg-dark border h-100">
            <div className="card-body">
              <h2 className="h6 mb-3">Doses per day (Bar)</h2>
              <BarChart data={dosesPerDay} />
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card bg-dark border h-100">
            <div className="card-body">
              <h2 className="h6 mb-3">Gender breakdown (Pie)</h2>
              <PieChart gender={gender} />
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-dark border mt-3">
        <div className="card-body">
          <h2 className="h6 mb-3">Age distribution</h2>
          <AgeBars data={ageBuckets} />
        </div>
      </div>

      {!err && !loading && (
        <div className="text-secondary small mt-3">
          {`* Showing ${dosesPerDay.length} days. If the API isn't implemented yet, these charts use demo data.`}
        </div>
      )}
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
  return Math.round(((g?.[key] || 0) / total) * 100);
}

/** --- BarChart: doses per day --- */
function BarChart({ data }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = ""; // clear

    const width = el.clientWidth || 640;
    const height = 260;
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };

    const x = d3
      .scaleBand()
      .domain(data.map(d => d.date))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 1])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const svg = d3
      .select(el)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    svg
      .append("g")
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", d => x(d.date))
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => y(0) - y(d.count));

    const xAxis = g =>
      g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(d => d.slice(5))) // show MM-DD
        .selectAll("text")
        .style("font-size", "10px");

    const yAxis = g =>
      g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(5))
        .selectAll("text")
        .style("font-size", "10px");

    svg.append("g").call(xAxis);
    svg.append("g").call(yAxis);
  }, [data]);

  return <div ref={ref} />;
}

/** --- PieChart: gender --- */
function PieChart({ gender }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";

    const entries = Object.entries(gender || {});
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

    const pie = d3.pie().value(d => d[1]);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    svg
      .selectAll("path")
      .data(pie(entries))
      .join("path")
      .attr("d", arc);

    svg
      .selectAll("text")
      .data(pie(entries))
      .join("text")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .text(d => `${d.data[0]} (${Math.round((d.data[1] / d3.sum(entries, e => e[1])) * 100)}%)`);
  }, [gender]);

  return <div ref={ref} />;
}

/** --- AgeBars: horizontal bars --- */
function AgeBars({ data }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";

    const width = el.clientWidth || 640;
    const height = 24 * data.length + 30;
    const margin = { top: 10, right: 10, bottom: 20, left: 70 };

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 1])
      .nice()
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleBand()
      .domain(data.map(d => d.label))
      .range([margin.top, height - margin.bottom])
      .padding(0.2);

    const svg = d3
      .select(el)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    svg
      .append("g")
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", x(0))
      .attr("y", d => y(d.label))
      .attr("width", d => x(d.count) - x(0))
      .attr("height", y.bandwidth());

    const xAxis = g =>
      g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(5))
        .selectAll("text")
        .style("font-size", "10px");

    const yAxis = g =>
      g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "10px");

    svg.append("g").call(xAxis);
    svg.append("g").call(yAxis);
  }, [data]);

  return <div ref={ref} />;
}
