<script lang="ts">
  import { onMount } from 'svelte';
  import { api, type PublicConfig } from './api';

  let { config, onSignedIn }: { config: PublicConfig; onSignedIn: () => void } = $props();
  let problem = $state('');
  let googleButton: HTMLDivElement | undefined = $state();

  onMount(() => {
    if (config.googleClientId === '') return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      const google = (window as any).google;
      google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: async (response: { credential: string }) => {
          const result = await api.signInWithGoogle(response.credential);
          if (result.ok) return onSignedIn();
          const body = await result.json().catch(() => ({}));
          problem =
            body.error === 'not_allowlisted'
              ? 'That Google account is not allowed to use this organiser.'
              : 'That sign-in could not be completed. Try again.';
        }
      });
      google.accounts.id.renderButton(googleButton, { theme: 'filled_black', size: 'large', shape: 'pill', width: 280 });
    };
    document.head.appendChild(script);
  });

  async function devSignIn() {
    await api.devSignIn();
    onSignedIn();
  }
</script>

<main class="signin">
  <div class="backdrop" aria-hidden="true">
    {#each Array(18) as _, i}
      <div class="tile" style="--i:{i}"></div>
    {/each}
  </div>
  <section class="panel">
    <h1 class="brand">COUCH</h1>
    <p class="lede">Your videos, sorted by what you're into. Organised by Claude.</p>
    {#if config.googleClientId !== ''}
      <div class="google" bind:this={googleButton}></div>
    {/if}
    {#if config.devLogin}
      <button class="dev" onclick={devSignIn}>Sign in as the local tester</button>
    {/if}
    {#if problem}<p class="problem">{problem}</p>{/if}
  </section>
</main>

<style>
  .signin {
    position: relative;
    min-height: 100vh;
    display: grid;
    place-items: center;
    overflow: hidden;
    padding: 24px 16px;
  }
  .backdrop {
    position: absolute;
    inset: -10%;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 14px;
    transform: rotate(-8deg);
    opacity: 0.5;
  }
  .tile {
    aspect-ratio: 16 / 9;
    border-radius: var(--radius);
    background: linear-gradient(135deg, hsl(calc(var(--i) * 23) 45% 22%), hsl(calc(var(--i) * 23 + 40) 50% 12%));
  }
  .signin::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, rgba(15, 15, 16, 0.55), var(--bg) 75%);
  }
  .panel {
    position: relative;
    z-index: 1;
    width: min(420px, 100%);
    padding: 40px 32px;
    background: rgba(15, 15, 16, 0.82);
    border-radius: 12px;
    text-align: center;
    display: grid;
    gap: 18px;
    justify-items: center;
  }
  .brand {
    margin: 0;
    font-size: 44px;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: var(--accent);
  }
  .lede {
    margin: 0;
    color: var(--ink-dim);
    font-size: 17px;
  }
  .dev {
    border: 0;
    border-radius: 999px;
    padding: 12px 22px;
    background: var(--ink);
    color: var(--bg);
    font-weight: 600;
  }
  .problem {
    margin: 0;
    color: var(--accent);
  }
</style>
