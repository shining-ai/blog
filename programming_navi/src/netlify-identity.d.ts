interface Window {
  netlifyIdentity?: {
    on: (event: string, callback: (user?: unknown) => void) => void;
  };
}
