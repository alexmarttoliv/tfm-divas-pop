<script>
  import { scaleLinear, scaleBand, area, curveCatmullRom } from "d3";
  import { onMount, tick } from "svelte";
  import scrollama from "scrollama";
  import { draw, fade } from "svelte/transition";
  import { linear } from "svelte/easing";
  import { emotions } from '$lib/config.js';

  export let data = [];

  let container;
  let width = 1000;
  const height = 600;

  let scroller;
  let activeIndex = -1;

  const margin = { top: 40, right: 85, bottom: 60, left: 60 };

  const decadeArtists = {
    1960: [{ name: "Cher", image: "/artists/cher.png" }],
    1970: [{ name: "Cher", image: "/artists/cher.png" }],
    1980: [
      { name: "Madonna", image: "/artists/madonna.png" },
      { name: "Whitney Houston", image: "/artists/whitney.png" },
      { name: "Cyndi Lauper", image: "/artists/cyndi.png" },
      { name: "Kylie Minogue", image: "/artists/kylie.png" }
    ],
    1990: [
      { name: "Mariah Carey", image: "/artists/mariah.png" },
      { name: "Shakira", image: "/artists/shakira.png" },
      { name: "Britney Spears", image: "/artists/britney.png" },
      { name: "Christina Aguilera", image: "/artists/christina.png" }
    ],
    2000: [
      { name: "Jennifer Lopez", image: "/artists/jennifer.png" },
      { name: "Beyoncé", image: "/artists/beyonce.png" },
      { name: "Rihanna", image: "/artists/rihanna.png" },
      { name: "Demi Lovato", image: "/artists/demi.png" },
      { name: "Fergie", image: "/artists/fergie.png" },
      { name: "Katy Perry", image: "/artists/katy.png" },
      { name: "Miley Cyrus", image: "/artists/miley.png" }
    ],
    2010: [
      { name: "Lady Gaga", image: "/artists/gaga.png" },
      { name: "Adele", image: "/artists/adele.png" },
      { name: "Taylor Swift", image: "/artists/taylor.png" },
      { name: "Lana Del Rey", image: "/artists/lana.png" },
      { name: "Ariana Grande", image: "/artists/ariana.png" },
      { name: "Camila Cabello", image: "/artists/camila.png" },
      { name: "Charli XCX", image: "/artists/charli.png" },
      { name: "Dua Lipa", image: "/artists/dua.png" },
      { name: "Rosalía", image: "/artists/rosalia.png" },
      { name: "Selena Gomez", image: "/artists/selena.png" }
    ],
    2020: [
      { name: "Sabrina Carpenter", image: "/artists/sabrina.png" },
      { name: "Billie Eilish", image: "/artists/billie.png" },
      { name: "Olivia Rodrigo", image: "/artists/olivia.png" },
      { name: "Chappell Roan", image: "/artists/chappell.png" },
      { name: "Tate McRae", image: "/artists/tate.png" }
    ]
  };

  const decadeTexts = {
    1960: "En los 60, Cher abre el camino de las divas pop con baladas donde la tristeza pesa más que cualquier otro sentimiento, inaugurando una era de desamor sofisticado que marcaría la siguiente década.",
    1970: "En los 70, Cher sigue en el centro de la escena y la melancolía alcanza su punto máximo: sus canciones convierten la ruptura y el arrepentimiento en un estribillo generacional, con muy pocos destellos de auténtica alegría.",
    1980: "En los 80, Whitney Houston, Madonna, Kylie Minogue y Cyndi Lauper irrumpen para romper el monopolio de la tristeza: sus himnos llenan las pistas de baile y empujan el pop femenino hacia un registro mucho más luminoso y esperanzador.",
    1990: "En los 90, la apuesta se consolida: Britney Spears, Mariah Carey y Christina Aguilera llevan la mezcla de euforia y drama a las listas de éxitos, pero con un saldo emocional donde la alegría sigue ganando a las lágrimas.",
    2000: "En los 2000, las divas veteranas se consolidan y llegan nuevas voces; el resultado es el pico de canciones que transmiten alegría, impulsado por discos festivos como \"X\" de Kylie Minogue y los álbumes navideños de Christina Aguilera y Whitney Houston.",
    2010: "En los 2010, el paisaje emocional se complica: crecen la ira, el miedo y vuelve con fuerza la tristeza, en álbumes conceptuales como \"Born This Way\", \"Anti\", \"Lemonade\" y \"21\", donde las letras hablan de identidad, injusticia y heridas abiertas.",
    2020: "En los 2020, las letras son más diversas que nunca: la tristeza reaparece con intensidad y emociones como asco e ira ganan espacio, empujadas por una nueva generación de divas como Olivia Rodrigo y Billie Eilish que llevan la vulnerabilidad al centro del pop."
  };

  const updateScroller = async () => {
    if (!data || data.length === 0) return;
    await tick();

    if (!scroller) {
      scroller = scrollama();
      scroller.setup({ step: ".step", offset: 0.3 })
        .onStepEnter(({ index }) => {
          activeIndex = index;
        });
    } else {
      scroller.resize();
    }
  };

  $: if (data) {
    updateScroller();
  }

  onMount(() => {
    width = container?.clientWidth || 1000;
    
    const updateWidth = () => {
      if (container) {
        width = container.clientWidth;
      }
    };
    
    window.addEventListener("resize", updateWidth);
    
    return () => {
      window.removeEventListener("resize", updateWidth);
      scroller?.destroy();
    };
  });

  $: visibleData = activeIndex < 0 ? [] : data.slice(0, Math.min(activeIndex + 1, data.length));

  $: blocks = visibleData.map(d => ({
    decade: d.decade,
    emotions: emotions.map(e => ({ ...e, value: d[e.key] }))
  }));

  $: morphProgress = Math.max(0, Math.min(1, (activeIndex - data.length + 1) / 2));

  $: indexedData = data.length > 0 ? data.map((d, i) => ({ ...d, index: i })) : [];

  function interpolateData(dataArray, steps = 3) {
    const out = [];
    for (let i = 0; i < dataArray.length - 1; i++) {
      const a = dataArray[i];
      const b = dataArray[i + 1];
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const point = { index: a.index + t };
        emotions.forEach(e => {
          point[e.key] = a[e.key] * (1 - t) + b[e.key] * t;
        });
        out.push(point);
      }
    }
    out.push(dataArray[dataArray.length - 1]);
    return out;
  }

  $: smoothData = indexedData.length > 1 ? interpolateData(indexedData, 3) : [];

  $: ribbonSeries = emotions.map(e => ({
    key: e.key,
    color: e.color,
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
        serie.points[i] = { index: d.index, y0, y1: y0 + r.value };
        y0 += r.value;
      });
    });
  }

  $: xBand = scaleBand()
    .domain(data.map(d => d.decade))
    .range([margin.left, width - margin.right])
    .paddingInner(0.25);

  $: yLine = scaleLinear()
    .domain([0, 0.7])
    .range([height - margin.bottom, margin.top]);

  $: decadeCenter = (decade) => {
    const val = xBand(decade);
    return val !== undefined ? val + xBand.bandwidth() / 2 : 0;
  };

  $: xRibbon = scaleLinear()
    .domain([0, indexedData.length - 1])
    .range([margin.left, width - margin.right]);

  $: maxStackedValue = Math.max(
    1.2,
    ...smoothData.map(d => emotions.reduce((sum, e) => sum + (d[e.key] ?? 0), 0))
  );

  $: yRibbon = scaleLinear()
    .domain([0, maxStackedValue])
    .range([height - margin.bottom, margin.top]);

  $: y = (value, isRibbon = false) => {
    const yLineVal = yLine(value);
    const yRibbonVal = isRibbon ? yRibbon(value) : yLine(value);
    return yLineVal * (1 - morphProgress) + yRibbonVal * morphProgress;
  };

  $: areaGenerator = area()
    .x(d => xRibbon(d.index))
    .y0(d => y(d.y0, true))
    .y1(d => y(d.y1, true))
    .curve(curveCatmullRom.alpha(1));

  $: isRibbonMode = morphProgress > 0.5;
</script>

<section class="scrolly">
  <div class="graphic" class:full={isRibbonMode}>
    <div bind:this={container} class="chart-container">
      <svg {width} {height}>
        
        {#if morphProgress < 1}
          <line x1={margin.left - 10} x2={margin.left - 10} y1={margin.top} y2={height - margin.bottom} stroke="#999" />
          {#each [0, 0.2, 0.4, 0.6] as v}
            <g transform={`translate(${margin.left}, ${y(v)})`}>
              <line x2={width - margin.right} stroke="#eee" />
              <text x="-15" y="4" text-anchor="end" font-size="11" fill="#666">{v.toFixed(1)}</text>
            </g>
          {/each}
        {/if}

        {#if morphProgress > 0}
          {#each ribbonSeries as serie (serie.key)}
            <path d={areaGenerator(serie.points)} fill={serie.color} opacity={morphProgress * 0.9} />
          {/each}
        {/if}

        {#if morphProgress < 1}
          {#each emotions as emotion}
            {#each data.slice(0, data.length - 1) as d, i}
              {@const next = data[i + 1]}
              {#if i < activeIndex}
                <line
                  in:draw={{ duration: 1200, easing: linear }}
                  out:fade={{ duration: 300 }}
                  x1={decadeCenter(d.decade) + xBand.bandwidth() / 2}
                  y1={y(d[emotion.key])}
                  x2={decadeCenter(next.decade) - xBand.bandwidth() / 2}
                  y2={y(next[emotion.key])}
                  stroke={emotion.color}
                  stroke-width="10"
                  stroke-opacity={(1 - morphProgress) * 0.25}
                  stroke-linecap="round"
                />
              {/if}
            {/each}

            {#if activeIndex >= 0 && activeIndex < data.length}
              {@const currentDecade = data[activeIndex]}
              <text
                in:fade={{ duration: 1300 }}
                out:fade={{ duration: 250 }}
                x={decadeCenter(currentDecade.decade) + xBand.bandwidth() / 2 + 15}
                y={y(currentDecade[emotion.key]) + 4}
                font-size="16"
                font-weight="600"
                fill={emotion.color}
                text-anchor="start"
                opacity={1 - morphProgress}
              >
                {emotion.label}
              </text>
            {/if}
          {/each}
        {/if}

        {#if morphProgress < 1}
          {#each blocks as block (block.decade)}
            <g transform={`translate(${xBand(block.decade)},0)`} opacity={1 - morphProgress}>
              {#each block.emotions as e}
                <line
                  class="segment-line-animate"
                  x1="0"
                  x2={xBand.bandwidth()}
                  y1={y(e.value)}
                  y2={y(e.value)}
                  stroke={e.color}
                  stroke-width="15"
                  stroke-linecap="round"
                  stroke-dasharray={xBand.bandwidth()}
                  stroke-dashoffset={xBand.bandwidth()}
                />
              {/each}
              <text x={xBand.bandwidth() / 2} y={height - margin.bottom + 24} text-anchor="middle" font-size="16" fill="#333">
                {block.decade}s
              </text>
            </g>
          {/each}
        {/if}

        {#if morphProgress > 0.3}
          {#each indexedData as d}
            <text x={xRibbon(d.index)} y={height - margin.bottom + 28} text-anchor="middle" font-size="16" fill="#333" opacity={morphProgress}>
              {d.decade}s
            </text>
          {/each}
        {/if}

      </svg>
    </div>
  </div>

  <div class="steps" style="visibility: {isRibbonMode ? 'hidden' : 'visible'};">
    {#each data as d, i}
      <div class="step">
        <h3>{d.decade}s</h3>
        <div class="step-body">
          <p>{decadeTexts[d.decade]}</p>
          {#if i <= activeIndex && decadeArtists[d.decade]}
            <div class="artist-strip">
              <div class="artist-row">
                {#each decadeArtists[d.decade] as artist}
                  <img src={artist.image} alt={artist.name} title={artist.name} />
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/each}
    <div class="step step-morph"></div>
    <div class="step step-morph"></div>
  </div>
</section>

<style>
  .scrolly {
    display: grid;
    grid-template-columns: 1fr 420px;
    gap: 40px;
  }

  .graphic {
    position: sticky;
    top: 80px;
    align-self: start;
  }

  .graphic.full {
    grid-column: 1 / -1;
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;
  }

  .chart-container {
    width: 100%;
  }

  .steps {
    padding-bottom: 200px;
  }

  .step {
    min-height: 70vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
    font-size: 18px;
  }

  .step-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 16px 16px 0;
  }

  .artist-strip {
    margin-top: 10px;
  }

  .artist-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .artist-row img {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid #ddd;
  }

  .segment-line-animate {
    animation: drawSegment 0.8s linear forwards;
  }

  @keyframes drawSegment {
    to { stroke-dashoffset: 0; }
  }
</style>
