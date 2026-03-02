<script>
  import { scaleLinear, scaleBand } from "d3";
  import { onMount, tick, afterUpdate } from "svelte";
  import { draw, fade } from "svelte/transition";
  import { linear } from "svelte/easing";
  import scrollama from "scrollama";
  import { emotions, decadeArtists } from '$lib/config.js';

  export let data = [];

  let container;
  let width = 600;
  const height = 500;

  let scroller;
  let activeIndex = -1;

  export let onComplete = () => {}; // Callback quando terminar
  let chartOpacity = 1;
  let isComplete = false;

  let titleVisible = false;
  let titleEl;
  let direction = "down";


  const margin = { top: 40, right: 85, bottom: 60, left: 60 };



  const decadeTexts = {
    1970: "En los 70, Cher abre el camino de las divas pop con baladas donde la tristeza pesa más que cualquier otro sentimiento. Sus canciones convierten la ruptura y el arrepentimiento en un estribillo generacional, con muy pocos destellos de auténtica alegría.",
    1980: "En los 80, Whitney Houston, Madonna, Kylie Minogue y Cyndi Lauper irrumpen para romper el monopolio de la tristeza: sus himnos llenan las pistas de baile y empujan el pop femenino hacia un registro mucho más luminoso y esperanzador.",
    1990: "En los 90, la apuesta se consolida: Britney Spears, Mariah Carey y Christina Aguilera llevan la mezcla de euforia y drama a las listas de éxitos, pero con un saldo emocional donde la alegría sigue ganando a las lágrimas.",
    2000: "En los 2000, las divas veteranas se consolidan y llegan nuevas voces; el resultado es el pico de canciones que transmiten alegría, impulsado por discos festivos como “X” de Kylie Minogue y los álbumes navideños de Christina Aguilera y Whitney Houston.",
    2010: "En los 2010, el paisaje emocional se complica: crecen la ira, el miedo y vuelve con fuerza la tristeza, en álbumes conceptuales como “Born This Way”, “Anti”, “Lemonade” y “21”, donde las letras hablan de identidad, injusticia y heridas abiertas.",
    2020: "En los 2020, las letras son más diversas que nunca: la tristeza reaparece con intensidad y emociones como asco e ira ganan espacio, empujadas por una nueva generación de divas como Olivia Rodrigo y Billie Eilish que llevan la vulnerabilidad al centro del pop."
  };



  /* ======================
     LAYOUT RESPONSIVO E SCROLLAMA
  ====================== */
  // Função para iniciar ou atualizar o Scrollama
  const updateScroller = async () => {
    if (!data || data.length === 0) return;

    // Espera o DOM atualizar com os novos dados
    await tick();

    // Se o scroller já existe, apenas redimensiona/atualiza
    // Se não, cria uma nova instância
    if (!scroller) {
      scroller = scrollama();
      scroller
        .setup({
          step: ".step",
          offset: 0.3
        })
        .onStepEnter(({ index, direction: dir }) => {
          direction = dir;
          activeIndex = index;

          if (direction === "down") {
            activeIndex = index;
          }
          if (direction === "up") {
            activeIndex = index;
          }
          if (index === data.length - 1 && direction === "down") {
            isComplete = false;
            chartOpacity = 1;
          }
        })
        .onStepExit(({ index, direction }) => {
          // Quando o ÚLTIMO step sair de tela indo para baixo
          if (index === data.length - 1 && direction === "down") {
            isComplete = true;
            chartOpacity = 0;
            onComplete();
          }
          // Quando voltar
          if (index === data.length - 1 && direction === "up") {
            isComplete = false;
            chartOpacity = 1;
          }
        });
    } else {
      scroller.resize(); // Recalcula posições dos steps
    }
  };

  // Reagir a mudanças em 'data' para atualizar o scroller
  $: if (data) {
     updateScroller();
  }

  onMount(() => {
    width = container.clientWidth;

    const onResize = () => {
      width = container.clientWidth;
      scroller?.resize();
    };

    window.addEventListener("resize", onResize);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          titleVisible = true;
          observer.disconnect(); // dispara só uma vez
        }
      },
      { threshold: 0.1 }
    );

    if (titleEl) observer.observe(titleEl);

    return () => {
      window.removeEventListener("resize", onResize);
      scroller.destroy();
    };

    
  });

  /* ======================
     DADOS VISÍVEIS
  ====================== */
  $: visibleData =
    activeIndex < 0 ? [] : data.slice(0, activeIndex + 1);

  $: visibleDecades =
    activeIndex < 0
      ? []
      : data.slice(0, activeIndex + 1).map(d => d.decade);

  $: visibleArtists = visibleDecades.flatMap(decade =>
    decadeArtists[decade] ? decadeArtists[decade] : []
  );


  $: blocks = visibleData.map(d => ({
    decade: d.decade,
    emotions: emotions.map(e => ({
      ...e,
      value: d[e.key]
    }))
  }));

  /* ======================
     ESCALAS (DOMÍNIO FIXO)
  ====================== */
  $: xBand = scaleBand()
    .domain(data.map(d => d.decade))
    .range([margin.left, width - margin.right])
    .paddingInner(0.25);

  $: y = scaleLinear()
    .domain([0, 0.7])
    .range([height - margin.bottom, margin.top]);

  // Tornar decadeCenter reativo para atualizar no resize
  $: decadeCenter = (decade) => {
    // Verificação de segurança para evitar NaN se xBand não estiver pronto
    const val = xBand(decade);
    return val !== undefined ? val + xBand.bandwidth() / 2 : 0;
  };

</script>

<section class="scrolly">

  <!-- GRÁFICO (STICKY) -->
  <div class="graphic" style="opacity: {chartOpacity}; transition: opacity 0.6s ease;">
    <div bind:this={container} style="width: 100%;">

      <h2 class="title" bind:this={titleEl} class:visible={titleVisible}>
        La curva de las emociones
      </h2>
      <p class="subtitle" class:visible={titleVisible}>
        Cómo cambiaron los sentimientos dominantes en las letras del pop femenino década tras década
      </p>
      
      <!-- SVG GRÁFICO -->
      <svg {width} {height}>

        <!-- eixo Y -->
        <line
          x1={margin.left-10}
          x2={margin.left-10}
          y1={margin.top}
          y2={height - margin.bottom}
          stroke="#999"
          font-weight="400"
        />

        <!-- ticks Y -->
        {#each [0, 0.2, 0.4, 0.6] as v}
          <g transform={`translate(${margin.left}, ${y(v)})`}>
            <line x2={width - margin.right} stroke="#eee" />
            <text x="-15" y="4" text-anchor="end" font-size="11" fill="#666">
              {v.toFixed(1)}
            </text>
          </g>
        {/each}

        <!-- CONECTORES E LABELS DE EMOÇÕES -->
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
                stroke-opacity="0.25"
                stroke-linecap="round"
              />
            {/if}
          {/each}

            {#if activeIndex >= 0}
              {@const currentDecade = data[activeIndex]}
              {#key currentDecade.decade}
                <text
                  in:fade={{ duration: 1300 }}
                  out:fade={{ duration: 250 }}
                  x={decadeCenter(currentDecade.decade) + xBand.bandwidth() / 2 + 15}
                  y={y(currentDecade[emotion.key]) + 4}
                  font-size="16"
                  font-weight="600"
                  fill={emotion.color}
                  text-anchor="start"
                >
                  {emotion.label}
                </text>
              {/key}
            {/if}
        {/each}

        <!-- COLUNAS POR DÉCADA -->
        {#each blocks as block (block.decade)}
          <g transform={`translate(${xBand(block.decade)},0)`}>

            <!-- segmentos -->
            {#each block.emotions as e, idx}
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

            <!-- label -->
            <text
              x={xBand.bandwidth() / 2}
              y={height - margin.bottom + 24}
              text-anchor="middle"
              font-size="16"
              fill="#333"
            >
              {block.decade}s
            </text>
          </g>
        {/each}

      </svg>

    </div>

  </div>


  <!-- TEXTO (SCROLL) -->
  <div class="steps">
    {#each data as d, i}
      <div class="step">
        {#if i <= activeIndex}
          {#key activeIndex}
            <div class="step-content" class:fade-in={direction === "down"}>
              <h3>{d.decade}s</h3>
              <div class="step-body">
                <p>{decadeTexts[d.decade]}</p>
                {#if decadeArtists[d.decade]}
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
          {/key}
        {/if}
      </div>
    {/each}
  </div>


</section>

<style>
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

  h2.visible, .subtitle.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .subtitle.visible {
    transition-delay: 150ms; /* pequeno delay no subtítulo */
  }


  .scrolly {
    display: grid;
    grid-template-columns: 1fr 420px;
    gap: 40px;
    padding: 0 60px;
    margin: 0 auto;
  }

  .graphic {
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

  .step-body {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 8px;
    padding: 8px 16px 16px 0;
    align-items: flex-start;
  }

  .step-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .fade-in {
    animation: fade-in 600ms ease-out both;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
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
    transition: transform 0.3s ease;
  }

  .segment-line-animate {
    animation: drawSegment 0.8s linear forwards;
  }

  @keyframes drawSegment {
    to {
      stroke-dashoffset: 0;
    }
  }


</style>
