/** Float32 compacto para guardar no SQLite (Bytes). */
export function paraBytes(v: number[]): Uint8Array<ArrayBuffer> {
  const f = new Float32Array(v);
  return new Uint8Array(f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength) as ArrayBuffer);
}

export function deBytes(b: Uint8Array): Float32Array {
  // Copia para garantir alinhamento de 4 bytes (o Buffer pode vir de um pool com deslocamento).
  const copia = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  return new Float32Array(copia);
}

/** Vetores já normalizados: a similaridade de cosseno é o produto escalar. */
export function similaridade(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let soma = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) soma += a[i] * b[i];
  return soma;
}
