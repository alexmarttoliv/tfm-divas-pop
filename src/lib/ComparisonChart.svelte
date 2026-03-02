<!-- src/lib/ComparisonChart.svelte -->
<script>
  import { scaleLinear } from "d3";
  import { emotions } from '$lib/config.js';

  export let data = [];

  const COMPARE_COLORS  = ["#e63946", "#4b62d2", "#FFB401"];
  const COMPARE_STROKES = ["rgba(230,57,70,0.15)", "rgba(75,98,210,0.15)", "rgba(255,180,1,0.15)"];

  let slots = [
    { type: null, value: null, label: null, data: null },
    { type: null, value: null, label: null, data: null },
    { type: null, value: null, label: null, data: null },
  ];

  let selectTypes  = ["artista", "artista", "artista"];
  let selectValues = ["", "", ""];

  $: artists = data.length ? [...new Set(data.map(d => d.artist))].sort() : [];
  $: albums  = data.length ? [...new Set(data.map(d => d.album))].sort()  : [];
  $: tracks  = data.length ? [...new Set(data.map(d => d.track))].sort()  : [];

  function onTypeChange(i) {
    selectValues[i] = "";
    slots[i] = { type: null, value: null, label: null, data: null };
    slots = [...slots];
  }

  function addSlot(i) {
    const t = selectTypes[i];
    const v = selectValues[i];
    if (!v) return;
    let label = v, d;
    if (t === "artista") {
      d = aggregateRows(data.filter(r => r.artist === v), "artista", v);
    } else if (t === "album") {
      const rows = data.filter(r => r.album === v);
      d = aggregateRows(rows, "album", v);
      label = `${v} · ${rows[0]?.artist || ""}`;
    } else {
      const rows = data.filter(r => r.track === v);
      d = aggregateRows(rows.slice(0, 1), "cancion", v);
      label = `${v} · ${rows[0]?.artist || ""}`;
    }
    slots[i] = { type: t, value: v, label, data: d };
    slots = [...slots];
  }

  function removeSlot(i) {
    slots[i] = { type: null, value: null, label: null, data: null };
    slots = [...slots];
    selectValues[i] = "";
  }

  function aggregateRows(rows, type, name) {
    if (!rows.length) return null;
    const n = rows.length;
    const avg = key => rows.reduce((s, r) => s + (r[key] || 0), 0) / n;
    return {
      type, name, count: n,
      valence:    avg("valence"),
      activation: avg("activation"),
      alegría:    avg("emocion_alegría"),
      tristeza:   avg("emocion_tristeza"),
      miedo:      avg("emocion_miedo"),
      ira:        avg("emocion_ira"),
      sorpresa:   avg("emocion_sorpresa"),
      asco:       avg("emocion_asco"),
    };
  }

  $: activeSlots = slots
    .map((s, i) => s.data ? { ...s, color: COMPARE_COLORS[i], fill: COMPARE_STROKES[i] } : null)
    .filter(Boolean);

  // ── RADAR ──
  const RADAR_SIZE   = 380;
  const RADAR_CX     = RADAR_SIZE / 2;
  const RADAR_CY     = RADAR_SIZE / 2;
  const RADAR_R      = 138;
  const RADAR_LEVELS = 4;

  const KEY_MAP = {
    joy: "alegría", sadness: "tristeza", fear: "miedo",
    anger: "ira", surprise: "sorpresa", disgust: "asco"
  };

  const radarAxes = emotions.map((e, i) => {
    const angle = (Math.PI * 2 * i) / emotions.length - Math.PI / 2;
    return {
      key: e.key, label: e.label, color: e.color, angle,
      x: RADAR_CX + (RADAR_R + 30) * Math.cos(angle),
      y: RADAR_CY + (RADAR_R + 30) * Math.sin(angle),
    };
  });

  function radarPoint(value, angle) {
    return {
      x: RADAR_CX + value * RADAR_R * Math.cos(angle),
      y: RADAR_CY + value * RADAR_R * Math.sin(angle),
    };
  };

  // Grid hexagonal (reto) — só para referência visual
  function radarLevelPath(level) {
    const r = (RADAR_R * level) / RADAR_LEVELS;
    return emotions.map((_, i) => {
      const angle = radarAxes[i].angle;
      return `${i === 0 ? "M" : "L"} ${RADAR_CX + r * Math.cos(angle)} ${RADAR_CY + r * Math.sin(angle)}`;
    }).join(" ") + " Z";
  };


  function radarPolygon(slotData) {
    return emotions.map((e, i) => {
      const val = Math.min(1, Math.max(0, slotData[KEY_MAP[e.key]] || 0));
      const pt  = radarPoint(val, radarAxes[i].angle);
      return `${pt.x},${pt.y}`;
    }).join(" ");
  };


  // ── DUMBBELL ──
  const DB_W = 400, DB_H = 200, DB_PX = 50, DB_PY = 32;
  const DB_TRACK_Y = [75, 145];

  $: xScale = scaleLinear().domain([-1, 1]).range([DB_PX, DB_W - DB_PX]);

  function resolveOverlaps(points, baseY, threshold = 16, step = 22) {
    const sorted = [...points].sort((a, b) => a.x - b.x);
    const offsets = new Array(sorted.length).fill(0);

    let i = 0;
    while (i < sorted.length) {
      let j = i;
      // encontra todos os pontos próximos (cluster)
      while (j < sorted.length - 1 && Math.abs(sorted[j + 1].x - sorted[i].x) < threshold) {
        j++;
      }
      if (j > i) {
        // distribui os offsets verticais centrados em 0
        const count = j - i + 1;
        const half = (count - 1) / 2;
        for (let k = i; k <= j; k++) {
          offsets[k] = (k - i - half) * step;
        }
      }
      i = j + 1;
    }

    return sorted.map((pt, idx) => ({ ...pt, y: baseY + offsets[idx] }));
  };

  $: dumbellNodes = [
    { key: "valence",    label: "Valencia",   yIdx: 0 },
    { key: "activation", label: "Activación", yIdx: 1 },
  ].map(dim => {
    const baseY = DB_TRACK_Y[dim.yIdx];
    const raw = activeSlots.map(s => ({
      x: xScale(s.data[dim.key]),
      y: baseY,
      color: s.color,
      value: s.data[dim.key].toFixed(2),
      label: s.label,
    }));
    return {
      ...dim,
      y: baseY,
      points: resolveOverlaps(raw, baseY)
    };
  });

  // ── TOOLTIPS ──
  let radarTooltip = null;
  let dbTooltip    = null;

  function showRadarTooltip(e, slot, axis) {
    const val = (slot.data[KEY_MAP[axis.key]] * 100).toFixed(0);
    radarTooltip = { x: e.clientX, y: e.clientY, text: `${slot.label}: ${val}%` };
  };

  function hideRadarTooltip() { radarTooltip = null; };

  function showDbTooltip(e, pt) {
    dbTooltip = { x: e.clientX, y: e.clientY, text: `${pt.label}: ${pt.value}` };
  };

  function hideDbTooltip() { dbTooltip = null; };


  const SUGGESTIONS = [
    {
      label: "3 divas con un ADN muy similar",
      items: [
        { type: "artista", value: "Ariana Grande" },
        { type: "artista", value: "Beyoncé" },
        { type: "artista", value: "Britney Spears" },
      ]
    },
    {
      label: "3 hits íconicos de los años 2000",
      items: [
        { type: "cancion", value: "Bad Romance" },
        { type: "cancion", value: "Crazy In Love (feat. JAY-Z)" },
        { type: "cancion", value: "Toxic" },
      ]
    },
    {
      label: "La nueva generación obscura",
      items: [
        { type: "artista", value: "Billie Eilish" },
        { type: "artista", value: "Olivia Rodrigo" },
        { type: "artista", value: "Tate McRae" },
      ]
    },
    {
      label: "Dos álbumes muy distintos de una misma diva",
      items: [
        { type: "album", value: "Erotica" },
        { type: "album", value: "Like a Virgin" },
      ]
    },
  ];

  function applySuggestion(suggestion) {
    // limpa todos os slots
    slots = slots.map(() => ({ type: null, value: null, label: null, data: null }));
    selectTypes  = ["artista", "artista", "artista"];
    selectValues = ["", "", ""];

    suggestion.items.forEach((item, i) => {
      if (i >= 3) return;
      selectTypes[i]  = item.type;
      selectValues[i] = item.value;
      addSlot(i);
    });

    slots        = [...slots];
    selectTypes  = [...selectTypes];
    selectValues = [...selectValues];
  };

</script>

<div class="comp-outer">
  <div class="comp-sticky">

    <!-- ROW 1: Título à esquerda -->
    <div class="comp-header">
      <div class="header-text">
        <h2 class="comp-title">Compara el ADN emocional</h2>
        <p class="comp-subtitle">
          Selecciona hasta <strong>3 elementos</strong> (canciones, álbumes o artistas)
          para visualizar cómo se comparan emocionalmente entre sí
        </p>
      </div>
    </div>

    <!-- ROW 2: Filtros em linha -->
    <div class="slots-area">

      <div class="slots-row">
        {#each slots as slot, i}
          <div
            class="slot-card"
            class:slot-filled-card={!!slot.data}
            style="--slot-color:{COMPARE_COLORS[i]}"
          >
            <div class="slot-number" style="background:{COMPARE_COLORS[i]}">{i + 1}</div>

            {#if slot.data}
              <div class="slot-filled">
                <div class="slot-type-badge">
                  {slot.type === 'artista' ? '🎤 Artista' : slot.type === 'album' ? '💿 Álbum' : '🎵 Canción'}
                </div>
                <div class="slot-label" title={slot.label}>{slot.label}</div>
                <div class="slot-count">{slot.data.count} canción{slot.data.count !== 1 ? 'es' : ''}</div>
                <button class="remove-slot-btn" on:click={() => removeSlot(i)}>✕</button>
              </div>
            {:else}
              <div class="slot-empty">
                <select class="type-select" bind:value={selectTypes[i]} on:change={() => onTypeChange(i)}>
                  <option value="artista">Artista</option>
                  <option value="album">Álbum</option>
                  <option value="cancion">Canción</option>
                </select>

                {#if selectTypes[i] === "artista"}
                  <select class="value-select" bind:value={selectValues[i]}>
                    <option value="">Elige artista…</option>
                    {#each artists as a}<option value={a}>{a}</option>{/each}
                  </select>
                {:else if selectTypes[i] === "album"}
                  <select class="value-select" bind:value={selectValues[i]}>
                    <option value="">Elige álbum…</option>
                    {#each albums as al}<option value={al}>{al}</option>{/each}
                  </select>
                {:else}
                  <select class="value-select" bind:value={selectValues[i]}>
                    <option value="">Elige canción…</option>
                    {#each tracks as t}<option value={t}>{t}</option>{/each}
                  </select>
                {/if}

                <button
                  class="add-slot-btn"
                  disabled={!selectValues[i]}
                  on:click={() => addSlot(i)}
                >Añadir</button>
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <!-- painel de sugestões -->
      <div class="suggestions-panel">
        <span class="suggestions-label">✦ Prueba esto</span>
        <div class="suggestions-list">
          {#each SUGGESTIONS as sg}
            <button class="suggestion-btn" on:click={() => applySuggestion(sg)}>
              {sg.label}
            </button>
          {/each}
        </div>
      </div>

    </div>

    <!-- ROW 3: Gráficos lado a lado -->
    <div class="comp-charts">

      <!-- RADAR -->
      <div class="chart-block">
        <h3 class="chart-block-title">Perfil emocional</h3>
        <p class="chart-block-desc">Las 6 emociones de Ekman · valores medios (0–1)</p>
        <div class="radar-container">
          <svg
            width={RADAR_SIZE} height={RADAR_SIZE}
            viewBox="0 0 {RADAR_SIZE} {RADAR_SIZE}"
          >
            <!-- Grid hexagonal (reto) -->
            {#each Array(RADAR_LEVELS) as _, lv}
              <path d={radarLevelPath(lv + 1)} fill="none"
                stroke="rgba(168,158,150,0.2)" stroke-width="1" />
            {/each}

            <!-- Eixos -->
            {#each radarAxes as axis}
              <line
                x1={RADAR_CX} y1={RADAR_CY}
                x2={RADAR_CX + RADAR_R * Math.cos(axis.angle)}
                y2={RADAR_CY + RADAR_R * Math.sin(axis.angle)}
                stroke="rgba(168,158,150,0.25)" stroke-width="1"
              />
            {/each}

            <!-- Poligono dos slots -->
            {#each activeSlots as slot}
              <polygon
                points={radarPolygon(slot.data)}
                fill={slot.fill}
                stroke={slot.color}
                stroke-width="2.5"
                stroke-linejoin="round"
                style="transition: all 0.4s ease;"
              />
              <!-- Pontos nos vértices -->
              {#each emotions as em, ei}
                {@const axis = radarAxes[ei]}
                {@const val = Math.min(1, Math.max(0, slot.data[KEY_MAP[em.key]] || 0))}
                {@const pt  = radarPoint(val, axis.angle)}
                <g
                  role="img"
                  aria-label="{slot.label} – {axis.label}"
                  style="cursor:pointer"
                  on:mouseenter={(e) => showRadarTooltip(e, slot, axis)}
                  on:mouseleave={hideRadarTooltip}
                >
                  <circle
                    cx={pt.x} cy={pt.y} r="4.5"
                    fill={slot.color} stroke="white" stroke-width="1.5"
                  />
                </g>
              {/each}
            {/each}

            <!-- Labels das emoções -->
            {#each radarAxes as axis}
              <text
                x={axis.x} y={axis.y}
                text-anchor="middle"
                dominant-baseline="middle"
                font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
                font-size="15"
                font-weight="600"
                fill={axis.color}
              >{axis.label}</text>
            {/each}
          </svg>

          {#if activeSlots.length > 0}
            <div class="legend">
              {#each activeSlots as slot}
                <div class="legend-item">
                  <span class="legend-dot" style="background:{slot.color}"></span>
                  <span class="legend-text">{slot.label}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- DUMBBELL -->
      <div class="chart-block">
        <h3 class="chart-block-title">Valencia y Activación</h3>
        <p class="chart-block-desc">Modelo Circumplejo del Afecto · escala –1 a +1</p>
        <div class="dumbell-wrapper">
          <svg width="100%" viewBox="0 0 {DB_W} {DB_H}" preserveAspectRatio="xMidYMid meet">
            <line x1={xScale(0)} y1={DB_PY - 12} x2={xScale(0)} y2={DB_H - DB_PY + 10}
              stroke="rgba(168,158,150,0.35)" stroke-width="0.8" stroke-dasharray="4,3" />
            <text x={xScale(0)} y={DB_PY - 16} text-anchor="middle"
              font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
              font-size="6" fill="#c9bfb8">0</text>
            <text x={xScale(-1) + 2} y={DB_PY - 16}
              font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
              font-size="6" fill="#c9bfb8">–1</text>
            <text x={xScale(1) - 2} y={DB_PY - 16} text-anchor="end"
              font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
              font-size="6" fill="#c9bfb8">+1</text>

            {#each dumbellNodes as dim}
              <text x={DB_PX} y={dim.y - 16} text-anchor="start"
                font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
                font-size="8"
                font-weight="600"
                fill="#555"
              >{dim.label}</text>

              <line x1={xScale(-1)} y1={dim.y} x2={xScale(1)} y2={dim.y}
                stroke="rgba(168,158,150,0.2)" stroke-width="2" stroke-linecap="round" />

              {#each dim.points as pt}
                <g
                  role="img"
                  aria-label="{pt.label}: {pt.value}"
                  style="cursor:pointer"
                  on:mouseenter={(e) => showDbTooltip(e, pt)}
                  on:mouseleave={hideDbTooltip}
                >
                  <circle cx={pt.x} cy={pt.y} r="11"
                    fill={pt.color} 
                  />
                  <text x={pt.x} y={pt.y + 1}
                    text-anchor="middle"
                    dominant-baseline="middle"
                    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
                    font-size="7"
                    font-weight="700"
                    fill="white"
                  >{pt.value}</text>
                </g>
              {/each}
            {/each}

          </svg>

          {#if activeSlots.length > 0}
            <div class="legend">
              {#each activeSlots as slot}
                <div class="legend-item">
                  <span class="legend-dot" style="background:{slot.color}"></span>
                  <span class="legend-text">{slot.label}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

    </div><!-- /comp-charts -->

    <div class="scroll-hint">↓</div>

  </div><!-- /comp-sticky -->
</div>


{#if radarTooltip}
  <div class="float-tooltip"
    style="left:{radarTooltip.x + 14}px; top:{radarTooltip.y - 10}px">
    {radarTooltip.text}
  </div>
{/if}
{#if dbTooltip}
  <div class="float-tooltip"
    style="left:{dbTooltip.x + 14}px; top:{dbTooltip.y - 10}px">
    {dbTooltip.text}
  </div>
{/if}

<style>
  .scroll-hint {
    font-size: 1.5rem;
    color: #bbb;
    margin-top: 2rem;
    animation: bounce 2s infinite;
    text-align: center;
  }

  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
    40% {transform: translateY(-10px);}
    60% {transform: translateY(-5px);}
  }

  .comp-outer {
    width: 100%;
    min-height: 150vh;
  }

  .comp-sticky {
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
    background-color: #f8f2df;
    display: flex;
    flex-direction: column;
    padding: 2rem 3rem;
    box-sizing: border-box;
    gap: 0;
  }

  /* ── HEADER: alinhado à esquerda ── */
  .comp-header {
    flex-shrink: 0;
  }

  .comp-title {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: clamp(1.3rem, 2.5vw, 2rem);
    font-weight: 750;
    fill: #1a1a1a;
    letter-spacing: -1px;
    line-height: 1.1;
    margin: 0 0 0.5rem;
  }

  .comp-subtitle {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: clamp(1rem, 2vw, 1.3rem);
    font-weight: 400;
    line-height: 1.4;
    color: #555;
  }

  /* ── SLOTS AREA: filtros + sugestões lado a lado ── */
  .slots-area {
    display: grid;
    grid-template-columns: repeat(3, 1fr) 1.1fr;
    grid-auto-rows: 150px;
    gap: 0.75rem;
    align-items: stretch;
    flex-shrink: 0;
    margin-bottom: 1rem;
  }

  @media (max-width: 900px) {
    .slots-area {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* ── SUGESTÕES ── */
  .suggestions-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border: 2px dashed rgba(168,158,150,0.35);
    border-radius: 12px;
    padding: 0.6rem 0.75rem;
    background: #f0e8d4;
    box-sizing: border-box;
  }

  .suggestions-label {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #a89e96;
    flex-shrink: 0;
  }

  .suggestions-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 0.35rem;
    flex: 1;
  }

  .suggestion-btn {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 10.5px;
    font-weight: 500;
    line-height: 1.25;
    color: #1a1a1a;
    background: transparent;
    border: 1.5px solid rgba(168,158,150,0.35);
    border-radius: 8px;
    padding: 0.3rem 0.5rem;
    cursor: pointer;
    text-align: left;
    width: 100%;
    height: 100%;        /* preenche a célula do grid */
    box-sizing: border-box;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }

  .suggestion-btn:hover {
    background: #1a1a1a;
    border-color: #1a1a1a;
    color: #f8f2df;
  }


  /* ── FILTROS: 3 slots em linha ── */
  .slots-row {
    display: contents;
  }

  @media (max-width: 640px) {
    .slots-row { grid-template-columns: 1fr; }
  }

  .slot-card {
    border: 2px solid rgba(168,158,150,0.3);
    border-radius: 12px;
    padding: 0.6rem 0.75rem;
    background: #f0e8d4;
    position: relative;
    transition: border-color 0.2s, box-shadow 0.2s;
    display: flex;
    flex-direction: column;
  }

  .slot-card:hover {
    border-color: var(--slot-color);
    box-shadow: 0 3px 12px rgba(0,0,0,0.07);
  }

  .slot-filled-card {
    border-color: var(--slot-color) !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  }

  .slot-number {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    width: 20px; height: 20px;
    border-radius: 50%;
    color: white;
    font-size: 10px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.3rem;
    flex-shrink: 0;
  }

  .slot-empty {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    height: 100%;
    justify-content: center;
  }

  .type-select,
  .value-select {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 12px;
    color: #1a1a1a;
    background: rgba(248, 242, 223, 0.9);
    border: 1px solid rgba(190,180,170,0.5);
    border-radius: 7px;
    padding: 4px 8px;
    height: 28px;
    width: 100%;
    box-sizing: border-box;
    cursor: pointer;
    outline: none;
    transition: border-color 0.2s;
  }

  .type-select:focus,
  .value-select:focus {
    border-color: var(--slot-color, #a89e96);
  }

  .add-slot-btn {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: white;
    background: var(--slot-color);
    border: none;
    border-radius: 7px;
    padding: 5px 14px;
    cursor: pointer;
    align-self: flex-start;
    transition: opacity 0.15s, transform 0.15s;
    margin-top: 0.2rem;
  }

  .add-slot-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
  .add-slot-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .slot-filled {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-right: 22px;
    justify-content: center;
  }


  .slot-type-badge {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 10px; color: #a89e96; font-weight: 500;
  }

  .slot-label {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 13px; font-weight: 700; color: #1a1a1a;
    line-height: 1.3;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .slot-count {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 10px; color: #a89e96;
  }

  .remove-slot-btn {
    position: absolute; top: 8px; right: 8px;
    background: rgba(168,158,150,0.15);
    border: none; border-radius: 50%;
    width: 20px; height: 20px;
    font-size: 10px; cursor: pointer; color: #6b6259;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s, color 0.15s;
  }

  .remove-slot-btn:hover { background: #e63946; color: white; }

  /* ── GRÁFICOS: lado a lado ── */
  .comp-charts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    flex: 1;
    min-height: 0;
    align-items: stretch;
  }

  @media (max-width: 760px) {
    .comp-charts { grid-template-columns: 1fr; }
    .comp-sticky { height: auto; min-height: 100vh; }
  }

  .chart-block {
    background: transparent;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .chart-block-title {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 1rem; font-weight: 700;
    color: #1a1a1a;
    margin: 0 0 0.2rem;
    letter-spacing: -0.02em;
  }

  .chart-block-desc {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 12px; color: #a89e96;
    margin: 0 0 0.75rem; line-height: 1.4;
  }


  .radar-container svg { overflow: visible; }

  .radar-container,
  .dumbell-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .dumbell-wrapper .legend {
    justify-content: center;
  }

  .dumbell-wrapper svg { overflow: visible; width: 100%; }

  /* ── LEGENDA ── */
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 0.9rem;
    margin-top: auto;
  }

  .legend-item { display: flex; align-items: center; gap: 5px; }

  .legend-dot {
    width: 9px; height: 9px;
    border-radius: 50%; flex-shrink: 0;
  }

  .legend-text {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 10px; 
    font-weight: 600; 
    color: #6b6259;
    max-width: 140px;
    overflow: hidden; 
    text-overflow: ellipsis; 
    white-space: normal;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  /* ── TOOLTIP ── */
  .float-tooltip {
    position: fixed;
    background: #1a1a1a; color: white;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 12px; font-weight: 600;
    padding: 5px 10px; border-radius: 6px;
    pointer-events: none; z-index: 9999;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  }
</style>
