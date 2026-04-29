/* global console, process */
import('./dist/src/main/main.js').catch((error) => {
  console.error(error);
  process.exit(1);
});
