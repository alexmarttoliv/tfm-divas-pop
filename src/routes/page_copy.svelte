<script>
  import { onMount } from "svelte";
  import { csv } from "d3-fetch";

  import EmotionLineChart from "$lib/EmotionLineChart.svelte";
  import EmotionRibbonChart from "$lib/EmotionRibbonChart.svelte";
  import ValenceActivationChart from "$lib/ValenceActivationChart.svelte";
  import ValenceActivationScatter from "$lib/ValenceActivationScatter.svelte";

  import { emotions } from '$lib/config.js';

  let emotionData = [];
  let valenceData = [];
  let scatterData = [];
  let ribbonData = [];

  onMount(async () => {
    // gráfico 1 — emoções
    emotionData = await csv(
      "/data/graph_linha_media_emocoes_decade.csv",
      d => ({
        decade: +d.decade,
        joy: +d.emocion_alegria,
        sadness: +d.emocion_tristeza,
        fear: +d.emocion_miedo,
        anger: +d.emocion_ira,
        surprise: +d.emocion_sorpresa,
        disgust: +d.emocion_asco
      })
    );

    // gráfico 2 — valência / ativação
    valenceData = await csv(
      "/data/graph_media_valencia_activacion_decade.csv",
      d => ({
        decade: +d.decade,
        valence: +d.valencia,
        activation: +d.activacion
      })
    );

    // gráfico 3 — dispersão valência / ativação
    scatterData = await csv(
      "/data/graph_scatter_valencia_activacion.csv",
      d => ({
        year: +d.release_year,
        valence: +d.valencia,
        activation: +d.activacion,
        dominant_emotion: d.emocion_principal,
        intensity: +d.intensity,
        artist: d.diva_name,
        track: d.name,
        album: d.album_name,
        emocion_alegria: +d.emocion_alegria,
        emocion_tristeza: +d.emocion_tristeza,
        emocion_ira: +d.emocion_ira,
        emocion_miedo: +d.emocion_miedo,
        emocion_sorpresa: +d.emocion_sorpresa,
        emocion_asco: +d.emocion_asco
      })
    );

    // gráfico 4
    ribbonData = await csv(
      "/data/graph_linha_media_emocoes_decade.csv",
      d => ({
        decade: +d.decade,
        joy: +d.emocion_alegria,
        sadness: +d.emocion_tristeza,
        fear: +d.emocion_miedo,
        anger: +d.emocion_ira,
        surprise: +d.emocion_sorpresa,
        disgust: +d.emocion_asco
      })
    );

  });

  // Mapeo de las 31 divas con su nombre oficial y el archivo de imagen correspondiente
  const divas = [
		{ name: "Adele", file: "adele.png" },
		{ name: "Ariana Grande", file: "ariana.png" },
		{ name: "Beyoncé", file: "beyonce.png" },
		{ name: "Billie Eilish", file: "billie.png" },
		{ name: "Britney Spears", file: "britney.png" },
		{ name: "Camila Cabello", file: "camila.png" },
		{ name: "Chappell Roan", file: "chappell.png" },
		{ name: "Charli XCX", file: "charli.png" },
		{ name: "Cher", file: "cher.png" },
		{ name: "Christina Aguilera", file: "christina.png" },
		{ name: "Cyndi Lauper", file: "cyndi.png" },
		{ name: "Demi Lovato", file: "demi.png" },
		{ name: "Dua Lipa", file: "dua.png" },
		{ name: "Fergie", file: "fergie.png" },
		{ name: "Jennifer Lopez", file: "jennifer.png" },
		{ name: "Katy Perry", file: "katy.png" },
		{ name: "Kylie Minogue", file: "kylie.png" },
		{ name: "Lady Gaga", file: "gaga.png" },
		{ name: "Lana Del Rey", file: "lana.png" },
		{ name: "Madonna", file: "madonna.png" },
		{ name: "Mariah Carey", file: "mariah.png" },
		{ name: "Miley Cyrus", file: "miley.png" },
		{ name: "Olivia Rodrigo", file: "olivia.png" },
		{ name: "Rihanna", file: "rihanna.png" },
		{ name: "Rosalía", file: "rosalia.png" },
		{ name: "Sabrina Carpenter", file: "sabrina.png" },
		{ name: "Selena Gomez", file: "selena.png" },
		{ name: "Shakira", file: "shakira.png" },
		{ name: "Tate McRae", file: "tate.png" },
		{ name: "Taylor Swift", file: "taylor.png" },
		{ name: "Whitney Houston", file: "whitney.png" }
	];

  // Variáveis para controle do scroll
  let scrollY = 0;
  let container;
  let textOpacity = 1;
  let chartOpacity = 0.3;

  // Lógica reativa: calcula a opacidade baseada na posição do scroll
  $: if (container) {
    const rect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Calcula o progresso do scroll dentro do container (0 a 1)
    // O texto desaparece nos primeiros 40% do scroll do container
    const startFade = 0; 
    const endFade = 400; // Pixels de scroll para o fade completo
    
    // Quando o container atinge o topo da tela
    if (rect.top <= 0) {
      const scrolled = Math.abs(rect.top);
      
      // Cálculo da opacidade do texto (vai de 1 a 0)
      textOpacity = Math.max(0, 1 - (scrolled / endFade));
      
      // O gráfico ganha foco total quando o texto some
      chartOpacity = 0.3 + (0.7 * (1 - textOpacity)); 
    } else {
      textOpacity = 1;
      chartOpacity = 0.3;
    }
  }

</script>

<svelte:window bind:scrollY />

<section class="intro">
  <h1 class="intro-title">
    ¿Cómo se volvió emocionalmente más complejo el pop de las divas?
  </h1>

  <h2 class="intro-subtitle">
    Cómo las canciones pasaron de emociones dominantes a paisajes emocionales complejos
  </h2>

  <p class="intro-kicker">
    Un análisis visual de letras y emociones en el pop femenino desde los años 60 hasta hoy
  </p>

  <p class="intro-text">
    La música pop funciona como el idioma universal de las masas y busca la inmediatez mediante melodías diseñadas para infiltrarse en la memoria colectiva. 
    Es un género que no solo aspira a ser escuchado, sino a definir el momento cultural de cada época.
  </p>

  <p class="intro-text">
    Sin embargo, el estatus de <strong>Diva Pop</strong> exige mucho más que simples éxitos de radio. 
    Estas figuras son fenómenos culturales capaces de llenar estadios, generar ventas millonarias y protagonizar espectáculos monumentales. 
    Su rasgo distintivo es la capacidad de conectar profundamente con un fandom inquebrantable que sigue cada uno de sus pasos.
  </p>

  <p class="intro-text">
    El núcleo de esa conexión reside en las letras. Las divas utilizan sus canciones para narrar sus momentos vitales y exponer sus sentimientos más íntimos. 
    Sus temas actúan como espejos donde millones de personas ven reflejadas sus propias vivencias y emociones.
  </p>

  <p class="intro-text">
    Este análisis explora precisamente esa evolución sentimental a lo largo de las décadas. 
    Los datos confirman que las letras del pop femenino han dejado de centrarse en mensajes simples para volverse emocionalmente más diversas y capaces de capturar toda la complejidad de la experiencia humana moderna.
  </p>
</section>

<main>
<!-- Sección de Datos y Metodología -->
	<section class="study-details">
		<div class="stats-container">
			<h2>El Universo Analizado</h2>
			<p class="highlight-text">
				Para entender esta evolución, nos sumergimos en la discografía de <strong>31 iconos del pop</strong>.
			</p>
			
			<div class="numbers-grid">
				<div class="stat-item">
					<span class="count">234</span>
					<span class="label">Álbumes</span>
				</div>
				<div class="stat-item">
					<span class="count">3026</span>
					<span class="label">Canciones</span>
				</div>
			</div>

			<p class="methodology">
				Cada una de estas letras fue analizada individualmente utilizando la inteligencia artificial <strong>Gemini 2.5 Pro</strong>, permitiendo una interpretación profunda de los matices emocionales y temáticos de cada composición.
			</p>
		</div>

		<!-- Galería de Divas -->
		<div class="divas-grid">
			{#each divas as diva}
				<div class="diva-card">
					<div class="image-wrapper">
						<img 
							src="/artists/{diva.file}" 
							alt="Foto de {diva.name}" 
							loading="lazy" 
						/>
					</div>
					<span class="diva-name">{diva.name}</span>
				</div>
			{/each}
		</div>
	</section>
</main>

<!-- O container tem altura extra (200vh) para permitir o tempo de scroll -->
<section class="scrolly-container" bind:this={container}>
  <div class="sticky-wrapper">
    
    <!-- Camada do Gráfico (Fica ao fundo) -->
    <div class="chart-layer" style="opacity: {chartOpacity}">
      <EmotionLineChart />
    </div>

    <!-- Camada de Texto (Fica na frente e desaparece) -->
    <div 
      class="text-overlay" 
      style="opacity: {textOpacity}; pointer-events: {textOpacity <= 0.1 ? 'none' : 'all'}"
    >
      <div class="content-box">
        <h3>El Espectro Emocional</h3>
        
        <p>
          La clasificación se basa en el marco propuesto por 
          <a href="https://www.paulekman.com/wp-content/uploads/2013/07/An-Argument-For-Basic-Emotions.pdf" target="_blank" rel="noopener noreferrer">
            <strong>Paul Ekman (1992)</strong>
          </a>,
          cuyas investigaciones demostraron que estas seis emociones básicas son universales, 
          reconocibles en diferentes culturas y se expresan mediante patrones fisiológicos y 
          conductuales distintivos.
        </p>

        <div class="emotions-legend">
          {#each emotions as emotion}
            <div class="emotion-item">
              <span class="color-dot" style="background-color: {emotion.color}"></span>
              <span class="emotion-label" style="color: {emotion.color}">{emotion.label}</span>
            </div>
          {/each}
        </div>

        <div class="scroll-hint">
          <span>↓ Desplázate para explorar los datos</span>
        </div>
      </div>
    </div>

  </div>
</section>

<section class="viz-section">
  <EmotionLineChart data={emotionData} />
</section>

<section class="viz-section">
  <EmotionRibbonChart data={ribbonData} />
</section>

<section class="viz-section">
  <ValenceActivationChart data={valenceData} />
</section>

<section class="viz-section">
  <ValenceActivationScatter data={scatterData} />
</section>


<style>
  :global(body) {
		margin: 0;
		background-color: #f8f2df;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
	}

	main {
		max-width: 900px;
		margin: 0 auto;
		padding: 4rem 2rem;
		font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
		color: #333;
	}

	h1 {
		font-size: 3rem;
		margin-bottom: 0.5rem;
		letter-spacing: -1px;
	}

  .intro {
    max-width: 680px;
    margin: 120px auto 140px auto;
    padding: 0 20px;
  }

  .intro-title {
    font-size: 52px;
    line-height: 1.15;
    font-weight: 700;
    margin-bottom: 24px;
  }

  .intro-subtitle {
    font-size: 22px;
    line-height: 1.4;
    font-weight: 400;
    color: #444;
    margin-bottom: 18px;
  }

  .intro-kicker {
    font-size: 15px;
    font-style: italic;
    color: #777;
    margin-bottom: 40px;
  }

  .intro-text {
    font-size: 17px;
    line-height: 1.65;
    margin-bottom: 18px;
    color: #222;
  }

  .intro {
    animation: fade-in 800ms ease-out both;
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

  .intro-text strong {
    font-weight: 600;
  }

  @media (max-width: 640px) {
    .intro {
      margin: 80px auto 100px auto;
    }

    .intro-title {
      font-size: 36px;
    }

    .intro-subtitle {
      font-size: 18px;
    }

    .intro-text {
      font-size: 16px;
    }
  }

  /* Sección de Estudio */
	.study-details {
		margin-top: 0rem;
		padding-top: 3rem;
		border-top: 1px solid #e0e0e0;
	}

	.stats-container {
		text-align: center;
		margin-bottom: 4rem;
	}

	.stats-container h2 {
		font-size: 2rem;
		margin-bottom: 1rem;
	}

	.highlight-text {
		font-size: 1.2rem;
		margin-bottom: 2.5rem;
	}

	.numbers-grid {
		display: flex;
		justify-content: center;
		gap: 4rem;
		margin-bottom: 2.5rem;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.count {
		font-size: 4rem;
		font-weight: 800;
		color: #e63946;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.label {
		text-transform: uppercase;
		font-size: 0.85rem;
		letter-spacing: 2px;
		margin-top: 0.5rem;
		color: #555;
	}

	.methodology {
		font-size: 1rem;
		color: #666;
		max-width: 600px;
		margin: 0 auto;
		line-height: 1.5;
	}

	/* Grid de Imágenes */
	.divas-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
		gap: 2rem 1.5rem;
		justify-content: center;
	}

	.diva-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		transition: transform 0.2s ease;
	}

	.diva-card:hover {
		transform: translateY(-5px) scale(1.05);
	}

	.image-wrapper {
		width: 100px;
		height: 100px;
		margin-bottom: 0.75rem;
		border-radius: 50%;
		overflow: hidden;
		box-shadow: 0 4px 10px rgba(0,0,0,0.1);
	}

	.diva-card img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.diva-name {
		font-size: 0.75rem;
		font-weight: 600;
		color: #444;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}


  .viz-section {
    max-width: 100%;
    margin: 0 auto 0 auto;
  }

  /* Container alto para gerar espaço de scroll */
  .scrolly-container {
    height: 150vh; /* Ajuste se quiser que demore mais ou menos para o texto sumir */
    position: relative;
    margin-bottom: 4rem;
  }

  /* Área que fica fixa na tela */
  .sticky-wrapper {
    position: sticky;
    top: 0;
    height: 100vh;
    width: 100%;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* Posicionamento absoluto para sobrepor as camadas */
  .chart-layer, .text-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transition: opacity 0.1s linear; /* Transição suave */
  }

  /* Estilos do Texto */
  .text-overlay {
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10;
    background: rgba(255, 255, 255, 0.85); /* Fundo branco semi-transparente */
    backdrop-filter: blur(5px); /* Efeito de vidro */
  }

  .content-box {
    max-width: 600px;
    padding: 2rem;
    text-align: center;
  }

  h3 {
    font-size: 2rem;
    margin-bottom: 1.5rem;
    color: #333;
  }

  p {
    font-size: 1.1rem;
    line-height: 1.6;
    color: #555;
    margin-bottom: 2rem;
  }

  /* Grid das emoções */
  .emotions-legend {
    display: grid;
    grid-template-columns: repeat(3, 1fr); /* 3 colunas */
    gap: 1rem;
    margin-bottom: 3rem;
  }

  .emotion-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-weight: bold;
    font-size: 1rem;
  }

  .color-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
  }

  /* Dica de scroll */
  .scroll-hint {
    font-size: 0.9rem;
    color: #999;
    animation: bounce 2s infinite;
    margin-top: 2rem;
  }

  .content-box a {
    color: #e63946;
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .content-box a:hover {
    color: #333; /* Fica escuro ao passar o mouse */
    background-color: rgba(230, 57, 70, 0.1); /* Sutil fundo ao passar o mouse */
  }

  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
    40% {transform: translateY(-10px);}
    60% {transform: translateY(-5px);}
  }
</style>