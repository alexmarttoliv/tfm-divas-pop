<script>
  import { scaleLinear, area, curveCatmullRom } from "d3";
  import { mount, onMount, tick } from "svelte";
  import scrollama from "scrollama";
  import { emotions, decadeArtists } from '$lib/config.js';

  export let data = [];

  let container;
  let width = 800;
  const height = 500;

  let scroller;
  let activeIndex = -1;
  let photosVisible = false;


  const margin = { top: 80, right: 100, bottom: 60, left: 100 };
  const photosAreaHeight = 300;

  // Textos para cada área destacada
  const scrollSteps = [
    {
      title: "El cruce de la alegría",
      text: "Entre los años 70 y 80, observamos un momento crucial: la tristeza supera a la alegría por primera vez, marcando un cambio en la narrativa emocional del pop femenino."
    },
    {
      title: "El ascenso del enojo",
      text: "En los años 90, la ira gana protagonismo, escalando posiciones en la jerarquía emocional. Las divas comienzan a expresar más rabia y empoderamiento en sus letras."
    },
    {
      title: "La volatilidad del miedo",
      text: "Los años 2000 muestran un pico de miedo en las letras, que luego desciende. Este movimiento refleja las ansiedades de la era post-9/11 y su posterior procesamiento."
    }
  ];

  /* ======================
     SCROLLAMA
  ====================== */
  const updateScroller = async () => {
    if (!data.length) return;
    await tick();

    if (!scroller) {
      scroller = scrollama();
      scroller
        .setup({ 
          step: ".ribbon-step", 
          offset: 0.5,
          debug: false
        })
        .onStepEnter(({ index }) => {
          activeIndex = index;
        });
    } else {
      scroller.resize();
    }
  };

  onMount(() => {
    width = container.clientWidth || 800;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            photosVisible = true;
          } else {
            photosVisible = false;
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(container);

    const onResize = () => {
      width = container.clientWidth;
      scroller?.resize();
    };
    
    window.addEventListener("resize", onResize);
    
    return () => {
      window.removeEventListener("resize", onResize);
      scroller?.destroy();
    };
  });

  $: if (data.length > 0) {
    updateScroller();
  }

  /* ======================
     DADOS INDEXADOS
  ====================== */
  $: indexedData =
    data.length > 0
      ? data.map((d, i) => ({ ...d, index: i }))
      : [];

  /* ======================
     INTERPOLAÇÃO ENTRE DÉCADAS
  ====================== */
  function interpolateData(data, steps = 15) {
    const out = [];

    for (let i = 0; i < data.length - 1; i++) {
      const a = data[i];
      const b = data[i + 1];

      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const point = { index: a.index + t };

        emotions.forEach(e => {
          point[e.key] = a[e.key] * (1 - t) + b[e.key] * t;
        });

        out.push(point);
      }
    }

    out.push(data[data.length - 1]);
    return out;
  }

  $: smoothData =
    indexedData.length > 1
      ? interpolateData(indexedData, 3)
      : [];

  /* ======================
     RIBBON REAL (MANUAL + SUAVIZADO)
  ====================== */
  $: ribbonSeries = emotions.map(e => ({
    key: e.key,
    color: e.color,
    label: e.label,
    points: []
  }));

  $: if (smoothData.length > 0) {
    smoothData.forEach((d, i) => {
      const ranked = emotions
        .map(e => ({ key: e.key, value: d[e.key] ?? 0 }))
        .sort((a, b) => a.value - b.value);

      let y0 = 0;

      ranked.forEach(r => {
        const serie = ribbonSeries.find(s => s.key === r.key);
        serie.points[i] = {
          index: d.index,
          y0,
          y1: y0 + r.value
        };
        y0 += r.value;
      });
    });
  }

  /* ======================
     ESCALAS
  ====================== */
  $: x = scaleLinear()
    .domain([0, Math.max(1, indexedData.length - 1)])
    .range([margin.left, width - margin.right]);

  $: y = scaleLinear()
    .domain([
      0,
      Math.max(
        1,
        ...ribbonSeries.flatMap(s => s.points.map(p => p.y1))
      )
    ])
    .range([height - margin.bottom, margin.top]);

  /* ======================
     AREA (CRUZAMENTOS SUAVES)
  ====================== */
  $: areaGenerator = area()
    .x(d => x(d.index))
    .y0(d => y(d.y0))
    .y1(d => y(d.y1))
    .curve(curveCatmullRom.alpha(1));

  /* ======================
     POSIÇÃO DO LABEL NO INÍCIO DO RIBBON
  ====================== */
  function getLabelPosition(serie) {
    if (!serie.points || serie.points.length === 0) return null;
    
    // Pegar o ponto inicial exato (index 0)
    const firstPoint = serie.points[0];
    if (!firstPoint) return null;

    // Só renderiza label se o ribbon for largo o suficiente (evita texto em faixas minúsculas)
    const ribbonHeight = Math.abs(y(firstPoint.y1) - y(firstPoint.y0));
    if (ribbonHeight < 14) return null;
    
    const centerY = (y(firstPoint.y0) + y(firstPoint.y1)) / 2;
    
    return {
      x: x(firstPoint.index) + 12,
      y: centerY 
    };
  }

  /* ======================
     POSIÇÃO DAS FOTOS DAS ARTISTAS
  ====================== */
  function getArtistPhotoXPosition(decadeIndex, artistIndex, totalArtists) {
    const xBase = x(decadeIndex);
    const photoSize = 55;
    const gap = 10;
    
    const maxPerRow = 3;
    const row = Math.floor(artistIndex / maxPerRow);
    const col = artistIndex % maxPerRow;
    
    const totalWidth = Math.min(totalArtists, maxPerRow) * (photoSize + gap) - gap;
    let startX = xBase - totalWidth / 2;

    const maxStartX = width - totalWidth - photoSize / 2;
    if (startX > maxStartX) startX = maxStartX;
    
    return {
      x: startX + col * (photoSize + gap),
      y: 10 + row * (photoSize + gap + 5)
    };
  }

  // Calcular delay global para cada foto
  function getGlobalPhotoDelay(decadeIdx, artistIdx) {
    return (decadeIdx * 10 + artistIdx) * 80;
  }

  $: totalWidth = width;
  $: totalHeight = height;
</script>


<section class="ribbon-scrolly">
  
  <!-- GRÁFICO (STICKY) -->
  <div class="graphic-wrapper">
    <div bind:this={container} class="chart-container">
      
      <!-- ÁREA DE FOTOS -->
      <div class="photos-section" style="height: {photosAreaHeight}px;">
        <div class="photos-inner" style="width: {totalWidth}px;">
          {#each indexedData as d, decadeIdx}
            {@const artists = decadeArtists[d.decade]}
            {#if artists && artists.length > 0}
              {#each artists as artist, artistIdx}
                {@const pos = getArtistPhotoXPosition(decadeIdx, artistIdx, artists.length)}
                {@const delay = getGlobalPhotoDelay(decadeIdx, artistIdx)}
                <div 
                  class="artist-photo"
                  class:visible={photosVisible}
                  style="
                    left: {pos.x}px; 
                    top: {pos.y}px;
                    transition-delay: {delay}ms;
                  "
                >
                  <img src={artist.image} alt={artist.name} />
                </div>
              {/each}
            {/if}
          {/each}
        </div>
      </div>

      <!-- SVG DO GRÁFICO -->
      <div class="chart-section">
        {#if indexedData.length > 0 && ribbonSeries[0].points.length > 0}
        <svg 
          width={totalWidth} 
          height={totalHeight} 
          viewBox="0 0 {totalWidth} {totalHeight}" 
          preserveAspectRatio="xMidYMid meet"
        >
          
          <!-- Ribbons -->
          {#each ribbonSeries as serie (serie.key)}
            <path
              d={areaGenerator(serie.points)}
              fill={serie.color}
              opacity="0.9"
            />
          {/each}

          <!-- Labels das emoções -->
          {#each ribbonSeries as serie (serie.key)}
            {@const pos = getLabelPosition(serie)}
            {#if pos}
              <text
                x={pos.x}
                y={pos.y}
                text-anchor="start"
                dominant-baseline="middle"
                font-size="13"
                font-weight="900"
                fill="white"
                stroke="#00000066"
                stroke-width="4"
                paint-order="stroke"
                letter-spacing="1"
              >{serie.label}</text>
            {/if}
          {/each}

          <!-- Labels das décadas -->
          {#each indexedData as d}
            <text
              x={x(d.index)}
              y={height - margin.bottom + 28}
              text-anchor="middle"
              font-size="16"
              font-weight="500"
              fill="#333"
            >
              {d.decade}s
            </text>
            
            <!-- gridline das décadas -->
            <line
              x1={x(d.index)}
              y1={margin.top - 200}
              x2={x(d.index)}
              y2={height - margin.bottom}
              stroke="#ccc"
              stroke-width="1"
              stroke-dasharray="4 4"
              opacity="0.8"
            />
          {/each}

        </svg>
        {/if}
      </div>
    </div>

    <!-- TEXTO OVERLAY - MÚLTIPLOS STEPS -->
    <div class="text-overlay">
      
      <!-- Espaço inicial -->
      <div style="height: 60vh;"></div>

      <!-- Step 1 -->
      <div class="ribbon-step" data-step="0">
        <div class="text-box" class:active={activeIndex === 0}>
          <h3>{scrollSteps[0].title}</h3>
          <p>{scrollSteps[0].text}</p>
        </div>
      </div>

      <!-- Step 2 -->
      <div class="ribbon-step" data-step="1">
        <div class="text-box" class:active={activeIndex === 1}>
          <h3>{scrollSteps[1].title}</h3>
          <p>{scrollSteps[1].text}</p>
        </div>
      </div>

      <!-- Step 3 -->
      <div class="ribbon-step" data-step="2">
        <div class="text-box" class:active={activeIndex === 2}>
          <h3>{scrollSteps[2].title}</h3>
          <p>{scrollSteps[2].text}</p>
        </div>
      </div>

      <!-- Espaço final -->
      <div style="height: 100vh;"></div>
    </div>
  </div>

</section>


<style>
  .ribbon-scrolly {
    width: 100%;
    margin: 0 auto;
    padding: 0;
  }

  .graphic-wrapper {
    position: relative;
    width: 100%;
    min-height: 400vh;
  }

  .chart-container {
    width: 100%;
    position: sticky;
    top: 20px;
    padding: 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    z-index: 10;
  }

  /* SEÇÃO DE FOTOS */
  .photos-section {
    position: relative;
    width: 100%;
    overflow: visible;
    margin-bottom: 1rem;
    z-index: 20;
  }

  .photos-inner {
    position: relative;
    height: 100%;
    margin: 0 auto;
  }

  .artist-photo {
    position: absolute;
    opacity: 0;
    transform: translateY(20px) scale(0.8);
    transition: opacity 0.8s ease, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 25;
  }

  .artist-photo.visible {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .artist-photo img {
    width: 55px;
    height: 55px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid #fff;
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.3);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    display: block;
  }

  .artist-photo:hover img {
    transform: scale(1.15);
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.4);
    z-index: 30;
  }

   /* SEÇÃO DO GRÁFICO - BLOCO DISPLAY BLOCK */
  .chart-section {
    position: relative;
    width: 100%;
    z-index: 15;
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
    max-width: 100%;
    overflow: visible;
  }

  .text-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 50;
  }

  .ribbon-step {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .text-box {
    background: rgba(248, 242, 223, 0.95);
    backdrop-filter: blur(10px);
    padding: 2rem 2.5rem;
    border-radius: 12px;
    max-width: 500px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    border: 2px solid rgba(51, 51, 51, 0.1);
    pointer-events: all;
    opacity: 0;
    transform: translateY(30px) scale(0.95);
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .text-box.active {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .text-box h3 {
    font-size: 1.8rem;
    margin-bottom: 1rem;
    color: #333;
    font-weight: 600;
  }

  .text-box p {
    font-size: 1.1rem;
    line-height: 1.6;
    color: #555;
    margin: 0;
  }

  @media (max-width: 768px) {
    .chart-container {
      top: 10px;
    }

    .photos-section {
      height: 160px !important;
    }

    .artist-photo img {
      width: 45px;
      height: 45px;
      border-width: 2px;
    }

    .text-box {
      padding: 1.5rem;
      max-width: 90%;
      margin: 0 1rem;
    }

    .text-box h3 {
      font-size: 1.5rem;
    }

    .text-box p {
      font-size: 1rem;
    }
  }
</style>
