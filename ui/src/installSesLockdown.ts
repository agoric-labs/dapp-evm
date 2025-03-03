import 'ses'; // adds lockdown, harden, and Compartment
import '@endo/eventual-send/shim.js'; // adds support needed by E

// @ts-ignore
window.process = {
  env: {},
};

// @ts-ignore
window.global = {};

lockdown({
  errorTaming: 'unsafe',
  overrideTaming: 'severe',
  consoleTaming: 'unsafe',
});

Error.stackTraceLimit = Infinity;
