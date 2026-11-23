// Public frontend configuration. Never put API secrets or database credentials here.
// On production, use the same-origin public API proxy defined in vercel.json.
// Local development stays in demo mode until an API is explicitly configured.
window.AF_RUNTIME = {
  apiBaseUrl: window.location.hostname === 'afterform-lovat.vercel.app'
    ? window.location.origin
    : '',
  defaultStore: 'afterform',
  timeoutMs: 8000
};
