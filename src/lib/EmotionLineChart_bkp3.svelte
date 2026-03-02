<script>
  import { scaleLinear, scaleBand } from "d3";
  import { onMount } from "svelte";
  import scrollama from "scrollama";

  export let data = [];

  let container;
  let width = 600;
  let height = 600;

  let scroller;
  let activeIndex = -1;

  const margin = { top: 40, right: 40, bottom: 60, left: 60 };


  const decadeArtists = {
  1960: [
    { name: "Cher", image: "/artists/cher.png" }
  ],
  1970: [
    { name: "Cher", image: "/artists/cher.png" }
  ],
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
    { name: "Selena Gomez", image: "/artists/selena.png" },
  ],
  2020: [
    { name: "Sabrina Carpenter", image: "/artists/sabrina.png" },
    { name: "Billie Eilish", image: "/artists/billie.png" },
    { name: "Olivia Rodrigo", image: "/artists/olivia.png" },
    { name: "Chappell Roan", image: "/artists/chappell.png" },
    { name: "Tate McRae", image: "/artists/tate.png" }
  ]
};


  /* ======================
     LAYOUT RESPONSIVO
  ====================== */
  onMount(() => {
    width = container.clientWidth;
    height = window.innerHeight;

    const onResize = () => {
      width = container.clientWidth;
      height = window.innerHeight;
      scroller?.resize();
    };

    window.addEventListener("resize", onResize);

    scroller = scrollama();

    scroller
      .setup({
        step: ".step .annotation-card",
        offset: 0.8
      })
      .onStepEnter(({ index }) => {
        activeIndex = index;
      });

      // FORÇA O INÍCIO SE JÁ ESTIVER NO TOPO
      if (window.scrollY < window.innerHeight) {
          activeIndex = 0;
      };

    return () => {
      window.removeEventListener("resize", onResize);
      scroller.destroy();
    };
  });

  /* ======================
     EMOÇÕES
  ====================== */
  const emotions = [
    { key: "joy", label: "Alegría", color: "#db2d61" },
    { key: "sadness", label: "Tristeza", color: "#4b62d2" },
    { key: "fear", label: "Miedo", color: "#0f5462" },
    { key: "anger", label: "Ira", color: "#ee8e24" },
    { key: "surprise", label: "Sorpresa", color: "#c9a227" },
    { key: "disgust", label: "Asco", color: "#6b7c3e" }
  ];

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

  function decadeCenter(decade) {
    return xBand(decade) + xBand.bandwidth() / 2;
  }
</script>


<section class="scrolly">

  <!-- GRÁFICO (STICKY) -->
  <div class="graphic">
    <div bind:this={container} style="width: 100%;" class="graphic-inner">


      <!-- FOTOS -->
      <div class="artists-layer">
        {#each data.slice(0, activeIndex + 1) as d} <!-- Mostra acumulado -->
           {#if decadeArtists[d.decade]}
            <div class="artists-decade" style="left: {xBand(d.decade) + xBand.bandwidth() / 2}px">
              {#each decadeArtists[d.decade] as artist}
                <img src={artist.image} alt={artist.name} />
              {/each}
            </div>
           {/if}
        {/each}
      </div>


      
      <!-- SVG GRÁFICO -->
      <svg {width} {height}>

        <!-- eixo Y -->
        <line
          x1={margin.left}
          x2={margin.left}
          y1={margin.top}
          y2={height - margin.bottom}
          stroke="#999"
        />

        <!-- ticks Y -->
        {#each [0, 0.2, 0.4, 0.6] as v}
          <g transform={`translate(${margin.left}, ${y(v)})`}>
            <line x2={width - margin.right} stroke="#eee" />
            <text x="-10" y="4" text-anchor="end" font-size="11" fill="#666">
              {v.toFixed(1)}
            </text>
          </g>
        {/each}

        <!-- CONECTORES -->
        {#each emotions as emotion}
          {#each data.slice(0, data.length - 1) as d, i}
            {@const next = data[i + 1]}
            {#if i < activeIndex}
              <line
                x1={decadeCenter(d.decade) + xBand.bandwidth() / 2}
                y1={y(d[emotion.key])}
                x2={decadeCenter(next.decade) - xBand.bandwidth() / 2}
                y2={y(next[emotion.key])}
                stroke={emotion.color}
                stroke-width="3"
                stroke-opacity="0.25"
                stroke-linecap="round"
              />
            {/if}
          {/each}
        {/each}

        <!-- COLUNAS POR DÉCADA -->
        {#each blocks as block, i}
          <g transform={`translate(${xBand(block.decade)},0)`}>

            <!-- fundo -->
            <rect
              x="0"
              y={margin.top}
              width={xBand.bandwidth()}
              height={height - margin.top - margin.bottom}
              fill="#faf7f5"
            />

            <!-- segmentos -->
            {#each block.emotions as e}
              <line
                x1="0"
                x2={xBand.bandwidth()}
                y1={y(e.value)}
                y2={y(e.value)}
                stroke={e.color}
                stroke-width="3"
                stroke-linecap="round"
              />
            {/each}

            <!-- label -->
            <text
              x={xBand.bandwidth() / 2}
              y={height - margin.bottom + 24}
              text-anchor="middle"
              font-size="12"
              fill="#333"
            >
              {block.decade}s
            </text>
          </g>
        {/each}

      </svg>

    </div>
  </div>

  <!-- ANOTAÇÕES (Rolam por cima) -->
  <div class="steps">
    {#each data as d, i}
      <div class="step">
        <!-- A anotação agora vive DENTRO do step correspondente -->
        <!-- Ela vai rolar junto com a página -->
        <div class="annotation-card" style="margin-left: {xBand ? (xBand(d.decade) + xBand.bandwidth()/2) + 'px' : '50%'}">
           <h3>{d.decade}s</h3>
           <p>Texto explicativo da década {d.decade}.</p>
        </div>
      </div>
    {/each}
  </div>

  <!-- STEPS -->
  <div class="steps">
    {#each data as _}
      <div class="step"></div>
    {/each}
  </div>

</section>

<style>

  .scrolly {
    position: relative;
    margin-bottom: 0;
  }

  .graphic {
    position: sticky;
    top: 0;
    height: 100vh;
    z-index: -1;
  }

  .graphic-inner {
    height: 100%;
  }

  svg {
    height: 100%;
  }

  .steps {
    position: relative;
    z-index: 10;
    margin-top: -100vh;
    pointer-events: none;
    padding-bottom: 20vh;
  }

  .step {
    height: 80vh;
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .artists-layer {
    position: absolute;
    top: 16px;
    left: 0;
    width: 100%;
    pointer-events: none;
    z-index: 5;
  }

  .artists-decade {
    position: absolute;
    transform: translateX(-50%);
    display: grid;
    grid-template-columns: repeat(auto-fill, 40px);
    gap: 6px;
    max-width: 220px;
  }

  .artists-decade img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid #ddd;
    background: white;
  }


  .annotation-card {
    background: rgba(255, 246, 213, 0.95); /* Fundo levemente transparente */
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    max-width: 280px;
    pointer-events: auto; /* Reativa o mouse para selecionar texto se quiser */
    transform: translateX(-50%); /* Centraliza exato no ponto calculado */
    
    /* Animação suave de entrada (opcional) */
    opacity: 0; 
    transition: opacity 0.5s;
  }

  /* Deixa visível apenas quando o step está "ativo" ou próximo (opcional) */
  /* Se quiser que todos apareçam enquanto rola, remova a opacidade acima */
  .step:hover .annotation-card, 
  .step .annotation-card { 
    opacity: 1; 
  }
  .step:last-child {
    height: 50vh; /* Menor que os outros */
    margin-bottom: 0;
  }


</style>
