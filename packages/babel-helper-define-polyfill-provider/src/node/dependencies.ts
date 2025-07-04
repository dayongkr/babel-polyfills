import path from "path";
import debounce from "es-toolkit/compat/debounce";
import requireResolve from "resolve";

const nativeRequireResolve = parseFloat(process.versions.node) >= 8.9;

import { createRequire } from "module";
const require = createRequire(import /*::(_)*/.meta.url); // eslint-disable-line

function myResolve(name: string, basedir: string) {
  if (nativeRequireResolve) {
    return require
      .resolve(name, {
        paths: [basedir],
      })
      .replace(/\\/g, "/");
  } else {
    return requireResolve.sync(name, { basedir }).replace(/\\/g, "/");
  }
}

export function resolve(
  dirname: string,
  moduleName: string,
  absoluteImports: boolean | string,
): string {
  if (absoluteImports === false) return moduleName;

  let basedir = dirname;
  if (typeof absoluteImports === "string") {
    basedir = path.resolve(basedir, absoluteImports);
  }

  try {
    return myResolve(moduleName, basedir);
  } catch (err) {
    if (err.code !== "MODULE_NOT_FOUND") throw err;

    throw Object.assign(
      new Error(`Failed to resolve "${moduleName}" relative to "${dirname}"`),
      {
        code: "BABEL_POLYFILL_NOT_FOUND",
        polyfill: moduleName,
        dirname,
      },
    );
  }
}

export function has(basedir: string, name: string) {
  try {
    myResolve(name, basedir);
    return true;
  } catch {
    return false;
  }
}

export function logMissing(missingDeps: Set<string>) {
  if (missingDeps.size === 0) return;

  const deps = Array.from(missingDeps).sort().join(" ");

  console.warn(
    "\nSome polyfills have been added but are not present in your dependencies.\n" +
      "Please run one of the following commands:\n" +
      `\tnpm install --save ${deps}\n` +
      `\tyarn add ${deps}\n`,
  );

  process.exitCode = 1;
}

let allMissingDeps = new Set<string>();

const laterLogMissingDependencies = debounce(() => {
  logMissing(allMissingDeps);
  allMissingDeps = new Set<string>();
}, 100);

export function laterLogMissing(missingDeps: Set<string>) {
  if (missingDeps.size === 0) return;

  missingDeps.forEach(name => allMissingDeps.add(name));
  laterLogMissingDependencies();
}
