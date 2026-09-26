import { defineConfig } from 'vite';

// Keep the build portable between a domain root and a subdirectory.
export default defineConfig({ base: './' });
