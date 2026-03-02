<script>
  import { scaleLinear, line, extent, curveMonotoneX } from "d3";
  import { onMount } from "svelte";

  /* ======================
     PROPS
  ====================== */
  export let data = []; // dados por década

  /* ======================
     DIMENSÕES
  ====================== */
  let container;
  let width = 600;
  const height = 800;

  const margin = { top: 300, right: 110, bottom: 50, left: 60 };

  onMount(() => {
    width = container.clientWidth;
    const onResize = () => (width = container.clientWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  });

  /* ======================
     CONFIGURAÇÕES
  ====================== */
  const emotions = [
    { key: "joy", label: "Alegría", color: "#db2d61" },
    { key: "sadness", label: "Tristeza", color: "#4b62d2" },
    { key: "fear", label: "Miedo", color: "#0f5462" },
    { key: "anger", label: "Ira", color: "#ee8e24" },
    { key: "surprise", label: "Sorpresa", color: "#c9a227" },
    { key: "disgust", label: "Asco", color: "#6b7c3e" }
  ];


const callouts = [
    {
      year: 2000,
      text: "A partir de los años 2000, las letras incorporan mayor ambivalencia emocional y narrativas más complejas."
    },
    {
      year: 2010,
      text: "En la década de 2010, emociones como ira y asco ganan presencia en el pop femenino."
    }
  ];

  const CALLOUT_WIDTH = 220;
  const CALLOUT_PADDING = 12;
  const CALLOUT_LINE_HEIGHT = 14;


  /* ======================
    ARTISTAS (MARCADORES VISUAIS)
  ====================== */

  const artists = [
    {
      name: "Madonna",
      year: 1988,
      image: "/artists/madonna.png"
    },
    {
      name: "Britney Spears",
      year: 1999,
      image: "/artists/britney.png"
    },
    {
      name: "Beyoncé",
      year: 2001,
      image: "/artists/beyonce.png"
    },
    {
      name: "Billie Eilish",
      year: 2018,
      image: "/artists/billie.png"
    },
    {
      name: "Adele",
      year: 2010,
      image: "/artists/adele.png"
    },
    {
      name: "Ariana Grande",
      year: 2012,
      image: "/artists/ariana.png"
    },
    {
      name: "Camila Cabello",
      year: 2016,
      image: "/artists/camila.png"
    },
    {
      name: "Charli XCX",
      year: 2014,
      image: "/artists/charli.png"
    },
    {
      name: "Chappell Roan",
      year: 2020,
      image: "/artists/chappell.png"
    },
    {
      name: "Cher",
      year: 1965,
      image: "/artists/cher.png"
    },
    {
      name: "Christina Aguilera",
      year: 1999,
      image: "/artists/christina.png"
    },
    {
      name: "Cyndi Lauper",
      year: 1982,
      image: "/artists/cyndi.png"
    },
    {
      name: "Demi Lovato",
      year: 2008,
      image: "/artists/demi.png"
    },
    {
      name: "Dua Lipa",
      year: 2016,
      image: "/artists/dua.png"
    },
    {
      name: "Fergie",
      year: 2004,
      image: "/artists/fergie.png"
    },
    {
      name: "Lady Gaga",
      year: 2010,
      image: "/artists/gaga.png"
    },
    {
      name: "Jennifer Lopez",
      year: 2001,
      image: "/artists/jennifer.png"
    },
    {
      name: "Katy Perry",
      year: 2006,
      image: "/artists/katy.png"
    },
    {
      name: "Kylie Minogue",
      year: 1988,
      image: "/artists/kylie.png"
    },
    {
      name: "Lana Del Rey",
      year: 2010,
      image: "/artists/lana.png"
    },
    {
      name: "Mariah Carey",
      year: 1991,
      image: "/artists/mariah.png"
    },
    {
      name: "Miley Cyrus",
      year: 2008,
      image: "/artists/miley.png"
    },
    {
      name: "Olivia Rodrigo",
      year: 2020,
      image: "/artists/olivia.png"
    },
    {
      name: "Rihanna",
      year: 2006,
      image: "/artists/rihanna.png"
    },
    {
      name: "Rosalía",
      year: 2014,
      image: "/artists/rosalia.png"
    },
    {
      name: "Sabrina Carpenter",
      year: 2018,
      image: "/artists/sabrina.png"
    },
    {
      name: "Selena Gomez",
      year: 2012,
      image: "/artists/selena.png"
    },
    {
      name: "Taylor Swift",
      year: 2008,
      image: "/artists/taylor.png"
    },
    {
      name: "Shakira",
      year: 1994,
      image: "/artists/shakira.png"
    },
    {
      name: "Tate McRae",
      year: 2020,
      image: "/artists/tate.png"
    },
    {
      name: "Whitney Houston",
      year: 1980,
      image: "/artists/whitney.png"
    }
  ];


  //const ARTIST_SIZE = 55;
  //const ARTIST_GAP = 6;
  //const ARTIST_Y_BASE = margin.top - 28;

  /* ======================
      AVATARS RESPONSIVOS
    ====================== */

    // tamanho do avatar depende da largura
    $: ARTIST_SIZE = Math.max(
      22,
      Math.min(48, width / 22)
    );

    // espaçamento vertical entre avatars do mesmo ano
    $: ARTIST_GAP = Math.max(
      6,
      Math.min(8, width / 120)
    );

    // posição base (sobe um pouco em telas menores)
    $: ARTIST_Y_BASE =
      width < 700
        ? margin.top - ARTIST_SIZE - 5
        : margin.top - ARTIST_SIZE + 20;



  $: artistLayout = artists
    .filter(a => currentYear !== null && currentYear >= a.year)
    .map((a, _, arr) => {
      // quantas artistas existem neste mesmo ano
      const sameYear = arr.filter(d => d.year === a.year);

      const indexInYear = sameYear.findIndex(d => d.name === a.name);

      return {
        ...a,
        cx: x(a.year),
        cy: ARTIST_Y_BASE - indexInYear * (ARTIST_SIZE + ARTIST_GAP)
      };
    });



  /* ======================
     QUEBRAR TEXTOS DE CALLOUTS
  ====================== */
  function wrapText(text, maxChars = 38) {
    const words = text.split(" ");
    const lines = [];
    let line = "";

    words.forEach(word => {
      const test = line ? `${line} ${word}` : word;
      if (test.length > maxChars) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });

    if (line) lines.push(line);
    return lines;
  };

  /* ======================
     LAYOUT DE CALLOUTS
  ====================== */
  
  $: calloutLayout = callouts
    .map(c => {
      // só aparece quando a animação chega naquele ano
      if (currentYear === null || currentYear < c.year) return null;

      const point = animatedData.find(d => d.year === c.year);
      if (!point) return null;

      const cx = x(c.year);
      const cy = y(point.joy); // ancora na alegría

      const placeRight = cx < width / 2;
      const boxX = placeRight ? 12 : -CALLOUT_WIDTH - 12;

      const lines = wrapText(c.text);
      const boxHeight =
        lines.length * CALLOUT_LINE_HEIGHT + CALLOUT_PADDING * 2;

      return {
        ...c,
        cx,
        cy,
        boxX,
        lines,
        boxHeight
      };
    })
    .filter(Boolean);

 
  /* ======================
     INTERPOLAÇÃO: DÉCADA → ANO
  ====================== */
  function interpolateYears(data) {
    const years = [];

    for (let i = 0; i < data.length - 1; i++) {
      const a = data[i];
      const b = data[i + 1];

      for (let year = a.decade; year < b.decade; year++) {
        const t = (year - a.decade) / (b.decade - a.decade);

        years.push({
          year,
          joy: a.joy + t * (b.joy - a.joy),
          sadness: a.sadness + t * (b.sadness - a.sadness),
          fear: a.fear + t * (b.fear - a.fear),
          anger: a.anger + t * (b.anger - a.anger),
          surprise: a.surprise + t * (b.surprise - a.surprise),
          disgust: a.disgust + t * (b.disgust - a.disgust)
        });
      }
    }

    const last = data[data.length - 1];
    years.push({ year: last.decade, ...last });

    return years;
  }

  $: yearlyData = data.length ? interpolateYears(data) : [];

  /* ======================
   DÉCADAS (PARA FUNDO)
  ====================== */
  $: decades = data.map(d => d.decade);


  /* ======================
     ANIMAÇÃO (ANO A ANO)
  ====================== */
  let currentYear = null;

  $: if (yearlyData.length && currentYear === null) {
    currentYear = yearlyData[0].year;

    const interval = setInterval(() => {
      const i = yearlyData.findIndex(d => d.year === currentYear);
      if (i < yearlyData.length - 1) {
        currentYear = yearlyData[i + 1].year;
      } else {
        clearInterval(interval);
      }
    }, 35); // ~28fps (suave)
  }

  $: animatedData =
    currentYear === null
      ? []
      : yearlyData.filter(d => d.year <= currentYear);

  /* ======================
     ESCALAS
  ====================== */
  $: x = scaleLinear()
    .domain(extent(yearlyData, d => d.year))
    .range([margin.left, width - margin.right]);

  $: y = scaleLinear()
    .domain([0, 0.7])
    .range([height - margin.bottom, margin.top]);

  $: xTicks = x.ticks(6);
  $: yTicks = y.ticks(5);

  /* ======================
     LINHAS
  ====================== */
  $: series = emotions.map(emotion => {
    const lineGen = line()
      .x(d => x(d.year))
      .y(d => y(d[emotion.key]))
      .curve(curveMonotoneX);

    const path = animatedData.length ? lineGen(animatedData) : "";
    const last = animatedData[animatedData.length - 1];

    return {
      ...emotion,
      path,
      labelX: last ? x(last.year) + 6 : 0,
      labelY: last ? y(last[emotion.key]) + 4 : 0
    };
  });
</script>


<div bind:this={container} style="width: 100%;">
  <svg {width} {height}>
    <!-- fundo por décadas -->
    {#each decades as decade, i}
      <rect
        x={x(decade)}
        y={margin.top}
        width={x(decade + 10) - x(decade)}
        height={height - margin.top - margin.bottom}
        fill={i % 2 === 0 ? "#faf7f5" : "#ffffff"}
      />
    {/each}


    <!-- eixo X -->
    <line
      x1={margin.left}
      x2={width - margin.right}
      y1={height - margin.bottom}
      y2={height - margin.bottom}
      stroke="#bbb"
    />

    {#each xTicks as year}
      <g transform={`translate(${x(year)}, ${height - margin.bottom})`}>
        <line y2="6" stroke="#999" />
        <text y="20" text-anchor="middle" font-size="11" fill="#666">
          {year}s
        </text>
      </g>
    {/each}

    <!-- eixo Y -->
    <line
      x1={margin.left}
      x2={margin.left}
      y1={margin.top}
      y2={height - margin.bottom}
      stroke="#bbb"
    />

    {#each yTicks as v}
      <g transform={`translate(${margin.left}, ${y(v)})`}>
        <line x2={width - margin.right} stroke="#eee" />
        <text x="-10" y="4" text-anchor="end" font-size="11" fill="#666">
          {v.toFixed(1)}
        </text>
      </g>
    {/each}


    <!-- artistas -->
    {#each artistLayout as a}
      <g transform={`translate(${a.cx}, ${a.cy})`}>
        <defs>
          <clipPath id={`clip-${a.name.replace(/\s/g, "")}`}>
            <circle cx="0" cy="0" r={ARTIST_SIZE / 2} />
          </clipPath>
        </defs>

        <!-- imagem -->
        <image
          href={a.image}
          x={-ARTIST_SIZE / 2}
          y={-ARTIST_SIZE / 2}
          width={ARTIST_SIZE}
          height={ARTIST_SIZE}
          clip-path={`url(#clip-${a.name.replace(/\s/g, "")})`}
        />

        <!-- borda -->
        <circle
          cx="0"
          cy="0"
          r={ARTIST_SIZE / 2}
          fill="none"
          stroke="#ddd"
          stroke-width="1"
        />

        <!-- tooltip -->
        <title>{a.name}</title>
      </g>
    {/each}


    <!-- callouts -->
    {#each calloutLayout as c}
      <g transform={`translate(${c.cx}, ${c.cy - 10})`}>

        <!-- caixa -->
        <rect
          x={c.boxX}
          y={-c.boxHeight - 12}
          width={CALLOUT_WIDTH}
          height={c.boxHeight}
          rx="6"
          fill="#fff6d5"
          stroke="#e0c36a"
        />

        <!-- texto -->
        <text
          x={c.boxX + CALLOUT_WIDTH / 2}
          y={-c.boxHeight + CALLOUT_PADDING - 12}
          text-anchor="middle"
          font-size="12"
          fill="#5a4a00"
        >
          {#each c.lines as line, i}
            <tspan
              x={c.boxX + CALLOUT_WIDTH / 2}
              dy={i === 0 ? "0" : CALLOUT_LINE_HEIGHT}
            >
              {line}
            </tspan>
          {/each}
        </text>
      </g>
    {/each}


    <!-- linhas -->
    {#each series as s}
      <path
        d={s.path}
        fill="none"
        stroke={s.color}
        stroke-width="2.5"
        style="transition: d 120ms linear;"
      />

      <text
        x={s.labelX}
        y={s.labelY}
        fill={s.color}
        font-size="12"
      >
        {s.label}
      </text>
    {/each}
  </svg>
</div>

