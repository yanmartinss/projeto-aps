import { Router } from "express";
import { prisma } from "../db.js";
import { STATUS_ENCERRADOS } from "../schemas.js";
import { usuarioDaRequisicao } from "../auth/middleware.js";

export const notificacoesRouter = Router();

interface Aviso {
  tela: string;
  quantidade: number;
  texto: string;
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** O sino da barra superior: o que está esperando por esta pessoa. Tudo calculado do banco, sem IA. */
notificacoesRouter.get("/", async (req, res) => {
  const eu = usuarioDaRequisicao(req);
  const agora = new Date();
  const avisos: Aviso[] = [];
  const add = (tela: string, quantidade: number, texto: string) => {
    if (quantidade > 0) avisos.push({ tela, quantidade, texto });
  };

  if (eu.perfil === "sindico") {
    const [urgentes, pendentes, atrasadas, pedidosSenha] = await Promise.all([
      prisma.ocorrencia.count({ where: { urgencia: "alta", status: { notIn: STATUS_ENCERRADOS } } }),
      prisma.reserva.count({ where: { status: "pendente" } }),
      prisma.tarefa.count({ where: { status: { not: "concluida" }, prazo: { lt: agora } } }),
      prisma.usuario.count({ where: { senhaSolicitadaEm: { not: null }, ativo: true } }),
    ]);
    add("usuarios", pedidosSenha, `${plural(pedidosSenha, "pedido de nova senha", "pedidos de nova senha")}`);
    add("ocorrencias", urgentes, `${plural(urgentes, "ocorrência urgente", "ocorrências urgentes")} em aberto`);
    add("reservas", pendentes, `${plural(pendentes, "reserva aguarda", "reservas aguardam")} sua resposta`);
    add("tarefas", atrasadas, `${plural(atrasadas, "atividade atrasada", "atividades atrasadas")} da equipe`);
  } else if (eu.perfil === "funcionario") {
    const [abertas, atrasadas, delegadas] = await Promise.all([
      prisma.tarefa.count({ where: { funcionarioId: eu.id, status: { not: "concluida" } } }),
      prisma.tarefa.count({ where: { funcionarioId: eu.id, status: { not: "concluida" }, prazo: { lt: agora } } }),
      prisma.ocorrencia.count({ where: { responsavelId: eu.id, status: { notIn: STATUS_ENCERRADOS } } }),
    ]);
    add("tarefas", atrasadas, `${plural(atrasadas, "atividade atrasada", "atividades atrasadas")}`);
    add("tarefas", abertas - atrasadas, `${plural(abertas - atrasadas, "atividade", "atividades")} para fazer`);
    add("minhas", delegadas, `${plural(delegadas, "ocorrência delegada", "ocorrências delegadas")} a você`);
  } else {
    const tresDias = new Date(agora.getTime() - 3 * 86_400_000);
    const [decididas, resolvidas] = await Promise.all([
      prisma.reserva.count({ where: { usuarioId: eu.id, status: { in: ["aprovada", "recusada"] }, atualizadaEm: { gte: tresDias } } }),
      prisma.ocorrencia.count({ where: { autorId: eu.id, status: "resolvida", resolvidaEm: { gte: tresDias } } }),
    ]);
    add("reservas", decididas, `${plural(decididas, "reserva foi respondida", "reservas foram respondidas")} pelo síndico`);
    add("minhas", resolvidas, `${plural(resolvidas, "ocorrência foi resolvida", "ocorrências foram resolvidas")}`);
  }

  res.json({ total: avisos.reduce((s, a) => s + a.quantidade, 0), avisos });
});
