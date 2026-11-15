-- AlterTable
ALTER TABLE "Ocorrencia" ADD COLUMN     "resolvidaEm" TIMESTAMP(3),
ADD COLUMN     "responsavelId" INTEGER;

-- CreateTable
CREATE TABLE "ComentarioOcorrencia" (
    "id" SERIAL NOT NULL,
    "ocorrenciaId" INTEGER NOT NULL,
    "autorId" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComentarioOcorrencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComentarioOcorrencia_ocorrenciaId_idx" ON "ComentarioOcorrencia"("ocorrenciaId");

-- AddForeignKey
ALTER TABLE "Ocorrencia" ADD CONSTRAINT "Ocorrencia_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComentarioOcorrencia" ADD CONSTRAINT "ComentarioOcorrencia_ocorrenciaId_fkey" FOREIGN KEY ("ocorrenciaId") REFERENCES "Ocorrencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComentarioOcorrencia" ADD CONSTRAINT "ComentarioOcorrencia_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Dados existentes: o antigo "em_andamento" passa a ser "em_execucao"; ocorrências já resolvidas ganham a data de conclusão.
UPDATE "Ocorrencia" SET "status" = 'em_execucao' WHERE "status" = 'em_andamento';
UPDATE "Ocorrencia" SET "resolvidaEm" = "atualizadaEm" WHERE "status" = 'resolvida' AND "resolvidaEm" IS NULL;
