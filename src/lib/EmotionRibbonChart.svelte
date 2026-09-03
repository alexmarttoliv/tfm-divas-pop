<script>
  import { scaleLinear, area, curveCatmullRom } from "d3";
  import { mount, onMount, tick } from "svelte";
  import scrollama from "scrollama";
  import { emotions, decadeArtists } from '$lib/config.js';
  import { base } from '$app/paths';

  export let data = [];

  let container;
  let width = 800;

  let scroller;
  let activeIndex = -1;
  let photosVisible = false;

  // As margens eram fixas em 100px de cada lado. Num celular de ~390px isso deixava
  // apenas ~190px de área útil — daí o gráfico aparecer espremido. Agora elas
  // encolhem junto com o contêiner, preservando a proporção da área de plotagem.
  $: isNarrow = width < 700;
  $: sideMargin = Math.max(16, Math.min(100, width * 0.08));
  $: margin = {
    top: isNarrow ? 40 : 80,
    right: sideMargin,
    bottom: isNarrow ? 44 : 60,
    left: sideMargin
  };

  // Altura também acompanha a largura, senão em tela estreita o gráfico fica
  // alto e fino demais para as faixas serem legíveis.
  $: height = isNarrow ? Math.max(270, width * 0.78) : 450;

  // Textos para cada área destacada
  const scrollSteps = [
    {
      // step 0 = introdução
      intro: true,
      title: "Despliega las emociones",
      text: "Sigue desplazándote para descubrir cómo evolucionan las emociones en las letras de las divas del pop a lo largo de seis décadas."
    },
    {
      emotionKey: 'sadness',
      title: "La era de la melancolía",
      text: "En la décadas de 1970, la tristeza ocupa el centro del relato emocional. Es la emoción dominante y define el tono de una etapa marcada por el desamor, la vulnerabilidad y la introspección."
    },
    {
      emotionKey: 'joy',
      title: "El avance de la euforia",
      text: "Con la llegada de los años 80, la alegría gana terreno y termina imponiéndose. El pop femenino adopta una energía más luminosa y expansiva, desplazando progresivamente el protagonismo de la melancolía."
    },
    {
      emotionKey: 'fear',
      title: "Sombras intermitentes",
      text: "El miedo no lidera, pero fluctúa. Tiene momentos de mayor intensidad, especialmente en los 90, y luego retrocede, reflejando tensiones culturales que aparecen y se disuelven con el tiempo."
    },
    {
      emotionKey: 'anger',
      title: "Voces que se endurecen",
      text: "La ira crece de forma sostenida desde los años 90. Más que un estallido puntual, es una afirmación progresiva: letras más confrontativas, discursos de autonomía y una expresión emocional menos contenida."
    },
    {
      emotionKey: 'surprise',
      title: "El factor inesperado",
      text: "La sorpresa se mantiene estable a lo largo de las décadas. No domina el panorama, pero introduce quiebres narrativos y giros emocionales que dinamizan las canciones."
    },
    {
      emotionKey: 'disgust',
      title: "Lo incómodo emerge",
      text: "Durante mucho tiempo marginal, el asco gana visibilidad en los años recientes. Su aumento sugiere una mayor disposición a exponer conflictos, rechazos y experiencias menos idealizadas dentro del pop."
    },
    {
      // step 4 = fim
      outro: true,
      title: "",
      text: "¡Sigue explorando!"
    }
  ];

  // Qual emoção está destacada agora (-1 = todas coloridas)
  $: highlightedKey = activeIndex >= 0 ? scrollSteps[activeIndex].emotionKey : null;

  // Cor do ribbon: normal se destacado ou sem step ativo, cinza se não destacado
  function getRibbonFill(serieKey) {
    if (!highlightedKey) return null; // usa a cor original
    return serieKey === highlightedKey ? null : '#c8c8c8';
  };

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
          offset: 0.7,
          debug: false
        })
        .onStepEnter(({ index }) => {
          activeIndex = index;
        })
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

    // O streamgraph usa offset "wiggle", então a faixa do topo pode subir acima
    // da área desenhável — o rótulo saía do SVG e simplesmente não aparecia
    // (era o caso de "Tristeza" no mobile, onde a margem superior é menor).
    const labelSize = isNarrow ? 10 : 13;
    const minY = margin.top + labelSize;
    const maxY = height - margin.bottom - labelSize / 2;

    return {
      x: x(firstPoint.index) + 12,
      y: Math.min(Math.max(centerY, minY), maxY)
    };
  };

  /* ======================
     POSIÇÃO DAS FOTOS DAS ARTISTAS
  ====================== */
  // Espaço horizontal entre duas décadas — é o limite real que um cluster de fotos
  // pode ocupar sem invadir o cluster vizinho.
  $: decadeSpacing = indexedData.length > 1
    ? (width - margin.left - margin.right) / (indexedData.length - 1)
    : width;

  $: photoGap = isNarrow ? 3 : 10;
  $: photosPerRow = isNarrow ? 2 : 3;

  // As fotos voltam também no mobile. O tamanho é derivado do espaçamento entre
  // décadas (ver photoSize), então os clusters não se sobrepõem; a borda é mais
  // fina em tela estreita para os círculos não parecerem fundidos.
  $: showPhotos = true;

  $: photoSize = isNarrow
    ? Math.max(20, Math.min(34, (decadeSpacing * 0.82 - photoGap * (photosPerRow - 1)) / photosPerRow))
    : 55;

  function getArtistPhotoXPosition(decadeIndex, artistIndex, totalArtists) {
    const xBase = x(decadeIndex);
    const maxPerRow = photosPerRow;
    const row = Math.floor(artistIndex / maxPerRow);
    const col = artistIndex % maxPerRow;

    const clusterWidth = Math.min(totalArtists, maxPerRow) * (photoSize + photoGap) - photoGap;
    let startX = xBase - clusterWidth / 2;

    // Trava nas duas bordas. O piso é 0 (e não photoSize/4) porque qualquer
    // empurrão para a direita aqui se propaga como sobreposição no cluster seguinte.
    const maxStartX = width - clusterWidth - photoSize / 4;
    if (startX > maxStartX) startX = maxStartX;
    if (startX < 0) startX = 0;

    return {
      x: startX + col * (photoSize + photoGap),
      y: 10 + row * (photoSize + photoGap + 5),
      size: photoSize
    };
  };

  // A área de fotos precisa comportar a década com mais artistas (2000s, com 8).
  $: maxArtistRows = Math.max(
    1,
    ...Object.values(decadeArtists).map(a => Math.ceil(a.length / photosPerRow))
  );
  $: photosAreaHeight = !showPhotos
    ? 0
    : isNarrow
      ? 10 + maxArtistRows * (photoSize + photoGap + 5)
      : 250;


  // Calcular delay global para cada foto
  function getGlobalPhotoDelay(decadeIdx, artistIdx) {
    return (decadeIdx * 10 + artistIdx) * 80;
  };


  $: totalWidth = width;
  $: totalHeight = height;

</script>


<section class="ribbon-scrolly">
  
  <!-- GRÁFICO (STICKY) -->
  <div class="graphic-wrapper">
    <div bind:this={container} class="chart-container">
      
      <!-- ÁREA DE FOTOS -->
      {#if showPhotos}
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
                    width: {pos.size}px;
                    height: {pos.size}px;
                    transition-delay: {delay}ms;
                  "
                >
                  <img src={`${base}/artists/${artist.image}`} alt={artist.name} />
                </div>
              {/each}
            {/if}
          {/each}
        </div>
      </div>
      {/if}

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
            {@const overrideFill = getRibbonFill(serie.key)}
            <path
              d={areaGenerator(serie.points)}
              fill={overrideFill ?? serie.color}
              opacity={highlightedKey && serie.key !== highlightedKey ? 0.4 : 0.9}
              style="transition: fill 0.6s ease, opacity 0.6s ease;"
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
                font-size={isNarrow ? 10 : 13}
                font-weight="900"
                fill="white"
                stroke="#00000066"
                stroke-width={isNarrow ? 3 : 4}
                paint-order="stroke"
                letter-spacing="1"
                opacity={highlightedKey && serie.key !== highlightedKey ? 0.3 : 1}
                style="transition: opacity 0.6s ease;"
              >{serie.label}</text>
            {/if}
          {/each}

          <!-- Labels das décadas -->
          {#each indexedData as d}
            <text
              x={x(d.index)}
              y={height - margin.bottom + (isNarrow ? 22 : 28)}
              text-anchor="middle"
              font-size={isNarrow ? 11 : 16}
              font-weight="500"
              fill="#333"
            >
              <!-- Em tela estreita "1970s" vira "'70" para os rótulos não colidirem -->
              {isNarrow ? `'${String(d.decade).slice(2)}` : `${d.decade}s`}
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

        <!-- FAIXA DE ANOTAÇÃO — fora do SVG -->
        <div class="annotation-strip" class:outro={activeIndex === 7}>

          {#if activeIndex === 0}
            <!-- INTRO -->
            <div class="intro-text">
              <div class="scroll-hint">↓</div>
            </div>

          {:else if activeIndex === 7}
            <!-- FIM -->
            <div class="outro-text">
              <div class="scroll-hint">↓</div>
            </div>

          {:else if activeIndex >= 1 && activeIndex <= 6}
            <!-- ANOTAÇÕES -->
            <span
              class="annotation-dot"
              style="background-color: {emotions.find(e => e.key === scrollSteps[activeIndex].emotionKey)?.color}"
            ></span>
            <div class="annotation-text">
              <strong>{scrollSteps[activeIndex].title}</strong>
              <span>{scrollSteps[activeIndex].text}</span>
            </div>
            
          {/if}
        </div>

        {/if}
      </div>
    </div>

    <!-- Steps do scroll (invisíveis, só controlam o scrollama) -->
    <div class="steps-overlay">
      <div style="height: 40vh;"></div>
      {#each scrollSteps as step, i}
        <div class="ribbon-step" data-step={i} style="height: 30vh;"></div>
      {/each}
      <div style="height: 40vh;"></div>
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
    min-height: 350vh;
  }

  .chart-container {
    width: 100%;
    position: sticky;
    top: 0;
    padding: 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    z-index: 10;
    max-height: 100vh;
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
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
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

  .annotation-strip {
    width: 100%;
    min-height: 120px; /* mais altura para destaque */
    padding: 1.8rem 2.5rem;
    box-sizing: border-box;
    display: flex;
    align-items: flex-start;
    gap: 1.2rem;
    
    background: linear-gradient(135deg, rgba(248,242,223,0.98) 0%, rgba(255,255,255,0.95) 100%);
    border-top: 1px solid rgba(0,0,0,0.08);
    box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    
    opacity: 0.6;
    transform: translateY(12px);
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .annotation-strip:has(.intro-text),

  .annotation-strip:has(.annotation-text),

  .annotation-strip:has(.outro-text) {
    opacity: 1;
    transform: translateY(0);
  }

  .annotation-strip.outro {
    background: transparent;
    border-top: none;
    box-shadow: none;
  }

  .annotation-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }

  .annotation-text {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .annotation-text strong {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1a1a1a;
    display: block;
    margin-bottom: 0.3rem;
  }

  .annotation-text span {
    font-size: 1rem;
    line-height: 1.65;
    color: #444;
  }

  /* INTRO ESPECIAL */
  .intro-text {
    width: 100%;
    text-align: center;
  }

  .scroll-hint {
    font-size: 1.5rem;
    color: #666;
    animation: bounce 2s infinite;
  }

  .outro-text {
    width: 100%;
    text-align: center;
    font-size: 0.9rem;
    color: #777;
    animation: scroll-bounce 2s ease-in-out infinite;
  }

  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-12px); }
    60% { transform: translateY(-6px); }
  }

  @keyframes scroll-bounce {
    0%, 100% {
      transform: translateY(0);
      opacity: 0.6;
    }
    50% {
      transform: translateY(-6px);
      opacity: 1;
    }
  }


  /* Steps invisíveis que controlam o scrollama */
  .steps-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 5;
  }

  .ribbon-step {
    height: 70vh;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    .chart-container {
      top: 10px;
    }

    /* A altura da faixa e o tamanho das fotos agora são calculados a partir do
       espaçamento entre décadas (photoSize/photosAreaHeight no script), então os
       valores fixos que existiam aqui foram removidos — eles brigavam com o cálculo
       e faziam os clusters de décadas vizinhas se sobreporem. */
    .artist-photo img {
      box-shadow: 0 1px 5px rgba(0, 0, 0, 0.25);
    }

    .annotation-strip {
      padding: 1rem 1.1rem;
      min-height: 0;
      gap: 0.7rem;
    }

    /* O gráfico + faixa de fotos já consomem quase toda a tela; com a tipografia
       de desktop o texto da anotação ficava cortado embaixo. */
    .annotation-text strong {
      font-size: 1.02rem;
      margin-bottom: 0.15rem;
    }

    .annotation-text span {
      font-size: 0.87rem;
      line-height: 1.5;
    }
  }
</style>
