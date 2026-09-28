// Trend line chart. Colours follow the entity (stored light-mode hex); in dark
// mode each hue is swapped for its dark-surface step from the same palette.
const DARK_STEP = {
  "#2a78d6": "#3987e5", "#eb6834": "#d95926", "#1baf7a": "#199e70", "#eda100": "#c98500",
  "#e87ba4": "#d55181", "#008300": "#008300", "#4a3aa7": "#9085e9", "#e34948": "#e66767",
};

function isDark() {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function drawTrend(id, data) {
  const el = document.getElementById(id);
  if (!el || !window.Chart) return;
  const pctMetric = data.metric === "visibility" || data.metric === "share_of_voice";
  let chart;

  function build() {
    const dark = isDark();
    const col = (c) => (dark && DARK_STEP[c.toLowerCase()]) || c;
    const datasets = data.series.map((s) => ({
      label: s.name,
      data: s.data,
      borderColor: col(s.color),
      backgroundColor: col(s.color),
      borderWidth: s.is_own ? 3 : 2,
      pointRadius: data.labels.length > 20 ? 0 : 3,
      pointHoverRadius: 5,
      pointHoverBorderWidth: 2,
      pointHoverBorderColor: cssVar("--surface"),
      tension: 0.25,
      spanGaps: true,
      order: s.is_own ? 0 : 1,
    }));
    if (chart) chart.destroy();
    const ink = cssVar("--text-2"), grid = cssVar("--grid");
    chart = new Chart(el, {
      type: "line",
      data: { labels: data.labels, datasets },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { grid: { display: false }, ticks: { color: ink, maxTicksLimit: 8, maxRotation: 0 },
               border: { color: grid } },
          y: {
            reverse: data.metric === "position",
            min: pctMetric ? 0 : undefined, max: data.metric === "visibility" ? 100 : undefined,
            grid: { color: grid }, border: { display: false },
            ticks: { color: ink, maxTicksLimit: 5, callback: (v) => (pctMetric ? v + "%" : v) },
          },
        },
        plugins: {
          legend: { position: "bottom", labels: { color: ink, usePointStyle: true, pointStyle: "line", boxWidth: 18 } },
          tooltip: {
            backgroundColor: cssVar("--surface"), titleColor: cssVar("--text"), bodyColor: cssVar("--text"),
            borderColor: grid, borderWidth: 1, padding: 10, boxPadding: 4,
            itemSort: (a, b) => (data.metric === "position" ? a.raw - b.raw : b.raw - a.raw),
            callbacks: { label: (c) => ` ${c.dataset.label}: ${c.raw == null ? "–" : c.raw + (pctMetric ? "%" : "")}` },
          },
        },
      },
    });
  }
  build();
  window.addEventListener("themechange", build);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", build);
}
