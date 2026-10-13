import { defineConfig } from "tsup";

/* La compilación del módulo fuera del SIA: el servicio solo (iniciar) y lo que importan las pruebas
   (independiente). En el SIA el módulo se compila con el tsup de sia-backend, junto con los demás, en su único
   archivo. */
export default defineConfig({
  entry: { iniciar: "src/iniciar.ts", independiente: "src/independiente.ts" },
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  bundle: true,
  sourcemap: true,
});
