/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_MNEMONIC: string;
  readonly VITE_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
