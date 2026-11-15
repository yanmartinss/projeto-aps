-- CreateTable
CREATE TABLE "DocumentoRegimento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "modeloEmbedding" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoRegimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrechoRegimento" (
    "id" SERIAL NOT NULL,
    "documentoId" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "artigo" TEXT,
    "texto" TEXT NOT NULL,
    "embedding" BYTEA,

    CONSTRAINT "TrechoRegimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaComum" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "abre" INTEGER NOT NULL,
    "fecha" INTEGER NOT NULL,
    "duracaoMaxMin" INTEGER NOT NULL,

    CONSTRAINT "AreaComum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" SERIAL NOT NULL,
    "areaId" INTEGER NOT NULL,
    "apartamento" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "textoOriginal" TEXT,
    "motivoRecusa" TEXT,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ocorrencia" (
    "id" SERIAL NOT NULL,
    "texto" TEXT NOT NULL,
    "autorPerfil" TEXT NOT NULL,
    "categoria" TEXT,
    "urgencia" TEXT,
    "resumo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'aberta',
    "classificada" BOOLEAN NOT NULL DEFAULT false,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ocorrencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrechoRegimento_documentoId_idx" ON "TrechoRegimento"("documentoId");

-- CreateIndex
CREATE UNIQUE INDEX "AreaComum_nome_key" ON "AreaComum"("nome");

-- CreateIndex
CREATE INDEX "Reserva_areaId_inicio_idx" ON "Reserva"("areaId", "inicio");

-- CreateIndex
CREATE INDEX "Reserva_apartamento_idx" ON "Reserva"("apartamento");

-- AddForeignKey
ALTER TABLE "TrechoRegimento" ADD CONSTRAINT "TrechoRegimento_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "DocumentoRegimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AreaComum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
