<script>
  import { scaleLinear, scaleBand } from "d3";
  import { onMount } from "svelte";
  import scrollama from "scrollama";

  export let data = [];

  let container;
  let width = 600;
  const height = 600;

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

    const onResize = () => {
      width = container.clientWidth;
      scroller?.resize();
    };

    window.addEventListener("resize", onResize);

    scroller = scrollama();

    scroller
      .setup({
        step: ".step",
        offset: 0.6
      })
      .onStepEnter(({ index }) => {
        activeIndex = index;
      });

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
    <div bind:this={container} style="width: 100%;">
      
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

  <!-- TEXTO (SCROLL) -->
  <div class="steps">
    {#each data as d, i}
      <div class="step">
        <h3>{d.decade}s</h3>
        <p>
          Texto explicativo da década {d.decade}.
        </p>

        {#if i <= activeIndex && decadeArtists[d.decade]}
        <div class="artist-strip">
          <div class="artist-row">
            {#each decadeArtists[d.decade] as artist}
              <img
                src={artist.image}
                alt={artist.name}
                title={artist.name}
              />
            {/each}
          </div>
        </div>
      {/if}

      </div>
    {/each}
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

  .steps {
    padding-bottom: 200px;
  }

  .step {
    min-height: 70vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 16px;
    font-size: 18px;
  }

  .artist-strip {
    margin-top: 12px;
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

</style>
