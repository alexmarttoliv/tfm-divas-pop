<!-- src/lib/ValenceActivationScatter.svelte -->
<script>
  import { scaleLinear } from "d3";
  import { onMount, tick } from "svelte";
  import { forceSimulation, forceX, forceY, forceCollide } from "d3-force";
  import { emotions, divas } from '$lib/config.js';
  import { base } from '$app/paths';

  export let data = [];

  /* ── DIMENSÕES ── */
  let tooltip = null;
  let hoveredId = null;
  let pinnedId  = null;
  let nodes = [];
  let container;
  let width = 600;
  let height = 800;

  const margin = { top: 100, right: 80, bottom: 60, left: 80 };
  const ticks = [-1, 1];

    /* ── CORES POR EMOÇÃO ── */
  const emotionColors = Object.fromEntries(
    emotions.map(e => [e.label.toLowerCase(), e.color])
  );

  /* ── ARTISTAS E FOTOS ── */
  const divaImages = Object.fromEntries(
    divas.map(d => [d.name, `${base}/artists/${d.file}`])
  );

  // ── MODO DE EXIBIÇÃO ──
  let viewMode = 'cancion'; // 'cancion' | 'album' | 'artista'
  let isTransitioning = false;

  // Helper para IDs seguros em SVG (sem espaços/caracteres especiais)
  function sanitizeId(str) {
    return str.replace(/[^a-zA-Z0-9]/g, '-');
  };

  // Raio do nó baseado no modo
  const RADIUS = { cancion: 4, album: 22, artista: 40 };

  function nodeRadius(d, isActive = false) {
    const base = RADIUS[viewMode] ?? 4;
    return isActive ? base * 1.35 : base;
  }

  // ── AGREGAÇÃO: ÁLBUNS ──
  $: rawAlbumData = (() => {
    const groups = {};
    data.forEach(d => {
      if (!groups[d.album]) {
        groups[d.album] = {
          id: `album-${sanitizeId(d.album)}`,
          type: 'album',
          album: d.album,
          artist: d.artist,
          album_image_url: d.album_image_url,
          valence_sum: 0, activation_sum: 0,
          count: 0, emotion_counts: {},
          emotion_sums: {}  // ← novo
        };
      }
      const g = groups[d.album];
      g.valence_sum    += d.valence;
      g.activation_sum += d.activation;
      g.count++;
      g.emotion_counts[d.dominant_emotion] = (g.emotion_counts[d.dominant_emotion] || 0) + 1;

      // Acumula soma de cada emoção ← novo
      emotions.forEach(e => {
        const key = `emocion_${e.label.toLowerCase()}`;
        g.emotion_sums[key] = (g.emotion_sums[key] || 0) + (d[key] || 0);
      });
    });

    return Object.values(groups).map(g => {
      // Calcula médias das emoções ← novo
      const emotion_avgs = {};
      emotions.forEach(e => {
        const key = `emocion_${e.label.toLowerCase()}`;
        emotion_avgs[key] = (g.emotion_sums[key] / g.count).toFixed(2);
      });

      return {
        ...g,
        ...emotion_avgs,  // ← espalha as médias no objeto
        valence:    g.valence_sum    / g.count,
        activation: g.activation_sum / g.count,
        dominant_emotion: Object.entries(g.emotion_counts).sort((a,b) => b[1]-a[1])[0][0]
      };
    });
  })();

  // ── AGREGAÇÃO: ARTISTAS ──
  $: rawArtistData = (() => {
    const groups = {};
    data.forEach(d => {
      if (!groups[d.artist]) {
        groups[d.artist] = {
          id: `artist-${sanitizeId(d.artist)}`,
          type: 'artista',
          artist: d.artist,
          valence_sum: 0, activation_sum: 0,
          count: 0, emotion_counts: {},
          emotion_sums: {}  // ← novo
        };
      }
      const g = groups[d.artist];
      g.valence_sum    += d.valence;
      g.activation_sum += d.activation;
      g.count++;
      g.emotion_counts[d.dominant_emotion] = (g.emotion_counts[d.dominant_emotion] || 0) + 1;

      // Acumula soma de cada emoção ← novo
      emotions.forEach(e => {
        const key = `emocion_${e.label.toLowerCase()}`;
        g.emotion_sums[key] = (g.emotion_sums[key] || 0) + (d[key] || 0);
      });
    });

    return Object.values(groups).map(g => {
      // Calcula médias das emoções ← novo
      const emotion_avgs = {};
      emotions.forEach(e => {
        const key = `emocion_${e.label.toLowerCase()}`;
        emotion_avgs[key] = (g.emotion_sums[key] / g.count).toFixed(2);
      });

      return {
        ...g,
        ...emotion_avgs,  // ← espalha as médias no objeto
        valence:    g.valence_sum    / g.count,
        activation: g.activation_sum / g.count,
        dominant_emotion: Object.entries(g.emotion_counts).sort((a,b) => b[1]-a[1])[0][0]
      };
    });
  })();


  // ── TROCA DE MODO COM ANIMAÇÃO ──
  async function changeViewMode(newMode) {
    if (newMode === viewMode || isTransitioning) return;
    isTransitioning = true;              // fade-out inicia

    // Limpa filtros que não fazem sentido
    if (newMode === 'artista') {
      filterTrack  = "";
      filterAlbums = new Set();
      filterYearMin = ""; filterYearMax = "";
    } else if (newMode === 'album') {
      filterTrack  = "";
    }

    await new Promise(r => setTimeout(r, 300));
    viewMode = newMode;                  // troca o modo → dispara computeNodes reativamente
    await tick();
    isTransitioning = false;             // fade-in inicia
  };

    /* ── FILTROS ── */
  let filterTrack    = "";
  let filterEmotions = new Set(); // vazio = todas
  let filterArtists = new Set();
  let filterAlbums  = new Set();
  let filterYearMin  = "";
  let filterYearMax  = "";
  let selectArtistValue = "";


  // Listas únicas para os selects
  $: artists = [...new Set(data.map(d => d.artist))].sort();
  $: yearMin = data.length ? Math.min(...data.map(d => d.year)) : 1970;
  $: yearMax = data.length ? Math.max(...data.map(d => d.year)) : 2025;

  function toggleEmotion(label) {
    const s = new Set(filterEmotions);
    s.has(label) ? s.delete(label) : s.add(label);
    filterEmotions = s;
  };

  function clearFilters() {
    filterTrack    = "";
    filterArtists  = new Set();
    filterAlbums   = new Set();
    filterEmotions = new Set();
    filterYearMin  = "";
    filterYearMax  = "";
  };

  // Funções de add/remove
  function addArtist(value) {
    if (!value) return;
    filterArtists = new Set([...filterArtists, value]);
    filterAlbum = ""; // reseta álbum ao mudar artista
    filterAlbums = new Set();
  };
  function removeArtist(value) {
    const s = new Set(filterArtists);
    s.delete(value);
    filterArtists = s;
  };
  function addAlbum(value) {
    if (!value) return;
    filterAlbums = new Set([...filterAlbums, value]);
  };
  function removeAlbum(value) {
    const s = new Set(filterAlbums);
    s.delete(value);
    filterAlbums = s;
  };

  // Álbuns filtrados pelas artistas selecionadas
  $: albums = [...new Set(
    (filterArtists.size > 0
      ? data.filter(d => filterArtists.has(d.artist))
      : data
    ).map(d => d.album)
  )].sort();



  $: hasActiveFilters =
    viewMode === 'cancion'
      ? !!(filterTrack || filterArtists.size || filterAlbums.size || filterEmotions.size || filterYearMin || filterYearMax)
      : viewMode === 'album'
        ? !!(filterArtists.size || filterAlbums.size || filterEmotions.size)
        : !!(filterArtists.size || filterEmotions.size);


  
  /* ── IDs ATIVOS (para opacity dos círculos) ── */
  $: activeIdCancion = new Set(
    !filterTrack && filterArtists.size === 0 && filterAlbums.size === 0 &&
    filterEmotions.size === 0 && !filterYearMin && !filterYearMax
      ? data.map(d => `${d.artist}-${d.track}-${d.year}`)
      : data
          .filter(d => {
            if (filterTrack     && !d.track.toLowerCase().includes(filterTrack.toLowerCase())) return false;
            if (filterArtists.size  > 0 && !filterArtists.has(d.artist))           return false;
            if (filterAlbums.size   > 0 && !filterAlbums.has(d.album))             return false;
            if (filterEmotions.size > 0 && !filterEmotions.has(d.dominant_emotion)) return false;
            if (filterYearMin && d.year < +filterYearMin) return false;
            if (filterYearMax && d.year > +filterYearMax) return false;
            return true;
          })
          .map(d => `${d.artist}-${d.track}-${d.year}`)
  );

  $: activeIdAlbum = new Set(
    filterArtists.size === 0 && filterAlbums.size === 0 && filterEmotions.size === 0
      ? rawAlbumData.map(d => d.id)
      : rawAlbumData
          .filter(d => {
            if (filterArtists.size  > 0 && !filterArtists.has(d.artist))           return false;
            if (filterAlbums.size   > 0 && !filterAlbums.has(d.album))             return false;
            if (filterEmotions.size > 0 && !filterEmotions.has(d.dominant_emotion)) return false;
            return true;
          })
          .map(d => d.id)
  );

  $: activeIdArtista = new Set(
    filterArtists.size === 0 && filterEmotions.size === 0
      ? rawArtistData.map(d => d.id)
      : rawArtistData
          .filter(d => {
            if (filterArtists.size  > 0 && !filterArtists.has(d.artist))           return false;
            if (filterEmotions.size > 0 && !filterEmotions.has(d.dominant_emotion)) return false;
            return true;
          })
          .map(d => d.id)
  );

  $: activeIds = viewMode === 'cancion' ? activeIdCancion
              : viewMode === 'album'   ? activeIdAlbum
              : activeIdArtista;

 /* ── REDIMENSIONA A TELA ── */         
  onMount(() => {
    const ro = new ResizeObserver(() => {
      width  = container.clientWidth;
      height = container.clientHeight;
    });
    ro.observe(container);

    requestAnimationFrame(() => {
      width  = container.clientWidth;
      height = container.clientHeight;
    });

    return () => ro.disconnect();
  });


  /* ── ESCALAS ── */
  $: x = scaleLinear().domain([-1, 1]).range([margin.left, width - margin.right]);
  $: y = scaleLinear().domain([-1, 1]).range([height - margin.bottom, margin.top]);

  /* ── NÓS COM FORCE SIMULATION ── */
  function computeNodes() {
    let sourceData;

    if (viewMode === 'cancion') {
      sourceData = data.map(d => ({
        ...d,
        id: `${d.artist}-${d.track}-${d.year}`,
        type: 'cancion'
      }));
    } else if (viewMode === 'album') {
      sourceData = rawAlbumData;
    } else {
      sourceData = rawArtistData;
    }

    nodes = sourceData.map(d => ({
      ...d,
      x: x(d.valence),
      y: y(d.activation)
    }));

    const colRadius = viewMode === 'cancion' ? 6
      : viewMode === 'album' ? RADIUS.album + 3
      : RADIUS.artista + 4;

    const simulation = forceSimulation(nodes)
      .force("x", forceX(d => x(d.valence)).strength(1))
      .force("y", forceY(d => y(d.activation)).strength(1.2))
      .force("collide", forceCollide(colRadius))
      .stop();

    for (let i = 0; i < 120; i++) simulation.tick();
  };

  $: if (data.length && width && viewMode !== undefined) computeNodes();

  /* ── LABELS DOS QUADRANTES  ── */
  $: qLabels = width ? [
    { x: x(0.5),  y: margin.top - 50,             sub: "Alta activación · Valencia positiva", main: "Euforia"    },
    { x: x(-0.5), y: margin.top - 50,             sub: "Alta activación · Valencia negativa", main: "Furia"      },
    { x: x(0.5),  y: height - margin.bottom - 10, sub: "Baja activación · Valencia positiva", main: "Serenidad"  },
    { x: x(-0.5), y: height - margin.bottom - 10, sub: "Baja activación · Valencia negativa", main: "Melancolía" },
  ] : [];


  /* ── TOOLTIP ── */
  function showTooltip(event, d) {
    if (hasActiveFilters && !activeIds.has(d.id)) return;
    hoveredId = d.id;
    // só mostra tooltip flutuante se não houver ponto fixado
    if (!pinnedId) {
      tooltip = { x: event.clientX, y: event.clientY, data: d, pinned: false };
    }
  };

  function moveTooltip(event) {
    if (!tooltip || tooltip.pinned) return; // não move se estiver fixo
    tooltip = { ...tooltip, x: event.clientX, y: event.clientY };
  };

  function hideTooltip() {
    hoveredId = null;
    if (!pinnedId) tooltip = null; // só esconde se não tiver ponto fixado
  };

  function clickPoint(event, d) {
    if (hasActiveFilters && !activeIds.has(d.id)) return;
    event.stopPropagation();

    if (pinnedId === d.id) {
      pinnedId = null;
      tooltip  = null;
      return;
    }

    pinnedId = d.id;

    // Posição do centro do nó em coordenadas de tela
    const svgEl  = container.querySelector('svg');
    const rect   = svgEl.getBoundingClientRect();
    const nodeX  = rect.left + d.x;
    const nodeY  = rect.top  + d.y;

    // Raio atual (base, pois o scale ainda não foi aplicado ao calcular)
    const r = viewMode === 'artista' ? RADIUS.artista
            : viewMode === 'album'   ? RADIUS.album
            : 4;

    // Tenta abrir à direita do nó; se não couber, abre à esquerda
    const spaceRight = window.innerWidth  - (nodeX + r);
    const spaceLeft  = nodeX - r;
    const left = spaceRight >= TOOLTIP_W
      ? nodeX + r + 8
      : nodeX - r - TOOLTIP_W - 8;

    // Tenta abrir abaixo do centro; se não couber, sobe
    const tooltipApproxH = 380;
    const top = (nodeY + tooltipApproxH < window.innerHeight)
      ? nodeY - 40          // alinha levemente acima do centro
      : nodeY - tooltipApproxH + 40;

    tooltip = { x: left - 16, y: top - 16, data: d, pinned: true };
  };


  function clickBackground() {
    // clique fora de um ponto: desfixa
    if (pinnedId) {
      pinnedId = null;
      tooltip  = null;
    }
  };

  $: trackSuggestions = filterTrack.length < 2
  ? []  // só começa a sugerir depois de 2 caracteres
  : [...new Set(
      data
        .filter(d => d.track.toLowerCase().includes(filterTrack.toLowerCase()))
        .map(d => d.track)
    )]
    .sort()
    .slice(0, 20); // limita a 20 sugestões

  // constante de dimensão estimada do tooltip
  const TOOLTIP_W = 276; // 260px max-width + 16px de offset
  const TOOLTIP_H = 340; // altura estimada

  // posição inteligente reativa
  $: tooltipStyle = (() => {
    if (!tooltip) return '';
    const left = tooltip.x + 16 + TOOLTIP_W > window.innerWidth
      ? tooltip.x - TOOLTIP_W   // vira para a esquerda
      : tooltip.x + 16;
    const top = tooltip.y + 16 + TOOLTIP_H > window.innerHeight
      ? tooltip.y - TOOLTIP_H   // vira para cima
      : tooltip.y + 16;
    return `left:${left}px; top:${top}px;`;
  })();

// variável reativa para o total de nós visíveis
  $: totalNodes = viewMode === 'cancion' ? data.length
              : viewMode === 'album'   ? rawAlbumData.length
              : rawArtistData.length;


</script>

<!-- ── WRAPPER STICKY ── -->
<div class="scatter-wrapper">
  <div class="sticky-chart">

    <!-- ── HEADER: título ── -->
    <div class="chart-header">
      <div class="titles">
        <span class="title-text">Cartografía emocional</span>
        <span class="subtitle-text">
          Entre euforia, melancolía, furia y serenidad. Navega por el plano emocional y descubre qué sentimientos dominan cada época y cada diva
        </span>
      </div>

      <div class="view-mode-switcher">
        {#each [
          { id: 'cancion',  label: 'Canciones' },
          { id: 'album',    label: 'Álbumes'   },
          { id: 'artista',  label: 'Artistas'  }
        ] as mode}
          <button
            class="mode-btn"
            class:active={viewMode === mode.id}
            disabled={isTransitioning}
            on:click={() => changeViewMode(mode.id)}
          >
            {mode.label}
          </button>
        {/each}
      </div>

    </div>

    <!-- ── PAINEL DE FILTROS ── -->
    <div class="filters-panel">

      <!-- Canción: só no modo cancion -->
      {#if viewMode === 'cancion'}
        <div class="filter-group">
          <span class="filter-label">Canción</span>
          <input
            class="filter-input"
            type="text"
            placeholder="Buscar canción…"
            list="track-suggestions"
            bind:value={filterTrack}
          />
          <datalist id="track-suggestions">
            {#each trackSuggestions as track}
              <option value={track}></option>
            {/each}
          </datalist>
        </div>
      {/if}

      <!-- Álbum: só nos modos cancion e album -->
      {#if viewMode !== 'artista'}
        <div class="filter-group">
          <span class="filter-label">Álbum</span>
          <select class="filter-select"
            on:change={(e) => { addAlbum(e.target.value); e.target.value = ""; }}>
            <option value="">Añadir álbum…</option>
            {#each albums.filter(al => !filterAlbums.has(al)) as al}
              <option value={al}>{al}</option>
            {/each}
          </select>
        </div>
      {/if}

      <!-- Artista: em todos os modos -->
      <div class="filter-group">
        <span class="filter-label">Artista</span>
        <select class="filter-select" bind:value={selectArtistValue}
          on:change={() => { addArtist(selectArtistValue); selectArtistValue = ""; }}>
          <option value="">Añadir artista…</option>
          {#each artists.filter(a => !filterArtists.has(a)) as a}
            <option value={a}>{a}</option>
          {/each}
        </select>
      </div>

      <!-- Año -->
      {#if viewMode !== 'artista'}
        <div class="filter-group">
          <span class="filter-label">Año</span>
          <div class="year-range">
            <input class="filter-input year-input" type="number"
              placeholder={yearMin} min={yearMin} max={yearMax} bind:value={filterYearMin} />
            <span class="year-sep">–</span>
            <input class="filter-input year-input" type="number"
              placeholder={yearMax} min={yearMin} max={yearMax} bind:value={filterYearMax} />
          </div>
        </div>
      {/if}

      <!-- Emoción dominante -->
      <div class="filter-group emotion-group">
        <span class="filter-label">Emoción dominante</span>
        <div class="emotion-pills">
          {#each emotions as e}
            <button
              class="emotion-pill"
              class:selected={filterEmotions.has(e.label.toLowerCase())}
              style="--c:{e.color}"
              on:click={() => toggleEmotion(e.label.toLowerCase())}
            >
              {e.label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Limpar filtros -->
      {#if hasActiveFilters}
        <div class="active-filters-row">

          <button class="clear-btn" on:click={clearFilters}>
            ✕ Limpiar
            <span class="active-count">{activeIds.size} / {totalNodes}</span>
          </button>

          {#each [...filterArtists] as a}
            <button class="selected-tag artist-tag" on:click={() => removeArtist(a)}>
              {a} <span>✕</span>
            </button>
          {/each}

          {#each [...filterAlbums] as al}
            <button class="selected-tag album-tag" on:click={() => removeAlbum(al)}>
              {al} <span>✕</span>
            </button>
          {/each}

        </div>
      {/if}
    </div>



    <!-- ── GRÁFICO ── -->
    <div bind:this={container} style="width: 100%; flex: 1; min-height: 0;">
      <svg
        {width} {height}
        style="display:block;"
        role="presentation"
        on:click={clickBackground}
        on:keydown={(e) => e.key === 'Escape' && clickBackground()}
      >

        <!-- ── CLIPPATH PARA IMAGENS ── -->
        <defs>
          {#if viewMode !== 'cancion'}
            {#each nodes as d}
              <clipPath id="clip-{sanitizeId(d.id)}">
                {#if viewMode === 'album'}
                  <rect
                    x={-nodeRadius(d)} y={-nodeRadius(d)}
                    width={nodeRadius(d)*2} height={nodeRadius(d)*2}
                    rx="5"
                  />
                {:else}
                  <circle cx="0" cy="0" r={nodeRadius(d)} />
                {/if}
              </clipPath>
            {/each}
          {/if}
        </defs>


        <!-- Fondos sutiles por cuadrante -->
<!--         {#if width}
          <rect x={x(0)}        y={margin.top} width={x(1)-x(0)}        height={y(0)-margin.top}            fill="#FE76A6" opacity="0.04" />
          <rect x={margin.left} y={margin.top} width={x(0)-margin.left} height={y(0)-margin.top}            fill="#74ACFF" opacity="0.04" />
          <rect x={x(0)}        y={y(0)}       width={x(1)-x(0)}        height={height-margin.bottom-y(0)} fill="#FE76A6" opacity="0.02" />
          <rect x={margin.left} y={y(0)}       width={x(0)-margin.left} height={height-margin.bottom-y(0)} fill="#74ACFF" opacity="0.02" />
        {/if} -->

        <!-- Grid tracejado -->
<!--         {#each ticks as t}
          <line
            x1={margin.left} x2={width - margin.right}
            y1={y(t)} y2={y(t)}
            stroke="#ddd7d2" stroke-width="1"
            stroke-dasharray={t === 0 ? "none" : "5 4"}
          />
          <line
            y1={margin.top} y2={height - margin.bottom}
            x1={x(t)} x2={x(t)}
            stroke="#ddd7d2" stroke-width="1"
            stroke-dasharray={t === 0 ? "none" : "5 4"}
          />
        {/each} -->

        <!-- Eixos principais -->
        <line x1={margin.left} x2={width-margin.right} y1={y(0)} y2={y(0)} stroke="#a89e96" stroke-width="1.5" />
        <line x1={x(0)} x2={x(0)} y1={margin.top} y2={height-margin.bottom} stroke="#a89e96" stroke-width="1.5" />

        <!-- Ticks eixo X -->
        {#each ticks as t}
          <text x={x(t)} y={y(0) + 20} text-anchor="middle" class="axis-label">
            {t === 0 ? "0" : t.toFixed(2)}
          </text>
        {/each}

        <!-- Ticks eixo Y -->
        {#each ticks.filter(t => t !== 0) as t}
          <text x={x(0) - 10} y={y(t) + 4} text-anchor="end" class="axis-label">
            {t.toFixed(2)}
          </text>
        {/each}

        <!-- Labels dos eixos -->
        <!-- Valencia-->
        <text
          x={x(-1)}
          y={y(0) - 6}
          text-anchor="start"
          class="axis-title"
        >Valencia →</text>

        <!-- Activación-->
        <text
          transform="rotate(-90)"
          x={-(y(-1))}
          y={x(0) + 14}
          text-anchor="start"
          class="axis-title"
        >Activación →</text>

        <!-- Labels dos quadrantes -->
        {#each qLabels as q}
          <text text-anchor="middle">
            <tspan x={q.x} y={q.y} class="quadrant-sub">{q.sub}</tspan>
            <tspan x={q.x} dy="20" class="quadrant-main">{q.main}</tspan>
          </text>
        {/each}


        <!-- ── NÓS COM FADE ── -->
        <g class="nodes-group" class:fading={isTransitioning}>

          {#if viewMode === 'cancion'}
            {#each nodes as d (d.id)}
              <circle
                cx={d.x} cy={d.y}
                r={pinnedId === d.id ? 8 : hoveredId === d.id ? 7 : 4}
                fill={emotionColors[d.dominant_emotion] ?? "#ccc"}
                opacity={
                  !hasActiveFilters
                    ? (pinnedId && pinnedId !== d.id ? 0.08 : 0.80)
                    : activeIds.has(d.id)
                      ? (pinnedId && pinnedId !== d.id ? 0.08 : 0.80)
                      : 0.05
                }
                stroke={pinnedId === d.id ? "#1a1a1a" : "rgba(248,242,223,0.7)"}
                stroke-width={pinnedId === d.id ? 2 : 0.5}
                style="cursor:{!hasActiveFilters || activeIds.has(d.id) ? 'pointer' : 'default'}; transition: opacity 0.25s ease;"
                role="button"
                tabindex={!hasActiveFilters || activeIds.has(d.id) ? 0 : -1}
                on:pointerenter={(e) => showTooltip(e, d)}
                on:pointermove={moveTooltip}
                on:pointerleave={hideTooltip}
                on:click={(e) => clickPoint(e, d)}
                on:keydown={(e) => e.key === 'Enter' && clickPoint(e, d)}
              />
            {/each}

          {:else if viewMode === 'album'}
            {#each nodes as d (d.id)}
              {@const isActive  = pinnedId === d.id}
              {@const inFilter  = !hasActiveFilters || activeIds.has(d.id)}
              {@const r = RADIUS.album}
              {@const scale = isActive ? 1.35 : 1}

              <g transform="translate({d.x},{d.y})" style="cursor:{inFilter ? 'pointer' : 'default'}">
                <g style="transform: scale({scale}); transition: transform 0.2s ease;">
                  {#if d.album_image_url}
                    <image
                      href={d.album_image_url}
                      x={-r} y={-r} width={r*2} height={r*2}
                      preserveAspectRatio="xMidYMid slice"
                      clip-path="url(#clip-{sanitizeId(d.id)})"
                      opacity={
                        !inFilter ? 0.08
                        : (pinnedId && !isActive) ? 0.2
                        : 1
                      }
                      style="transition: opacity 0.25s ease;"
                    />
                  {:else}
                    <rect x={-r} y={-r} width={r*2} height={r*2} rx="5"
                      fill={emotionColors[d.dominant_emotion] ?? "#ccc"}
                      opacity={!inFilter ? 0.05 : (pinnedId && !isActive) ? 0.2 : 0.85}
                    />
                  {/if}
                  <rect x={-r} y={-r} width={r*2} height={r*2} rx="5"
                    fill="none"
                    stroke={isActive ? "#1a1a1a" : "rgba(248,242,223,0.6)"}
                    stroke-width={isActive ? 2.5 : 1}
                    opacity={!inFilter ? 0.08 : 1}
                    style="transition: opacity 0.25s ease;"
                  />
                </g>

                <rect x={-r} y={-r} width={r*2} height={r*2} rx="5"
                  fill="transparent"
                  stroke="none"
                  tabindex={inFilter ? 0 : -1}
                  role="button"
                  on:pointerenter={(e) => inFilter && showTooltip(e, d)}
                  on:pointermove={moveTooltip}
                  on:pointerleave={hideTooltip}
                  on:click={(e) => inFilter && clickPoint(e, d)}
                  on:keydown={(e) => e.key === 'Enter' && inFilter && clickPoint(e, d)}
                />
              </g>
            {/each}


          {:else}
            {#each nodes as d (d.id)}
              {@const isActive  = pinnedId === d.id}
              {@const inFilter  = !hasActiveFilters || activeIds.has(d.id)}
              {@const r = RADIUS.artista}
              {@const scale = isActive ? 1.35 : 1}

              <g transform="translate({d.x},{d.y})" style="cursor:{inFilter ? 'pointer' : 'default'}">
                <g style="transform: scale({scale}); transition: transform 0.2s ease;">
                  {#if divaImages[d.artist]}
                    <image
                      href={divaImages[d.artist]}
                      x={-r} y={-r} width={r*2} height={r*2}
                      preserveAspectRatio="xMidYMid slice"
                      clip-path="url(#clip-{sanitizeId(d.id)})"
                      opacity={
                        !inFilter ? 0.08
                        : (pinnedId && !isActive) ? 0.15
                        : 1
                      }
                      style="transition: opacity 0.25s ease;"
                    />
                  {:else}
                    <circle r={r}
                      fill={emotionColors[d.dominant_emotion] ?? "#ccc"}
                      opacity={!inFilter ? 0.05 : (pinnedId && !isActive) ? 0.15 : 0.85}
                    />
                  {/if}
                  <circle r={r}
                    fill="none"
                    stroke={isActive ? "#1a1a1a" : "rgba(248,242,223,0.8)"}
                    stroke-width={isActive ? 2.5 : 1.5}
                    opacity={!inFilter ? 0.08 : 1}
                    style="transition: opacity 0.25s ease;"
                  />
                </g>

                <!-- área de clique invisível (não afetada pelo scale) -->
                <circle r={r}
                  fill="transparent"
                  stroke="none"
                  tabindex={inFilter ? 0 : -1}
                  role="button"
                  on:pointerenter={(e) => inFilter && showTooltip(e, d)}
                  on:pointermove={moveTooltip}
                  on:pointerleave={hideTooltip}
                  on:click={(e) => inFilter && clickPoint(e, d)}
                  on:keydown={(e) => e.key === 'Enter' && inFilter && clickPoint(e, d)}
                />
              </g>
            {/each}

          {/if}

        </g>

      </svg>
    </div>

  </div>
</div>

<!-- ── TOOLTIP ── -->
{#if tooltip}
  <div
    class="tooltip"
    class:pinned={tooltip.pinned}
    style={tooltipStyle}
  >
    <!-- Botão de fechar (só aparece quando fixado) -->
    {#if tooltip.pinned}
      <button class="tooltip-close" on:click={() => { pinnedId = null; tooltip = null; }}>✕</button>
    {/if}

    <!-- ── CABEÇALHO: foto da diva + título ── -->
    <div class="tooltip-header">
      {#if divaImages[tooltip.data.artist]}
        <img
          class="tooltip-artist-img"
          src={divaImages[tooltip.data.artist]}
          alt={tooltip.data.artist}
        />
      {/if}

      <div class="tooltip-meta">
        <div class="tooltip-title">{tooltip.data.track}</div>
        <div class="tooltip-artist">{tooltip.data.artist} · {tooltip.data.year}</div>
      </div>
    </div>

    <!-- ── ÁLBUM: capa + nome na mesma linha ── -->
    <div class="tooltip-album-row">
      {#if tooltip.data.album_image_url}
        <img
          class="tooltip-album-img"
          src={tooltip.data.album_image_url}
          alt={tooltip.data.album}
        />
      {/if}
      <span class="tooltip-album-name">{tooltip.data.album}</span>
    </div>

    <!-- ── EMOÇÃO DOMINANTE ── -->
    <div class="tooltip-section">
      <span class="section-label">Emoción dominante</span>
      <span 
        class="emotion-badge {tooltip.data.dominant_emotion}"
        style="background:{emotionColors[tooltip.data.dominant_emotion] ?? '#ccc'};"
      >
        {tooltip.data.dominant_emotion}
      </span>
    </div>

    <!-- ── VALENCIA + ACTIVACIÓN ── -->
    <div class="tooltip-section">
      <span class="section-label">Posición emocional</span>
      <div class="valence-activation-row">
        <div class="va-item">
          <span class="va-label">Valencia</span>
          <span class="va-value">{tooltip.data.valence?.toFixed(2)}</span>
        </div>
        <div class="va-divider"></div>
        <div class="va-item">
          <span class="va-label">Activación</span>
          <span class="va-value">{tooltip.data.activation?.toFixed(2)}</span>
        </div>
      </div>
    </div>

     <!-- ── EMOCIONES ── -->
    <div class="tooltip-section">
      <span class="section-label">Emociones</span>
      <ul>
        {#each emotions as e}
          <li>{e.label}: {tooltip.data[`emocion_${e.label.toLowerCase()}`]}</li>
        {/each}
      </ul>
    </div>

    <!-- ── TEMAS ── -->
    {#if tooltip.data.type !== 'artista'}
      <div class="tooltip-section">
        <span class="section-label">Temas</span>
        <div class="tags">
          {#if tooltip.data.themes}
            {#each tooltip.data.themes.split(",") as t}
              <span class="tag">{t.trim()}</span>
            {/each}
          {:else}
            <span class="tag">Sin temas</span>
          {/if}
        </div>
      </div>
    {/if}

  </div>
{/if}

<style>
/* ── WRAPPER STICKY ── */
.scatter-wrapper {
  position: relative;
  width: 100%;
  min-height: 250vh;
}

.sticky-chart {
  position: sticky;
  top: 0;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f8f2df;
  padding-top: 16px;
  box-sizing: border-box;
}

/* ── HEADER ── */
.chart-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 0 16px 8px;
  flex-shrink: 0;
}

.titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title-text {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: clamp(1.3rem, 2.5vw, 2rem);
  font-weight: 750;
  fill: #1a1a1a;
  letter-spacing: -1px;
  line-height: 1.1;
}

.subtitle-text {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: clamp(1rem, 2vw, 1.3rem);
  font-weight: 400;
  line-height: 1.4;
  color: #555;
}

/* ── BOTÃO FILTROS ── */
.filter-btn {
  position: relative;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #6b6259;
  background: rgba(190, 180, 170, 0.15);
  border: 1px solid rgba(190, 180, 170, 0.4);
  border-radius: 8px;
  padding: 6px 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, color 0.2s;
  flex-shrink: 0;
}

.filter-btn:hover,
.filter-btn.active {
  background: rgba(190, 180, 170, 0.3);
  color: #1a1a1a;
}

.filter-dot {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #db2d61;
}

/* ── PAINEL DE FILTROS ── */
.filters-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  align-items: flex-end;
  padding: 10px 16px 12px;
  background: rgba(190, 180, 170, 0.1);
  border-bottom: 1px solid rgba(190, 180, 170, 0.3);
  flex-shrink: 0;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-label {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #a89e96;
}

.filter-input,
.filter-select {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 13px;
  color: #1a1a1a;
  background: rgba(248, 242, 223, 0.9);
  border: 1px solid rgba(190, 180, 170, 0.5);
  border-radius: 7px;
  padding: 5px 10px;
  outline: none;
  transition: border-color 0.2s;
  height: 32px;
  box-sizing: border-box;
}

.filter-input:focus,
.filter-select:focus {
  border-color: #a89e96;
}

.filter-select {
  min-width: 160px;
  cursor: pointer;
}

/* Ano */
.year-range {
  display: flex;
  align-items: center;
  gap: 6px;
}

.year-input {
  width: 80px;
}

.year-sep {
  font-size: 13px;
  color: #a89e96;
}

/* Emoção pills */
.emotion-group {
  flex-basis: 100%;
}

.emotion-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.emotion-pill {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1.5px solid var(--c);
  color: var(--c);
  background: transparent;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.emotion-pill.selected {
  background: var(--c);
  color: #fff;
}

/* Limpar filtros */
.clear-btn {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #db2d61;
  background: transparent;
  border: 1.5px solid #db2d61;
  border-radius: 7px;
  padding: 5px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.15s, color 0.15s;
  height: 32px;
  align-self: flex-end;
}

.clear-btn:hover {
  background: #db2d61;
  color: #fff;
}

.active-count {
  font-weight: 400;
  opacity: 0.8;
  font-size: 11px;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 5px;
  max-width: 220px;
}

.selected-tag {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  background: rgba(107, 98, 89, 0.12);
  border: 1px solid rgba(190, 180, 170, 0.5);
  border-radius: 999px;
  color: #6b6259;
  cursor: pointer;
  transition: background 0.15s;
}

.selected-tag:hover {
  background: rgba(219, 45, 97, 0.1);
  border-color: #db2d61;
  color: #db2d61;
}

.selected-tag span {
  font-size: 10px;
  opacity: 0.7;
}

.active-filters-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  flex-basis: 100%;
  padding-top: 4px;
}

.artist-tag {
  border-color: rgba(219, 45, 97, 0.4);
  color: #db2d61;
  background: rgba(219, 45, 97, 0.06);
}

.artist-tag:hover {
  background: rgba(219, 45, 97, 0.15);
  border-color: #db2d61;
  color: #db2d61;
}

.album-tag {
  border-color: rgba(107, 98, 89, 0.4);
  color: #6b6259;
}


/* ── TIPOGRAFIA SVG ── */
:global(.axis-label) {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 12px;
  font-weight: 500;
  fill: #a89e96;
}

:global(.axis-title) {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 12px;
  font-weight: 600;
  fill: #6b6259;
}

:global(.quadrant-sub) {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 10px;
  font-weight: 500;
  fill: #65605C;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

:global(.quadrant-main) {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 18px;
  font-weight: 700;
  fill: #65605C;
  letter-spacing: -0.01em;
}

/* ── MODE SWITCHER ── */
.view-mode-switcher {
  display: flex;
  gap: 2px;
  background: rgba(190, 180, 170, 0.15);
  border: 1px solid rgba(190, 180, 170, 0.4);
  border-radius: 9px;
  padding: 3px;
  flex-shrink: 0;
}

.mode-btn {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #a89e96;
  background: transparent;
  border: none;
  border-radius: 6px;
  padding: 5px 12px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.mode-btn:hover {
  color: #1a1a1a;
  background: rgba(190, 180, 170, 0.2);
}

.mode-btn.active {
  background: rgba(248, 242, 223, 0.95);
  color: #1a1a1a;
  box-shadow: 0 1px 4px rgba(42, 31, 26, 0.1);
}

.mode-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── FADE DE TRANSIÇÃO ── */
.nodes-group {
  transition: opacity 0.28s ease;
}

.nodes-group.fading {
  opacity: 0;
}


/* ── TOOLTIP ── */
.tooltip-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.tooltip {
  position: fixed;
  max-width: 260px;
  background: rgba(248, 242, 223, 0.97);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(190, 180, 170, 0.4);
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 8px 30px rgba(42, 31, 26, 0.14);
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  z-index: 9999;
  pointer-events: none;
}

.tooltip-title {
  font-weight: 700;
  font-size: 14px;
  color: #1a1a1a;
  margin-bottom: 2px;
}

.tooltip-artist,
.tooltip-album {
  color: #a89e96;
  font-size: 12px;
  margin-bottom: 4px;
}

.tooltip-section {
  margin-top: 10px;
}

.section-label {
  display: block;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #a89e96;
  margin-bottom: 4px;
}

.tooltip-section ul {
  padding-left: 14px;
  margin: 4px 0 0;
  color: #555;
  font-size: 12px;
}

.tooltip.pinned {
  border-color: rgba(190, 180, 170, 0.8);
  box-shadow: 0 12px 40px rgba(42, 31, 26, 0.22);
}

.tooltip-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(190, 180, 170, 0.25);
  color: #6b6259;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: background 0.15s;
}

.tooltip-images {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  margin-bottom: 10px;
}

.tooltip-album-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-top: 1px solid rgba(190, 180, 170, 0.25);
  border-bottom: 1px solid rgba(190, 180, 170, 0.25);
  margin-bottom: 4px;
}

.tooltip-album-img {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(42, 31, 26, 0.15);
}

.tooltip-album-name {
  font-size: 12px;
  color: #6b6259;
  line-height: 1.3;
  min-width: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
}

.tooltip-artist-img {
  width: 44px;
  height: 44px;
  object-fit: cover;
  object-position: top;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid rgba(190, 180, 170, 0.3);
  box-shadow: 0 2px 8px rgba(42, 31, 26, 0.12);
}

.tooltip-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.tooltip-close:hover {
  background: rgba(190, 180, 170, 0.5);
}

.valence-activation-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.va-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.va-label {
  font-size: 10px;
  color: #a89e96;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.va-value {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: -0.02em;
}

.va-divider {
  width: 1px;
  height: 28px;
  background: rgba(190, 180, 170, 0.4);
}

/* ── TAGS ── */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.tag {
  background: rgba(190, 180, 170, 0.18);
  border: 1px solid rgba(190, 180, 170, 0.4);
  border-radius: 6px;
  padding: 2px 7px;
  font-size: 11px;
  color: #6b6259;
}

/* ── BADGES DE EMOÇÃO ── */
.emotion-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 4px;
  letter-spacing: 0.02em;
}
</style>
