<script>
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import { initAnalytics } from '$lib/analytics.js';
	import '../app.css';

	import '@fontsource/poppins/400.css';
	import '@fontsource/poppins/500.css';
	import '@fontsource/poppins/600.css';
	import '@fontsource/poppins/700.css';

	import '@fontsource/merriweather/400.css';
	import '@fontsource/merriweather/700.css';

	let { children } = $props();

	// Só no navegador: o site é pré-renderizado, então este código não roda no build.
	onMount(initAnalytics);

	// URL absoluta: Open Graph e Twitter Cards não aceitam caminhos relativos.
	const siteUrl = 'https://alexmarttoliv.github.io/tfm-divas-pop/';
	const title = '¿Cómo se volvió emocionalmente más complejo el pop de las divas?';
	const description =
		'Un análisis de 3.089 canciones de 31 divas del pop entre 1966 y 2025: cómo cambiaron las emociones, los temas y el tono de sus letras a lo largo de seis décadas.';
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />

	<!-- Ícones. O favicon.ico e o apple-touch-icon ficam na raiz porque os
	     navegadores (e o Safari do iPhone/iPad) os procuram lá automaticamente. -->
	<link rel="icon" href="{base}/favicon.ico" sizes="any" />
	<link rel="icon" type="image/svg+xml" href="{base}/star.svg" />
	<link rel="apple-touch-icon" href="{base}/apple-touch-icon.png" />

	<!-- Open Graph (WhatsApp, LinkedIn, Slack, Facebook) -->
	<meta property="og:type" content="article" />
	<meta property="og:site_name" content="La evolución emocional del pop femenino" />
	<meta property="og:locale" content="es_ES" />
	<meta property="og:url" content={siteUrl} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content="{siteUrl}og-image.jpg" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="600" />
	<meta property="og:image:alt" content="Las 31 divas del pop analizadas, sobre un degradado de colores" />

	<!-- Twitter/X -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content="{siteUrl}og-image.jpg" />

	<meta name="author" content="Alexandre Victor Martins de Oliveira" />
	<meta name="theme-color" content="#f8f2df" />
	<link rel="canonical" href={siteUrl} />
</svelte:head>

{@render children()}
