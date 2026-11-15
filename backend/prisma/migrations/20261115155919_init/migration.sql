-- CreateTable
CREATE TABLE "Ocorrencia" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "texto" TEXT NOT NULL,
    "autorPerfil" TEXT NOT NULL,
    "categoria" TEXT,
    "urgencia" TEXT,
    "resumo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'aberta',
    "classificada" BOOLEAN NOT NULL DEFAULT false,
    "criadaEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" DATETIME NOT NULL
);
