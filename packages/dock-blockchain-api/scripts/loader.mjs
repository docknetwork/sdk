const solutions = [
  (s) => s,
  (s) => `${s}/index.js`,
  (s) => `${s}.js`,
  (s) => `${s}/lib/index.js`,
];

export async function resolve(specifier, context, defaultResolve) {
  for (const solve of solutions) {
    const resolvedPath = solve(specifier);

    try {
      return await defaultResolve(resolvedPath, context, defaultResolve);
    } catch (err) {
      if (
        err.code !== "ERR_MODULE_NOT_FOUND" &&
        err.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED" &&
        err.code !== "ERR_UNSUPPORTED_DIR_IMPORT"
      ) {
        console.error(`Error resolving path: ${resolvedPath}`, err);
      }
    }
  }

  throw new Error(`Module not found: ${specifier}`);
}
