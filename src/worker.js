import { onRequest } from "../functions/_assets/[[path]].js";

// Läuft nur für /_assets/* (run_worker_first in wrangler.jsonc). Alles andere liefern die Static Assets direkt.
export default { fetch: () => onRequest() };
