-- CreateTable
CREATE TABLE "Encomenda" (
    "id" SERIAL NOT NULL,
    "apartamento" TEXT NOT NULL,
    "apartamentoChave" TEXT NOT NULL,
    "descricao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'aguardando',
    "recebidaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retiradaEm" TIMESTAMP(3),
    "registradaPorId" INTEGER NOT NULL,

    CONSTRAINT "Encomenda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Encomenda_apartamentoChave_status_idx" ON "Encomenda"("apartamentoChave", "status");

-- CreateIndex
CREATE INDEX "Encomenda_status_recebidaEm_idx" ON "Encomenda"("status", "recebidaEm");

-- AddForeignKey
ALTER TABLE "Encomenda" ADD CONSTRAINT "Encomenda_registradaPorId_fkey" FOREIGN KEY ("registradaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
