// react-helmet-async ships CJS + ESM builds whose export shapes differ between
// the client bundle and the SSR runtime: named imports crash SSR module
// evaluation, and a default import breaks the client build (no default export
// in the ESM build). A namespace import works everywhere — we then resolve the
// components from either the namespace itself or its `.default` interop slot.
// All app code must import Helmet / HelmetProvider from here, never from
// 'react-helmet-async' directly.
import * as pkg from 'react-helmet-async';

type HelmetModule = typeof import('react-helmet-async');

const ns = pkg as unknown as HelmetModule & { default?: HelmetModule };
const resolved: HelmetModule = ns.Helmet ? ns : (ns.default as HelmetModule);

export const Helmet = resolved.Helmet;
export const HelmetProvider = resolved.HelmetProvider;
