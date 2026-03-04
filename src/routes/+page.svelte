<script>
  import { onMount, tick } from "svelte";
  import { fade } from 'svelte/transition';
  import { csv } from "d3-fetch";
  import { gsap } from 'gsap';
 
  import EmotionLineChart from "$lib/EmotionLineChart.svelte";
  import EmotionRibbonChart from "$lib/EmotionRibbonChart.svelte";
  import ValenceActivationChart from "$lib/ValenceActivationLine.svelte";
  import ValenceActivationScatter from "$lib/ValenceActivationScatter.svelte";
  import ComparisonChart from "$lib/ComparisonChart.svelte";

  import { emotions, divas } from '$lib/config.js';
  import { base } from '$app/paths';


  let windowWidth = 1300;
  let showWarning = true;

  let emotionData = [];
  let valenceData = [];
  let scatterData = [];
  let albumsData = [];
  let selectedDiva = null;
  let lastSelectedDiva = null; // Para guardar qual era a diva antes de fechar
  let lastScrollPosition = 0;
  let metodoAberto = false;

  let tooltipVisible = false;
  let tooltipX = 0;
  let tooltipY = 0;

  function showPromptTooltip(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    tooltipX = rect.left - 12;
    tooltipY = rect.top + rect.height / 2;
    tooltipVisible = true;
  };

  function hidePromptTooltip() {
    tooltipVisible = false;
  };


  function getGridColumns() {
    if (typeof window === 'undefined') return 11;
    const width = window.innerWidth;
    const containerWidth = Math.min(1300, width - 40);
    return Math.floor(containerWidth / 105);
  }

  let gridColumns = 11;


  let windowHeight = 0;

  onMount(() => {
    windowHeight = window.innerHeight;
    windowWidth = window.innerWidth;
    
    // Atualiza se a janela for redimensionada
    const handleResize = () => windowHeight = window.innerHeight;
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });


  $: videoOpacity = windowHeight > 0 && scrollY < windowHeight * 0.8 ? 0.85 : 0;



  onMount(async () => {
    emotionData = await csv(
      `${base}/data/graph_linha_media_emocoes_decade.csv`,
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

    valenceData = await csv(
      `${base}/data/graph_media_valencia_activacion_decade.csv`,
      d => ({
        decade: +d.decade,
        valence: +d.valencia,
        activation: +d.activacion
      })
    );

    scatterData = await csv(
      `${base}/data/graph_scatter_valencia_activacion.csv`,
      d => ({
        year: +d.release_year,
        valence: +d.valencia,
        activation: +d.activacion,
        dominant_emotion: d.emocion_principal,
        intensity: +d.intensity,
        artist: d.diva_name,
        track: d.name,
        album: d.album_name,
        album_image_url: d.album_image_url,
        emocion_alegría: +d.emocion_alegria,
        emocion_tristeza: +d.emocion_tristeza,
        emocion_ira: +d.emocion_ira,
        emocion_miedo: +d.emocion_miedo,
        emocion_sorpresa: +d.emocion_sorpresa,
        emocion_asco: +d.emocion_asco
      })
    );

    albumsData = await csv(`${base}/data/albums.csv`, d => ({
      diva_name: d.diva_name,
      album_name: d.album_name,
      release_year: +d.release_year,
      album_image_url: d.album_image_url
    }));

      // Calcula as colunas do grid
    gridColumns = getGridColumns();
    
    // Recalcula quando a janela é redimensionada
    const handleResize = () => {
      gridColumns = getGridColumns();
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };

  });

  const promptGemini = `Eres un analista de letras musicales. Responde en español.
  Proporciona un JSON con los siguientes campos:

  {"temas_principales": [máximo 3 palabras clave, separadas por comas],
    "emocion_alegria": [intensidad de 0 a 1],
    "emocion_tristeza": [intensidad de 0 a 1],
    "emocion_miedo": [intensidad de 0 a 1],
    "emocion_ira": [intensidad de 0 a 1],
    "emocion_sorpresa": [intensidad de 0 a 1],
    "emocion_asco": [intensidad de 0 a 1],
    "emocion_principal": ["alegría", "tristeza", "miedo", "ira", "sorpresa" o "asco", según la intensidad más alta],
    "resumen": [breve descripción de la letra en máximo 50 palabras],
    "tono_general": ["positivo", "neutro" o "negativo", según predominancia emocional],
    "energia_emocional": ["baja", "media" o "alta", según la intensidad combinada],
    "valencia": [valor entre -1 y 1; negativo = emociones desagradables, positivo = agradables, según el Modelo Circumplejo de Afecto (Russell, 1980)],
    "activacion": [valor entre -1 y 1; negativo = calma, positivo = energía/intensidad, según el Modelo Circumplejo de Afecto (Russell, 1980)]}
  
    Reglas:
  - Usa valores numéricos con punto decimal entre 0 y 1 SOLO para las emociones básicas.
  - Usa valores con punto decimal entre -1 y 1 SOLO para valencia y activación.
  - No añadas explicaciones ni texto fuera del JSON.
  - Sé conciso y directo.`;



  // Número de canciones únicas
  $: totalCanciones = scatterData.length;

  // Número de divas únicas
  $: totalDivas = scatterData.length > 0 
    ? new Set(scatterData.map(d => d.artist)).size 
    : 0;

  // Número de álbumes únicos (usa albumsData que já está importado)
  $: totalAlbumes = albumsData.length > 0
    ? new Set(albumsData.map(d => `${d.diva_name}__${d.album_name}`)).size
    : 0;


  
  // Determina se deve mostrar os álbuns antes desta diva
  function shouldShowAlbumsBefore(currentIndex) {
    if (!selectedDiva) return false;
    
    const selectedIndex = divas.findIndex(d => d.name === selectedDiva);
    if (selectedIndex === -1) return false;
    
    // Calcula em qual linha está cada diva
    const selectedRow = Math.floor(selectedIndex / gridColumns);
    const currentRow = Math.floor(currentIndex / gridColumns);

    // Calcula o total de linhas
    const totalRows = Math.ceil(divas.length / gridColumns);
    const isSelectedInLastRow = selectedRow === totalRows - 1;

    // Se a diva selecionada está na última linha, não mostra aqui
    if (isSelectedInLastRow) return false;
    
    // Mostra os álbuns no início da linha SEGUINTE à linha da diva selecionada
    const nextRowFirstIndex = (selectedRow + 1) * gridColumns;
    
    return currentIndex === nextRowFirstIndex;
  };

  // Função para verificar se está na última linha
  function isLastRow(index) {
    if (index === -1) return false;
    
    const totalRows = Math.ceil(divas.length / gridColumns);
    const divaRow = Math.floor(index / gridColumns);
    
    return divaRow === totalRows - 1;
  };


  let scrollY = 0;
  let container;
  let textOpacity = 1;
  let chartOpacity = 0.3;

  // CONTROLE DO RIBBON CHART
  let ribbonContainer;
  let ribbonOpacity = 0;

  // Intersection Observer para fade-in quando entra na tela
  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            ribbonOpacity = 1;
          } else {
            ribbonOpacity = 0;
          }
        });
      },
      { threshold: 0.2 } // Aparece quando 20% está visível
    );

    if (ribbonContainer) {
      observer.observe(ribbonContainer);
    }

    return () => observer.disconnect();
  });


  // Função para normalizar nomes de divas
  function normalizeDivaName(name) {
    const map = {
      "Charli XCX": "Charli xcx",
      "Rosalía": "ROSALÍA"
    };
    return map[name] || name;
  };

  // Função para scroll suave até a seção de álbuns
  async function scrollToAlbums() {
    await tick();
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const albumsSection = document.querySelector('.albums-expanded');
    if (!albumsSection) return;
    
    const rect = albumsSection.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    
    // Calcula quanto da seção está visível
    const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
    const totalHeight = rect.height;
    const visiblePercentage = (visibleHeight / totalHeight) * 100;
    
    // Só faz scroll se menos de 80% da seção estiver visível
    if (visiblePercentage < 80 || rect.top < 0) {
      // Centraliza a seção na viewport com uma margem confortável
      const targetScroll = window.pageYOffset + rect.top - (windowHeight * 0.15);
      
      window.scrollTo({
        top: Math.max(0, targetScroll), // Não rola acima do topo
        behavior: 'smooth'
      });
    }
  };


  // Função para scroll de volta para a diva
  async function scrollBackToDiva(divaName) {
    if (!divaName) return;
    
    await tick();
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const divaCard = document.querySelector(`[data-diva="${divaName}"]`);
    if (!divaCard) return;
    
    const rect = divaCard.getBoundingClientRect();
    const absoluteTop = window.pageYOffset + rect.top;
    
    // Calcula a posição ideal (centralizada na viewport)
    const viewportCenter = window.innerHeight / 2;
    const targetScroll = absoluteTop - viewportCenter + (rect.height / 2);
    
    window.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth'
    });
  };

  // Função para fechar e voltar
  function closeDivaSection() {
    if (selectedDiva) {
      lastSelectedDiva = selectedDiva;
      selectedDiva = null;
      scrollBackToDiva(lastSelectedDiva);
    }
  };


  // Função para lidar com o clique na diva
  async function handleDivaClick(divaName) {
    if (selectedDiva === divaName) {
      closeDivaSection();
    } else {
      selectedDiva = divaName;
      scrollToAlbums();
    }
  };


  // Função reativa para obter álbuns da diva selecionada
  $: selectedAlbums = selectedDiva && albumsData.length > 0
    ? albumsData.filter(album => album.diva_name === normalizeDivaName(selectedDiva))
    : [];

  // Função para encontrar o índice da diva selecionada
  $: selectedDivaIndex = selectedDiva 
    ? divas.findIndex(d => d.name === selectedDiva)
    : -1;

  $: selectedDivaPosition = selectedDiva && typeof window !== 'undefined' 
    ? getDivaPosition(selectedDiva)
    : { x: 0, y: 0 };

  function getDivaPosition(divaName) {
    const divaIndex = divas.findIndex(d => d.name === divaName);
    if (divaIndex === -1) return { x: 0, y: 0 };
    
    const element = document.querySelector(`[data-diva="${divaName}"]`);
    if (!element) return { x: 0, y: 0 };
    
    const rect = element.getBoundingClientRect();
    const container = element.closest('.divas-grid');
    const containerRect = container?.getBoundingClientRect() || { left: 0, top: 0 };
    
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  };


  // função reativa para atualizar o scroller da seção de universo analisado
  $: universoOpacity = Math.min(1, Math.max(0, (scrollY - 1400) / 250));
  $: universoTranslate = Math.max(0, 30 - (scrollY - 1400) / 10);

</script>


<svelte:window bind:scrollY bind:innerWidth={windowWidth} />

  {#if windowWidth < 1280 && showWarning}
    <div class="mobile-warning">
      <span class="mobile-icon">🖥️</span>
      <p>Este sitio está optimizado para pantallas más grandes.</p>
      <p>Para una mejor experiencia, ábrelo en un ordenador o tablet.</p>
      <button on:click={() => showWarning = false}>Continuar de todas formas</button>
    </div>
  {/if}

  <video
    autoplay loop muted playsinline
    style="
      opacity: {videoOpacity};
      transition: opacity 0.5s ease;
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      mix-blend-mode: screen;
      pointer-events: none;
      z-index: 10;
    "
    id="paparazzi-video"
  >
    <source src="{base}/flare.mp4" type="video/mp4" />
  </video>

<!-- HERO: título com fade out no scroll -->
<section class="hero" style="opacity: {Math.max(0, 1 - scrollY / 400)};">

  <p style="position:fixed; top:0; left:0; z-index:9999; background:red; color:white;">
  width: {windowWidth}
</p>

  <div class="hero-content">
    <h1 class="hero-title">
      ¿Cómo se volvió emocionalmente<br>más complejo<br>el pop de las <span class="diva-word">divas</span>?
    </h1>
    <h2 class="hero-subtitle">
      Cómo las canciones pasaron de emociones dominantes<br>a paisajes emocionales complejos
    </h2>
    <p class="hero-kicker">
      Un análisis visual de letras y emociones en el pop femenino desde los años 70 hasta hoy
    </p>
    <div class="hero-scroll-hint">↓</div>
  </div>
</section>

<!-- INTRO: texto aparece em fluxo normal depois do hero -->
<section class="intro-scrolly">
  <div class="intro-sticky">

    <div class="intro-box" style="opacity: {Math.min(1, Math.max(0, (scrollY - 400) / 200))}; transform: translateY({Math.max(0, 30 - (scrollY - 400) / 10)}px);">
      
      <h2 class="intro-heading">El arte de ser diva</h2>

      <p class="intro-text">
        La música pop funciona como el idioma universal de las masas y busca la inmediatez
        mediante melodías diseñadas para infiltrarse en la memoria colectiva.
        Es un género que no solo aspira a ser escuchado, sino a definir el momento cultural de cada época.
      </p>

      <p class="intro-text">
        Sin embargo, el estatus de <strong>Diva Pop</strong> exige mucho más que simples éxitos de radio.
        Estas figuras son fenómenos culturales capaces de llenar estadios, generar ventas millonarias
        y protagonizar espectáculos monumentales. Su rasgo distintivo es la capacidad de conectar
        profundamente con un fandom inquebrantable que sigue cada uno de sus pasos.
      </p>

      <p class="intro-text">
        El núcleo de esa conexión reside en las letras. Las divas utilizan sus canciones para narrar
        sus momentos vitales y exponer sus sentimientos más íntimos. Sus temas actúan como espejos
        donde millones de personas ven reflejadas sus propias vivencias y emociones.
      </p>

      <p class="intro-text">
        Este análisis explora precisamente esa evolución sentimental a lo largo de las décadas.
        Los datos confirman que las letras del pop femenino han dejado de centrarse en mensajes
        simples para volverse emocionalmente más diversas y capaces de capturar toda la complejidad
        de la experiencia humana moderna.
      </p>

      <div class="intro-scroll-hint">↓</div>
    </div>

  </div>
</section>



<main>
  <section class="universo-scrolly">
    <div class="universo-sticky">
      <div class="universo-box" style="opacity: {universoOpacity}; transform: translateY({universoTranslate}px);">

        <p class="intro-heading">El universo analizado</p>

        <p class="universo-desc">
          Para entender esta evolución, nos sumergimos en la discografía de <strong>{totalDivas} iconos del pop</strong>.
        </p>

        <div class="numbers-grid">
          <div class="stat-item">
            <span class="count">{totalDivas}</span>
            <span class="label">Divas Pop</span>
          </div>
          <div class="stat-item">
            <span class="count">{totalAlbumes}</span>
            <span class="label">Álbumes</span>
          </div>
          <div class="stat-item">
            <span class="count">{totalCanciones}</span>
            <span class="label">Canciones</span>
          </div>
        </div>

        <p class="methodology">
          Cada una de estas letras fue analizada individualmente utilizando el
          <strong>Gemini 2.5 Pro</strong>, permitiendo una interpretación profunda de los matices
          emocionales y temáticos de cada composición.
        </p>

        <div class="divas-grid">
          {#each divas as diva, index}
            {#if selectedDiva && shouldShowAlbumsBefore(index)}
              <div class="albums-expanded" style="grid-column: 1 / -1;">
                <div class="albums-container">
                  <button class="close-button" on:click={closeDivaSection}>✕</button>
                  <h3 class="albums-title">{selectedDiva}</h3>
                  <div class="albums-grid">
                    {#each selectedAlbums as album, albumIndex}
                      <div class="album-card" style="animation-delay: {albumIndex * 0.05}s">
                        <div class="album-cover">
                          <img src={album.album_image_url} alt="Capa do álbum {album.album_name}" loading="lazy" on:error={(e) => e.target.src = '/placeholder-album.png'} />
                        </div>
                        <div class="album-info">
                          <p class="album-name">{album.album_name}</p>
                          <p class="album-year">{album.release_year}</p>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            {/if}

            <div class="diva-card" class:selected={selectedDiva === diva.name} data-diva={diva.name}>
              <button class="diva-button" on:click={() => handleDivaClick(diva.name)} aria-label="Ver álbumes de {diva.name}">
                <div class="image-wrapper">
                  <img src={`${base}/artists/${diva.file}`} alt="Foto de {diva.name}" loading="lazy" />
                </div>
                <span class="diva-name">{diva.name}</span>
              </button>
            </div>
          {/each}

          {#if selectedDiva && isLastRow(divas.findIndex(d => d.name === selectedDiva))}
            <div class="albums-expanded" style="grid-column: 1 / -1;">
              <div class="albums-container">
                <button class="close-button" on:click={() => selectedDiva = null}>✕</button>
                <h3 class="albums-title">{selectedDiva}</h3>
                <div class="albums-grid">
                  {#each selectedAlbums as album, albumIndex}
                    <div class="album-card" style="animation-delay: {albumIndex * 0.05}s">
                      <div class="album-cover">
                        <img src={album.album_image_url} alt="Capa do álbum {album.album_name}" loading="lazy" on:error={(e) => e.target.src = '/placeholder-album.png'} />
                      </div>
                      <div class="album-info">
                        <p class="album-name">{album.album_name}</p>
                        <p class="album-year">{album.release_year}</p>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/if}
        </div>

      </div>
    </div>
  </section>

</main>

<section class="scrolly-container" bind:this={container}>
  <div class="sticky-wrapper">
    <div class="chart-layer" style="opacity: {chartOpacity}">
    </div>

    <div 
      class="text-overlay" 
      style="opacity: {textOpacity}; pointer-events: {textOpacity <= 0.1 ? 'none' : 'all'}"
    >
      <div class="content-box">
        <p class="intro-heading">El Espectro Emocional</p>
        
        <div class="spacer"></div>
        
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

        <div class="scale-explainer">
        <p class="scale-note">
          Cada emoción se mide de forma <strong>independiente</strong>, en una escala de 
          <strong>0 a 1</strong>: dónde <strong>0</strong> es ausencia total y <strong>1</strong> 
          es intensidad máxima. Una canción puede expresar, por ejemplo, alegría intensa y tristeza 
          intensa al mismo tiempo. Las emociones <strong>no suman 100%</strong>.
        </p>
      </div>

        

        <div class="spacer"></div>
        <div class="intro-scroll-hint">↓</div>

      </div>
    </div>
  </div>
</section>

<!-- Gráficos  -->
<section class="viz-section line-chart-section">
  <EmotionLineChart data={emotionData} />
</section>

<section class="ribbon-section" bind:this={ribbonContainer}>
  <div style="opacity: {ribbonOpacity}; transition: opacity 0.3s ease;">
    <EmotionRibbonChart data={emotionData} />
  </div>
</section>

<!-- MODELO CIRCUMPLEJO  -->
<section class="scrolly-container" bind:this={container}>
  <div class="sticky-wrapper">
    <div class="chart-layer" style="opacity: {chartOpacity}">
    </div>

    <div 
      class="text-overlay" 
      style="opacity: {textOpacity}; pointer-events: {textOpacity <= 0.1 ? 'none' : 'all'}"
    >
      <div class="content-box">
        <p class="intro-heading">Más allá de las etiquetas:<br>Valencia y Activación</p>
        
        <div class="spacer"></div>

        <p>
          El <a href="https://psycnet.apa.org/doi/10.1037/h0077714" target="_blank" rel="noopener noreferrer">
            <strong>Modelo Circumplejo del Afecto (Russell, 1980)</strong>
          </a>
          propone que las emociones no son categorías fijas, sino posiciones dentro de un espacio
          bidimensional continuo. Cada canción puede ser ubicada según dos coordenadas fundamentales, medidas en una escala que va de –1 a 1.
        </p>

        <div class="dimensions-legend">
          <div class="dimension-item">
            <span class="color-dot" style="background-color: #4b62d2; width: 16px; height: 16px;"></span>
            <div class="dimension-text">
              <span class="dimension-label" style="color: #4b62d2">Valencia</span>
              <span class="dimension-desc">Cuán agradable o desagradable es la emoción expresada.</span>
              <span class="dimension-desc">–1 indica máxima negatividad y 1 máxima positividad.</span>
            </div>
          </div>
          <div class="dimension-item">
            <span class="color-dot" style="background-color: #db2d61; width: 16px; height: 16px;"></span>
            <div class="dimension-text">
              <span class="dimension-label" style="color: #db2d61">Activación</span>
              <span class="dimension-desc">El nivel de energía o intensidad de la emoción.</span>
              <span class="dimension-desc">–1 indica baja energía (calma) y 1 alta intensidad (excitación).</span>
            </div>
          </div>
        </div>

        <p>
          Este enfoque permite comparar canciones, artistas y décadas con mayor matiz,
          capturando la complejidad emocional que las etiquetas simples no pueden revelar.
        </p>
        
        <div class="intro-scroll-hint">↓</div>
      </div>
    </div>
  </div>
</section>



<section class="viz-section">
  <ValenceActivationChart data={valenceData} />
</section>

<section class="viz-section scatter-section">
  <ValenceActivationScatter data={scatterData} />
</section>

<section class="viz-section comparison-section">
  <ComparisonChart data={scatterData} />
</section>

<section class="cierre-scrolly">
  <div class="cierre-sticky">
    <div class="cierre-box">

      <h2 class="cierre-heading">
        El pop de las divas se volvió más complejo porque <em>ellas</em> se volvieron más complejas.
      </h2>
      <p class="cierre-text">
        Las letras del pop femenino han experimentado una transformación 
        profunda a lo largo de las décadas. Las canciones de los años 70 y 80 tendían a concentrarse 
        en una emoción dominante, generalmente alegría o tristeza, con poca ambiguedad emocional.
      </p>
      <p class="cierre-text">
        A partir de los años 90, y de forma acelerada en el siglo XXI, las letras pasaron a habitar 
        territorios emocionales simultáneos, alegres y melancólicas al mismo tiempo, furiosas y 
        vulnerables. Esta complejidad refleja cómo las divas comenzaron a usar su música como un 
        diario emocional sin filtros. El pop femenino apostó por la <strong>autenticidad emocional</strong> 
        como su mayor activo.
      </p>

      <!-- Botão metodologia -->
      <button 
        class="metodologia-toggle" 
        on:click={() => metodoAberto = !metodoAberto}
        aria-expanded={metodoAberto}
      >
        <span>{metodoAberto ? '−' : '+'}</span>
        ¿Cómo se recopilaron y analizaron los datos?
      </button>

      <!-- Overlay por cima -->
      {#if metodoAberto}
        <div class="metodologia-overlay" transition:fade={{ duration: 250 }}>
          <button class="metodologia-close" on:click={() => metodoAberto = false}>✕</button>
          <p class="cierre-label">Metodología</p>
          <div class="metodologia-grid">
            {#each [
              { num: '01', title: 'Selección de artistas', text: 'Se identificaron 31 divas del pop con trayectorias relevantes desde los años 70 hasta hoy, considerando impacto cultural, ventas, presencia en charts y reconocimiento crítico.' },
              { num: '02', title: 'Recopilación de discografía', text: 'Los datos de álbumes y canciones fueron obtenidos a través de la API de Spotify, incluyendo metadatos de fecha de lanzamiento y características de audio.' },
              { num: '03', title: 'Extracción de letras', text: 'Las letras de las 3.074 canciones fueron recopiladas mediante Genius API, filtrando canciones sin letra disponible.' },
              { num: '04', title: 'Análisis emocional con IA', text: 'Cada letra fue analizada con Gemini 2.5 Pro, aplicando el marco de Ekman (1992) y el Modelo Circumplejo de Russell (1980), obteniendo valores de 0 a 1 para cada emoción, y -1 a 1 para la valencia y activación.' },
              { num: '05', title: 'Visualización', text: 'Los datos fueron procesados en Python y visualizados con D3.js y Svelte, priorizando una narrativa scrollytelling interactiva.' },
              { num: '06', title: 'Limitaciones', text: 'Canciones con menos 60s de duración fueron excluidas. La IA puede no capturar todos los matices culturales.' },
            ] as step}
              <div class="metodo-step">
                <span class="metodo-num">{step.num}</span>
                <h4>{step.title}</h4>
                {#if step.num === '04'}
                  <p>
                    Cada letra fue analizada con
                    <strong
                      class="gemini-trigger"
                      on:mouseenter={showPromptTooltip}
                      on:mouseleave={hidePromptTooltip}
                    >Gemini 2.5 Pro</strong>,
                    aplicando el marco de Ekman (1992) y el Modelo Circumplejo de Russell (1980).
                  </p>
                {:else}
                  <p>{step.text}</p>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if tooltipVisible}
        <div
          class="prompt-tooltip"
          style="left: {tooltipX}px; top: {tooltipY}px;"
          transition:fade={{ duration: 150 }}
        >
          <span class="prompt-label">Prompt utilizado:</span>
          <pre class="prompt-code">{promptGemini}</pre>
        </div>
      {/if}

      <!-- Créditos -->
      <div class="cierre-creditos">
        <p class="cierre-creditos-text">
          Trabajo Final de Máster · <strong>Visualización de Datos y Diseño de Información</strong> · 
          <a href="https://weareshifta.com/formaciones/master-online-en-visualizacion-de-datos-y-diseno-de-la-informacion/" target="_blank" rel="noopener noreferrer">SHIFTA</a> · 2026
        </p>
        <p class="cierre-creditos-text">
          Por <a href="https://www.linkedin.com/in/alexmartt/" target="_blank" rel="noopener noreferrer">Alexandre Oliveira</a>
        </p>
      </div>

    </div>
  </div>
  
</section>

<style>

  :global(body) {
    margin: 0;
    background-color: #f8f2df;
    overflow-x: hidden;
    font-family: 'Merriweather', Georgia, 'Times New Roman', serif; /* texto corrido */
  }

  .mobile-warning {
    position: fixed;
    inset: 0;
    background: rgba(248, 242, 223, 0.97);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2rem;
    gap: 1rem;
  }

  .mobile-icon {
    font-size: 3rem;
  }

  .mobile-warning p {
    font-family: 'Merriweather', serif;
    font-size: 1rem;
    color: #333;
    max-width: 320px;
    line-height: 1.6;
    margin: 0;
  }

  .mobile-warning button {
    margin-top: 1rem;
    background: none;
    border: 1.5px solid #c9587a;
    color: #c9587a;
    font-family: 'Poppins', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.6rem 1.4rem;
    border-radius: 30px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .mobile-warning button:hover {
    background: #c9587a;
    color: white;
  }


  main {
    max-width: 100%;
    margin: 0 auto;
    padding: 0;
    font-family: 'Merriweather', Georgia, 'Times New Roman', serif;
    color: #333;
  }

  .spacer {
    height: 1.5rem;
  }

  h1,
  h2,
  .hero-title,
  .intro-heading,
  .cierre-heading,
  .cierre-label,
  .label,
  .count,
  .diva-name,
  .album-name,
  .metodo-num,
  .metodo-step h4,
  .metodologia-toggle,
  .albums-title {
    font-family: 'Poppins', 'Helvetica Neue', Arial, sans-serif;
  }



  h1 {
    font-size: 3rem;
    margin-bottom: 0.5rem;
    letter-spacing: -1px;
  }

 
  /* =====================
    HERO FULLSCREEN
    ===================== */

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

  .hero {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: sticky;
    top: 0;
    z-index: 0;
    pointer-events: none; /* não bloqueia o scroll */
    overflow: visible;
    isolation: auto;
  }

  .hero-content {
    position: relative;
    z-index: 1;
    max-width: 760px;
    padding: 0 2rem;
    text-align: center;
    animation: fade-in 800ms ease-out both;
  }

  .hero-title {
    font-size: clamp(2.2rem, 5.5vw, 4rem);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -1.5px;
    color: #c9587a;
    margin-bottom: 1.2rem;
    animation: fade-in 800ms ease-out both;
    -webkit-text-stroke-width: 0.5px;
    -webkit-text-stroke-color: #1a1a1a;
  }

  .diva-word {
    background: linear-gradient(
      90deg,
      #c9587a 0%,
      #e8829a 20%,
      #f7c5d0 40%,
      #ffffff 50%,
      #f7c5d0 60%,
      #e8829a 80%,
      #c9587a 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 3s linear infinite;
    display: inline-block;
  }

  @keyframes shimmer {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
  }


  .hero-subtitle {
    font-size: clamp(1.1rem, 2.2vw, 1.5rem);
    font-weight: 400;
    line-height: 1.4;
    color: #555;
    margin-bottom: 1rem;
    animation: fade-in 800ms ease-out both;
  }

  .hero-kicker {
    font-size: 0.95rem;
    color: #999;
    margin-bottom: 2.5rem;
    animation: fade-in 800ms ease-out both;
  }

  .hero-scroll-hint {
    font-size: 1.8rem;
    color: #bbb;
    animation: bounce 2s infinite;
  }

  /* =====================
    INTRO STICKY
    ===================== */

  .intro-scrolly {
    height: 160vh;
    position: relative;
  }

  .intro-sticky {
    position: sticky;
    top: 0;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f8f2df;
    z-index: 1;
  }

  .intro-box {
    max-width: 640px;
    padding: 0 2rem;
    will-change: opacity, transform;
  }

  .intro-heading {
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 750;
    letter-spacing: -1px;
    line-height: 1.1;
    color: #1a1a1a;
    margin-bottom: 2rem;
  }

  .intro-text {
    font-size: 1.1rem;
    line-height: 1.75;
    color: #333;
    margin-bottom: 1.4rem;
  }

  .intro-text strong {
    font-weight: 700;
    color: #1a1a1a;
  }

  .intro-scroll-hint {
    font-size: 1.5rem;
    color: #bbb;
    margin-top: 2rem;
    animation: bounce 2s infinite;
    text-align: center;
  }


  /* =====================
    UNIVERSO ANALIZADO
    ===================== */

  .universo-scrolly {
    height: 180vh;
    position: relative;
  }

  .universo-sticky {
    position: sticky;
    top: 0;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f8f2df;
    z-index: 1;
    overflow-y: auto; /* permite scroll interno se o conteúdo for maior */
    padding: 0 2rem;
  }

  .universo-box {
    width: 100%;
    max-width: 1200px;
    padding: 2rem 2rem 1rem;
    will-change: opacity, transform;
    text-align: center;
  }

  .universo-desc {
    font-size: 1.1rem;
    color: #444;
    margin-bottom: 1.5rem;
  }

  .image-wrapper {
    width: 100px;
    height: 100px;
    margin-bottom: 0.4rem;
    border-radius: 50%;
    overflow: hidden;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
  }

  .diva-name {
    font-size: 0.5rem;
    font-weight: 600;
    color: #444;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: color 0.3s ease, opacity 0.3s ease;
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
    font-size: 3rem;
    font-weight: 800;
    color: #e63946;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .label {
    text-transform: uppercase;
    font-size: 0.8rem;
    letter-spacing: 2px;
    margin-top: 0.5rem;
    color: #555;
  }

  .methodology {
    font-size: 1rem;
    color: #666;
    max-width: 700px;
    margin: 0 auto;
    line-height: 1.5;
  }

  .divas-grid {
    display: grid;
    grid-template-columns: repeat(11, 1fr);
    gap: 1.2rem 0.8rem;
    justify-content: center;
    margin-top: 1.5rem;
    width: 100%;
  }


  .diva-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    transition: transform 0.2s ease;
  }

  .diva-card.selected {
    transform: scale(1.1);
  }

  .diva-card:hover {
    transform: translateY(-5px) scale(1.05);
  }

  .diva-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: transform 0.2s ease;
  }

  .image-wrapper {
    width: 80px;
    height: 80px;
    margin-bottom: 0.4rem;
    border-radius: 50%;
    overflow: hidden;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
  }

  .diva-button:hover .image-wrapper {
    box-shadow: 0 6px 20px rgba(230, 57, 70, 0.3);
  }

  .diva-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: filter 0.3s ease, transform 0.3s ease;
  }

  /* Quando há uma diva selecionada, todas ficam em P&B */
  .divas-grid:has(.diva-card.selected) .diva-card:not(.selected) img {
    filter: grayscale(100%) brightness(1.1);
    opacity: 0.6;
  }

  /* A diva selecionada mantém as cores vibrantes */
  .diva-card.selected img {
    filter: grayscale(0%) brightness(1.05) contrast(1.1);
    opacity: 1;
  }

  /* Hover nas divas não selecionadas */
  .divas-grid:has(.diva-card.selected) .diva-card:not(.selected):hover img {
    filter: grayscale(80%) brightness(1.05);
    opacity: 0.8;
  }

  /* Reduz a sombra das divas não selecionadas */
  .divas-grid:has(.diva-card.selected) .diva-card:not(.selected) .image-wrapper {
    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
  }

  .diva-name {
    font-size: 0.75rem;
    font-weight: 600;
    color: #444;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: color 0.3s ease, opacity 0.3s ease;
  }

  .divas-grid:has(.diva-card.selected) .diva-card:not(.selected) .diva-name {
    color: #999999;
    opacity: 0.8;
  }

  .diva-card.selected .diva-name {
    color: #e63946;
    font-weight: 700;
  }
  

  /* Estilos para a seção expandida de álbuns */
  .albums-expanded {
    margin: 2rem 0;
    animation: expandFromDiva 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: top center;
  }

  @keyframes expandFromDiva {
    0% {
      opacity: 0;
      transform: scale(0.3) translateY(-100px);
      filter: blur(10px);
    }
    60% {
      opacity: 0.8;
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
      filter: blur(0);
    }
  }

  .albums-container {
    background: white;
    border-radius: 12px;
    padding: 2.5rem 2rem;
    box-shadow: 0 8px 30px rgba(0,0,0,0.12);
    position: relative;
    overflow: hidden;
  }

  .albums-container::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: radial-gradient(circle, rgba(230, 57, 70, 0.1) 0%, transparent 70%);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    animation: rippleExpand 0.6s ease-out;
    z-index: 0;
  }

  @keyframes rippleExpand {
    0% {
      width: 0;
      height: 0;
      opacity: 1;
    }
    100% {
      width: 200%;
      height: 200%;
      opacity: 0;
    }
  }

  .close-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: #e63946;
    color: white;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease, transform 0.2s ease;
    z-index: 10;
    animation: fadeInButton 0.4s ease 0.3s both;
  }

  @keyframes fadeInButton {
    from {
      opacity: 0;
      transform: scale(0) rotate(-180deg);
    }
    to {
      opacity: 1;
      transform: scale(1) rotate(0);
    }
  }

  .close-button:hover {
    background: #d62828;
    transform: scale(1.1) rotate(90deg);
  }

  .albums-title {
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
    color: #333;
    text-align: center;
    position: relative;
    z-index: 1;
    animation: slideInTitle 0.5s ease 0.2s both;
  }

  @keyframes slideInTitle {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .albums-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
    position: relative;
    z-index: 1;
  }

  .album-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    transition: transform 1s ease;
    animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    opacity: 0;
  }

  @keyframes popIn {
    0% {
      opacity: 0;
      transform: scale(0) rotate(-10deg) translateY(50px);
    }
    60% {
      transform: scale(1.1) rotate(5deg);
    }
    100% {
      opacity: 1;
      transform: scale(1) rotate(0) translateY(0);
    }
  }

  .album-card:hover {
    transform: translateY(-8px) scale(1.05);
    z-index: 10;
  }

  .album-cover {
    width: 140px;
    height: 140px;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    margin-bottom: 0.75rem;
    transition: all 0.3s ease;
    position: relative;
  }

  .album-cover::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 30%,
      rgba(255, 255, 255, 0.3) 50%,
      transparent 70%
    );
    transform: translateX(-100%);
    transition: transform 0.6s ease;
  }

  .album-card:hover .album-cover::after {
    transform: translateX(100%);
  }

  .album-card:hover .album-cover {
    box-shadow: 0 6px 20px rgba(0,0,0,0.25);
    transform: scale(1.05);
  }

  .album-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.3s ease;
  }

  .album-card:hover .album-cover img {
    transform: scale(1.1);
  }

  .album-info {
    max-width: 140px;
  }

  .album-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 0.25rem;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .album-year {
    font-size: 0.75rem;
    color: #777;
    margin: 0;
    font-weight: 500;
  }

  .diva-card.selected .image-wrapper {
    box-shadow: 0 0 0 4px #e63946, 0 8px 25px rgba(230, 57, 70, 0.4);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      box-shadow: 0 0 0 4px #e63946, 0 8px 25px rgba(230, 57, 70, 0.4);
    }
    50% {
      box-shadow: 0 0 0 6px #e63946, 0 12px 35px rgba(230, 57, 70, 0.6);
    }
  }

  /* Responsividade */
  @media (max-width: 768px) {
    .albums-grid {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 1rem;
    }

    .album-cover {
      width: 120px;
      height: 120px;
    }

    .album-info {
      max-width: 120px;
    }

    .albums-container {
      padding: 2rem 1.5rem;
    }
  }

  @media (max-width: 480px) {
    .albums-grid {
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 0.75rem;
    }

    .album-cover {
      width: 100px;
      height: 100px;
    }
  }

  .viz-section {
    max-width: 100%;
    margin: 0 auto 0 auto;
  }

  .ribbon-section {
    width: 100%;
    padding: 4rem 0;
  }

  .scrolly-container {
    height: 150vh;
    position: relative;
    margin-bottom: 4rem;
  }

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

  .chart-layer, .text-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transition: opacity 0.1s linear;
  }

  .text-overlay {
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(5px);
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

  .scale-explainer {
    margin: 1.5rem auto 2rem;
    max-width: 560px;
    text-align: left;
  }

  .scale-note {
    font-size: 1rem;
    line-height: 1.65;
    color: #555;
    margin-bottom: 1.5rem;
    border-left: 3px solid #c9587a;
    padding-left: 1rem;
  }


  .emotions-legend {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
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

  .content-box a {
    color: #e63946;
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .content-box a:hover {
    color: #333;
    background-color: rgba(230, 57, 70, 0.1);
  }

  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
    40% {transform: translateY(-10px);}
    60% {transform: translateY(-5px);}
  }

  /* ============================================
   SECCIÓN: El Modelo Circumplejo del Afecto
   ============================================ */
  .dimensions-legend {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    margin: 2rem auto;
    max-width: 480px;
    text-align: left;
  }

  .dimension-item {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }

  .dimension-item .color-dot {
    margin-top: 4px;
    flex-shrink: 0;
    border-radius: 50%;
    display: inline-block;
  }

  .dimension-text {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .dimension-label {
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .dimension-desc {
    font-size: 0.95rem;
    color: #666;
    line-height: 1.4;
  }
  /* ============================================
    FIM: El Modelo Circumplejo del Afecto
    ============================================ */

  .scatter-section {
    position: relative;
    z-index: 2;
  }

  .cierre-scrolly {
    height: 160vh;
    position: relative;
  }

  .cierre-sticky {
    position: sticky;
    top: 0;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f8f2df;
    overflow-y: auto;
  }

  .cierre-box {
    position: relative;
    max-width: 680px;
    width: 100%;
    padding: 3rem 2rem;
    text-align: center;
  }

  .cierre-label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #c9587a;
    margin-bottom: 1rem;
  }

  .cierre-heading {
    font-size: clamp(1.8rem, 3.5vw, 2.6rem);
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -1px;
    color: #1a1a1a;
    margin-bottom: 1.8rem;
  }

  .cierre-heading em {
    font-style: italic;
    color: #c9587a;
  }

  .cierre-text {
    font-size: 1rem;
    line-height: 1.8;
    color: #555;
    margin-bottom: 1.2rem;
    text-align: left;
  }

  /* Botão metodologia */
  .metodologia-toggle {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    margin: 2rem auto 0;
    background: none;
    border: 1.5px solid #c9587a;
    color: #c9587a;
    font-size: 0.9rem;
    font-weight: 700;
    padding: 0.7rem 1.4rem;
    border-radius: 30px;
    cursor: pointer;
    transition: all 0.2s ease;
    letter-spacing: 0.3px;
  }

  .metodologia-toggle:hover {
    background-color: #c9587a;
    color: #fff;
  }

  .metodologia-toggle span {
    font-size: 1.2rem;
    line-height: 1;
    font-weight: 400;
  }

  .metodologia-overlay {
    position: absolute;
    top: 70px;
    left: -30%;
    right: -30%;
    max-height: 80%;
    overflow-y: auto;
    background-color: #f0e8d4;
    border: 1px solid rgba(201, 88, 122, 0.2);
    border-radius: 16px;
    padding: 2rem 2rem 1.5rem;
    z-index: 10;
    text-align: left;
    box-shadow: 0 8px 32px rgba(0,0,0,0.08);
  }


  .metodologia-close {
    position: absolute;
    top: 1.2rem;
    right: 1.2rem;
    background: none;
    border: 1.5px solid rgba(0,0,0,0.15);
    border-radius: 50%;
    width: 32px;
    height: 32px;
    font-size: 0.85rem;
    color: #666;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .metodologia-close:hover {
    background-color: #c9587a;
    color: #fff;
    border-color: #c9587a;
  }

  .metodologia-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.7rem 1rem;
  }

  .metodo-step {
    border-left: 2px solid rgba(201, 88, 122, 0.2);
    padding-left: 1rem;
  }

  .metodo-num {
    font-size: 1.5rem;
    font-weight: 900;
    color: rgba(201, 88, 122, 0.42);
    display: block;
    line-height: 1;
    margin-bottom: 0.2rem;
    letter-spacing: -1px;
  }

  .metodo-step h4 {
    font-size: 0.85rem;
    font-weight: 700;
    color: #1a1a1a;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.3rem;
  }

  .metodo-step p {
    font-size: 0.85rem;
    line-height: 1.6;
    color: #666;
  }

  /* Créditos */
  .cierre-creditos {
    margin-top: 2.5rem;
    padding-top: 2rem;
    border-top: 1px solid rgba(0,0,0,0.08);
  }

  .cierre-creditos-text {
    font-size: 0.9rem;
    color: #888;
    line-height: 1.7;
    margin-bottom: 0.4rem;
  }

  .cierre-creditos-text a {
    color: #c9587a;
    text-decoration: none;
    font-weight: 700;
  }

  @media (max-width: 600px) {
    .metodologia-grid {
      grid-template-columns: 1fr;
    }
  }

  .gemini-trigger {
    color: #c9587a;
    border-bottom: 1.5px dashed #c9587a;
    cursor: help;
    font-weight: 700;
  }

  .prompt-tooltip {
    position: fixed;
    transform: translate(-100%, -50%);
    width: 520px;
    overflow-y: visible;
    background: #1a1a1a;
    color: #f0e8d4;
    border-radius: 12px;
    padding: 1.2rem 1.4rem;
    z-index: 9999;
    box-shadow: 0 12px 40px rgba(0,0,0,0.35);
    pointer-events: none;
  }

  .prompt-tooltip::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 100%;
    transform: translateX(-50%);
    border: 7px solid transparent;
    border-left-color: #1a1a1a;
  }

  .prompt-label {
    font-family: 'Courier New', monospace;
    display: block;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #c9587a;
    font-weight: 700;
    margin-bottom: 0.8rem;
  }

  .prompt-code {
    font-family: 'Courier New', monospace;
    font-size: 0.75rem;
    line-height: 1.65;
    color: #e8dfc8;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    padding: 0;
  }


  .comparison-section {
    max-width: none;
    margin: 0;
  }


</style>
