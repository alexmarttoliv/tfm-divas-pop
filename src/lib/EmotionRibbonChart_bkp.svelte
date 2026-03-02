<script>
  import { scaleLinear, stack, area, curveCatmullRom, extent, stackOffsetWiggle, stackOrderInsideOut } from "d3";
  import { onMount, tick, afterUpdate } from "svelte";
  import { draw } from "svelte/transition";
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
        .onStepEnter(({ index }) => {
          activeIndex = index;
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
     INTERPOLAÇÃO DE DADOS
  ====================== */

  function interpolateData(data, steps = 10) {
    const result = [];

    for (let i = 0; i < data.length - 1; i++) {
      const a = data[i];
      const b = data[i + 1];

      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        result.push({
          index: i + t,
          decade: a.decade,
          joy: a.joy * (1 - t) + b.joy * t,
          sadness: a.sadness * (1 - t) + b.sadness * t,
          fear: a.fear * (1 - t) + b.fear * t,
          anger: a.anger * (1 - t) + b.anger * t,
          surprise: a.surprise * (1 - t) + b.surprise * t,
          disgust: a.disgust * (1 - t) + b.disgust * t
        });
      }
    }

    // último ponto
    result.push({
      ...data[data.length - 1],
      index: data.length - 1
    });

    return result;
  };


  /* ======================
     DADOS VISÍVEIS
  ====================== */
  $: visibleData =
    activeIndex < 0 ? [] : data.slice(0, activeIndex + 1);

  $: indexedData = data.map((d, i) => ({
    ...d,
    index: i
  }));

  $: stackGenerator = stack()
    .keys(emotions.map(e => e.key))
    .offset(stackOffsetWiggle)
    .order(stackOrderInsideOut);

  $: interpolatedData = interpolateData(indexedData, 12);
  $: stackedSeries = stackGenerator(interpolatedData);



  $: yDomain = stackedSeries.length
    ? [
        Math.min(...stackedSeries.flatMap(s => s.map(d => d[0]))),
        Math.max(...stackedSeries.flatMap(s => s.map(d => d[1])))
      ]
    : null;

  $: areaGenerator = area()
    .x(d => x(d.data.index))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(curveCatmullRom.alpha(3));




  $: visibleDecades =
    activeIndex < 0
      ? []
      : data.slice(0, activeIndex + 1).map(d => d.decade);

  $: visibleArtists = visibleDecades.flatMap(decade =>
    decadeArtists[decade] ? decadeArtists[decade] : []
  );


  /* ======================
     ESCALAS (DOMÍNIO FIXO)
  ====================== */
  $: x = scaleLinear()
    .domain([0, indexedData.length - 1])
    .range([margin.left, width - margin.right]);


  $: y = scaleLinear()
    .domain([-1, 2])
    .range([height - margin.bottom, margin.top]);


</script>

<section class="scrolly">

  <!-- GRÁFICO (STICKY) -->
  <div class="graphic">
    <div bind:this={container} style="width: 100%;">
      
      <!-- SVG GRÁFICO -->
      <svg {width} {height}>

        {#each stackedSeries as layer, i (layer.key)}
          <path
            d={areaGenerator(layer)}
            fill={emotions.find(e => e.key === layer.key).color}
            opacity="0.9"
          />
        {/each}

        <!-- eixo X minimal -->
        {#each indexedData as d}
          <text
            x={x(d.index)}
            y={height - margin.bottom + 24}
            text-anchor="middle"
            font-size="14"
            fill="#333"
          >
            {d.decade}s
          </text>
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
