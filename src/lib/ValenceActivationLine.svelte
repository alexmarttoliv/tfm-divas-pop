<!-- src/lib/ValenceActivationChart.svelte -->
<script>
  import { scaleLinear, line, curveMonotoneX } from "d3";
  import { onMount, tick } from "svelte";
  import scrollama from "scrollama";

  export let data = [];
  export let onComplete = () => {};

  let container;
  let width = 600;
  const height = 560;

  let scroller;
  let activeIndex = -1;
  let chartOpacity = 1;
  let isComplete = false;
  let linesVisible = false;
  let titleVisible = false;
  let titleEl;
  let direction = "down";

  $: isNarrow = width < 700;
  // Os rótulos das séries ("Valencia"/"Activación") são desenhados à direita do
  // último ponto, então a margem direita precisa comportá-los.
  $: margin = {
    top: 40,
    right: isNarrow ? 76 : 120,
    bottom: isNarrow ? 44 : 52,
    left: isNarrow ? 30 : 48
  };

  const seriesConfig = [
    { key: "valence",    label: "Valencia",   color: "#4b62d2", labelOffset: +22 },
    { key: "activation", label: "Activación", color: "#db2d61", labelOffset: -14 }
  ];

  /* ── TEXTOS DOS STEPS ── */
  const scrollSteps = [
    {
      title: "El pico de los 2000s",
      body: `Los años 2000 marcaron el punto más alto de toda la serie: la <strong style="color:#4b62d2">valencia</strong> llegó a <strong>+0.22</strong> y la <strong style="color:#db2d61">activación</strong> a <strong>+0.62</strong>. El pop femenino nunca fue tan positivo ni tan enérgico. Beyoncé, Lady Gaga y Katy Perry definieron esta era de euforia desbordante.`
    },
    {
      title: "La caída ininterrumpida",
      body: `Desde ese pico, la <strong style="color:#4b62d2">valencia</strong> no ha parado de caer. En los 2020s roza el cero, su nivel más bajo desde los años 70, mientras la <strong style="color:#db2d61">activación</strong> apenas retrocede. El pop sigue siendo enérgico, pero ya no promete alegría.`
    },
    {
      title: "El reverso de la tristeza",
      body: `Esta caída es el reflejo exacto del ascenso de la tristeza, el miedo y la ira en las letras. Artistas como Billie Eilish, Olivia Rodrigo y Lana Del Rey convirtieron la vulnerabilidad en el lenguaje central del pop contemporáneo.`
    },
    {
      title: "Energía con otra carga",
      body: `La <strong style="color:#db2d61">activación</strong> se mantiene alta, pero esa energía ahora canaliza angustia y melancolía en lugar de euforia.`
    }
  ];


  $: highlight2000 = activeIndex === 0;
  $: highlight2020 = activeIndex === 1;


  /* ── SCROLLAMA ── */
  const updateScroller = async () => {
    if (!data || data.length === 0) return;
    await tick();
    if (!scroller) {
      scroller = scrollama();
      scroller
        .setup({ step: ".valence-step", offset: 0.3 })
        .onStepEnter(({ index, direction: dir }) => {
          direction = dir;
          activeIndex = index;
          if (index === scrollSteps.length - 1 && dir === "down") {
            isComplete = false;
            chartOpacity = 1;
          }
        })
        .onStepExit(({ index, direction: dir }) => {
          if (index === scrollSteps.length - 1 && dir === "down") {
            isComplete = true;
            chartOpacity = 0;
            onComplete();
          }
          if (index === scrollSteps.length - 1 && dir === "up") {
            isComplete = false;
            chartOpacity = 1;
          }
        });
    } else {
      scroller.resize();
    }
  };

  $: if (data) updateScroller();

  onMount(() => {
    width = container.clientWidth;

    const onResize = () => {
      width = container.clientWidth;
      scroller?.resize();
    };
    window.addEventListener("resize", onResize);

    /* Título: fade-in ao entrar na viewport (dispara só uma vez) */
    const titleObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          titleVisible = true;
          titleObserver.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (titleEl) titleObserver.observe(titleEl);

    /* Linhas: animação draw ao entrar na viewport (dispara só uma vez) */
    const lineObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          linesVisible = true;
          lineObserver.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    if (container) lineObserver.observe(container);

    return () => {
      window.removeEventListener("resize", onResize);
      scroller?.destroy();
    };
  });

  /* ── ESCALAS ── */
  $: x = scaleLinear().domain([1970, 2020]).range([margin.left, width - margin.right]);
  $: y = scaleLinear().domain([-0.4, 0.8]).range([height - margin.bottom, margin.top]);

  /* ── INTERPOLAÇÃO ── */
  function interpolateYears(raw) {
    const out = [];
    for (let i = 0; i < raw.length - 1; i++) {
      const a = raw[i], b = raw[i + 1];
      for (let yr = a.decade; yr < b.decade; yr++) {
        const t = (yr - a.decade) / (b.decade - a.decade);
        out.push({
          year: yr,
          valence:    a.valence    + t * (b.valence    - a.valence),
          activation: a.activation + t * (b.activation - a.activation)
        });
      }
    }
    const last = raw[raw.length - 1];
    out.push({ year: last.decade, valence: last.valence, activation: last.activation });
    return out;
  }

  $: interpolated = data.length ? interpolateYears(data) : [];

  /* ── PATHS ── */
  $: series = seriesConfig.map(s => {
    const gen = line()
      .x(d => x(d.year))
      .y(d => y(d[s.key]))
      .curve(curveMonotoneX);
    return { ...s, path: interpolated.length ? gen(interpolated) : "" };
  });
</script>


<section class="scrolly">

  <!-- ── GRÁFICO STICKY (esquerda) ── -->
  <div class="graphic" style="opacity: {chartOpacity}; transition: opacity 0.6s ease;">
    <div bind:this={container} style="width: 100%;">

      <h2 class="title" bind:this={titleEl} class:visible={titleVisible}>
        El pulso emocional del pop femenino
      </h2>
      <p class="subtitle" class:visible={titleVisible}>
        Valencia y activación como brújula del pop femenino desde los 70 hasta hoy
      </p>

      <svg {width} {height} style="max-width: 100%; display: block;">

        <!-- Gridlines verticais nas décadas -->
        {#each data as d}
          <line
            x1={x(d.decade)} x2={x(d.decade)}
            y1={margin.top - 4}  y2={height - margin.bottom}
            stroke="#ddd7d2" stroke-width="1" stroke-dasharray="5 4"
          />
        {/each}

        <!-- Linha zero -->
        <line
          x1={margin.left} x2={width - margin.right}
          y1={y(0)}        y2={y(0)}
          stroke="#999" stroke-width="1"
        />
        <text
          x={margin.left - 8} y={y(0) + 4}
          text-anchor="end" font-size="13" fill="#999"
        >0</text>

        <!-- Eixo X -->
        {#each data as d}
          <text
            x={x(d.decade)} y={height - margin.bottom + (isNarrow ? 20 : 22)}
            text-anchor="middle" font-size={isNarrow ? 11 : 16} font-weight="500" fill="#333"
          >{isNarrow ? `'${String(d.decade).slice(2)}` : `${d.decade}s`}</text>
        {/each}

        <!-- ── LINHAS: animação draw ao entrar na viewport ── -->
        {#each series as s, i}
          <path
            pathLength="1"
            d={s.path}
            fill="none"
            stroke={s.color}
            stroke-width="5"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.9"
            style="
              stroke-dasharray: 1;
              stroke-dashoffset: {linesVisible ? 0 : 1};
              transition: stroke-dashoffset 1.8s cubic-bezier(0.4, 0, 0.2, 1) {i * 0.25}s;
            "
          />
        {/each}


        <!-- Dots: aparecem após as linhas terminarem -->
        {#each seriesConfig as s, si}
          {#each data as d}
            {@const cx  = x(d.decade)}
            {@const cy  = y(d[s.key])}
            {@const val = d[s.key] >= 0 ? "+" + d[s.key].toFixed(2) : d[s.key].toFixed(2)}
            {@const isPeak = (d.decade === 2000 && highlight2000) || (d.decade === 2020 && highlight2020)}

            <!-- Anel pulsante — só aparece no pico dos 2000s -->
            {#if isPeak}
              <circle
                class="pulse-ring"
                cx={cx} cy={cy} r="9"
                fill="none"
                stroke={s.color}
                stroke-width="2.5"
              />
            {/if}

            <!-- Dot principal -->
            <circle
              {cx} {cy}
              r={isPeak ? 9 : 6}
              fill={s.color} stroke="white" stroke-width="2.5"
              opacity={linesVisible ? 1 : 0}
              style="
                transition:
                  opacity 0.4s ease {1.8 + si * 0.25 + 0.3}s,
                  r 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
              "
            />

            <!-- Label do valor -->
            <text
              x={cx} y={cy + s.labelOffset}
              text-anchor="middle"
              font-size="12" font-weight="600" fill={s.color}
              opacity={linesVisible ? 1 : 0}
              style="transition: opacity 0.4s ease {1.8 + si * 0.25 + 0.5}s;"
            >{val}</text>
          {/each}
        {/each}

        <!-- Labels finais das séries -->
        {#each seriesConfig as s, si}
          {#if data.length}
            {@const last = data[data.length - 1]}
            <text
              x={x(last.decade) + (isNarrow ? 8 : 14)} y={y(last[s.key]) + 5}
              font-size={isNarrow ? 11 : 13} font-weight="700" fill={s.color}
              opacity={linesVisible ? 1 : 0}
              style="transition: opacity 0.4s ease {2.1 + si * 0.25}s;"
            >{s.label}</text>
          {/if}
        {/each}

      </svg>
    </div>
  </div>


  <!-- ── TEXTO (direita, scrollável) ── -->
  <div class="steps">
    {#each scrollSteps as step, i}
      <div class="valence-step step">
        {#if i <= activeIndex}
          {#key activeIndex}
            <div class="step-content" class:fade-in={direction === "down"}>
              <h3>{step.title}</h3>
              <div class="step-body">
                <p>{@html step.body}</p>
              </div>
            </div>
          {/key}
        {/if}
      </div>
    {/each}
  </div>

</section>


<style>
  /* ── LAYOUT IDÊNTICO AO EmotionLineChart ── */
  .scrolly {
    min-width: 0;
    display: grid;
    grid-template-columns: 1fr 420px;
    gap: 40px;
    padding: 0 60px;
    margin: 0 auto;
  }

  .graphic {
    /* Sem min-width:0 o item do grid não pode encolher abaixo do conteúdo (o SVG
       de 600px), então o contêiner nunca diminui e clientWidth lê 600 para sempre. */
    min-width: 0;
    position: sticky;
    top: 20px;
    align-self: start;
  }

  .steps {
    padding-bottom: 100vh;
  }

  .step {
    min-height: 70vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
    font-size: 18px;
  }

  .step-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .step-body {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 8px;
    padding: 8px 16px 16px 0;
    align-items: flex-start;
  }

  .fade-in {
    animation: fade-in 600ms ease-out both;
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── TÍTULO E SUBTÍTULO ── */
  h2 {
    font-size: clamp(1.3rem, 2.5vw, 2rem);
    font-weight: 750;
    letter-spacing: -1px;
    line-height: 1.1;
    color: #1a1a1a;
    margin-bottom: 0.5rem;
    margin-left: 2rem;
  }

  .subtitle {
    font-size: clamp(1rem, 2vw, 1.3rem);
    font-weight: 400;
    line-height: 1.4;
    color: #555;
    margin-bottom: 1rem;
    margin-left: 2rem;
  }

  h2, .subtitle {
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 800ms ease-out, transform 800ms ease-out;
  }

  h2.visible    { opacity: 1; transform: translateY(0); }
  .subtitle.visible {
    opacity: 1;
    transform: translateY(0);
    transition-delay: 150ms;
  }

  /* ── STEPS: títulos e textos ── */
  .step h3 {
    font-size: clamp(1rem, 1.8vw, 1.35rem);
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: -0.3px;
    margin: 0;
  }

  .step-body p {
    font-size: clamp(0.9rem, 1.2vw, 1.05rem);
    line-height: 1.7;
    color: #444;
    margin: 0;
  }

  .step-body :global(strong) {
    font-weight: 700;
  }

  /* ── RESPONSIVO ── */

  /* Tablet (iPad retrato ~1024px): a coluna fixa de 420px mais 120px de padding
     deixavam menos de 450px para o gráfico. Encolhendo a coluna de texto e as
     margens laterais, o gráfico ganha ~200px de largura. */
  @media (min-width: 861px) and (max-width: 1100px) {
    .scrolly {
      grid-template-columns: 1fr 300px;
      gap: 24px;
      padding: 0 24px;
    }

    .step {
      font-size: 15px;
    }

    .step-body p {
      font-size: 0.92rem;
      line-height: 1.55;
    }
  }

  @media (max-width: 860px) {
    .scrolly {
      grid-template-columns: 1fr;
      gap: 0;
      padding: 0 16px;
    }

    /* Mesmo padrão do gráfico "La curva de las emociones": o gráfico fica preso
       no topo e as descrições passam por cima como cartões flutuantes. Antes o
       gráfico era destravado (position: relative), então o texto caía embaixo. */
    .graphic {
      position: sticky;
      top: 0;
      background: #f8f2df;
      padding: 8px 0 0;
      z-index: 1;
    }

    .steps {
      position: relative;
      z-index: 2;
      margin-top: -22vh;
      padding-bottom: 40vh;
      pointer-events: none;
    }

    .step {
      min-height: 58vh;
    }

    .step-content {
      background: rgba(248, 242, 223, 0.94);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      border-radius: 14px;
      border: 1px solid rgba(190, 180, 170, 0.35);
      box-shadow: 0 6px 24px rgba(42, 31, 26, 0.10);
      padding: 14px 16px;
      pointer-events: auto;
    }

    .step-content h3 {
      font-size: 1.3rem;
      margin-bottom: 6px;
    }

    .step-body p {
      font-size: 0.95rem;
      line-height: 1.55;
    }
  }

  .pulse-ring {
    transform-box: fill-box;
    transform-origin: center;
    animation: pulse-ring 1.6s ease-out infinite;
  }

  @keyframes pulse-ring {
    0%   { transform: scale(1);   opacity: 0.7; }
    100% { transform: scale(2.8); opacity: 0; }
  }
</style>
