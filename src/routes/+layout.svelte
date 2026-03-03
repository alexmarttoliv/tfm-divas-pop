<script>
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	import '@fontsource/poppins/400.css';
	import '@fontsource/poppins/500.css';
	import '@fontsource/poppins/600.css';
	import '@fontsource/poppins/700.css';

	import '@fontsource/merriweather/400.css';
	import '@fontsource/merriweather/700.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
