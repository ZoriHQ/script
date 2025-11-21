<script lang="ts">
  import { setContext, onMount } from 'svelte';
  import { createZoriStore, type ZoriConfig, type ZoriStore } from './index';

  export let config: ZoriConfig;

  const store = createZoriStore(config);
  setContext('zori', store);

  // Expose store to parent
  export { store as zori };
</script>

<slot />
