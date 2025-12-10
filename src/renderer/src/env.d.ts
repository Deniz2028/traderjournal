/// <reference types="vite/client" />

import type { TjApi, Api } from "./preload-api";
// Note: importing from ../preload-api might be circular if not careful, 
// but we defined Api in preload-api.ts which is in renderer/src. 
// Actually preload-api.ts is in src/renderer/src/preload-api.ts. 
// And env.d.ts is in src/renderer/src/env.d.ts.
// checking preload-api.ts again.

declare global {
    interface Window {
        tjApi: TjApi;
        api: Api;
        journalMorning: any;
    }
}

export { };
