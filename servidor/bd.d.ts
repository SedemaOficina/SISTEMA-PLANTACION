/* Los tipos de bd.js, que también usan cargar.js y las pruebas en JavaScript. */
import type pg from "pg";

export const SERVIDOR: string;
export const SQL: string;
export const SQL_LOCAL: string;
export const RAIZ: string;
export function contrasenaDe(datos: { host: string; port: number; database: string; user: string }): string | undefined;
export function conectar(): Promise<pg.Client>;
export function guionesDeInstalacion(): string[];
export function prepararTerritorio(c: pg.Client): Promise<void>;
export function instalar(c: pg.Client): Promise<void>;
export function destruir(c: pg.Client): Promise<void>;
