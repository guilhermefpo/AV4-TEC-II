import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import Projeto from "../entities/Projeto.js";
import {
  recomendacaoService,
  projetoRepository,
  orquestradores,
} from "../Container.js";
import { Papel } from "../enum/Papel.js";
import { FabricaAnimacao, FabricaDocumentario, FabricaPublicitario } from "../factory/FabricasConcretas.js";
import OrquestradorPadrao from "../template/OrquestradorPadrao.js";
import { PacoteServico, ServicoAtomico, type ServicoProjeto } from "../composite/ServicoProjeto.js";

type ServicoEntrada =
  | { tipo: "atomico"; nome: string; custo: number; prazoDias: number; papel: Papel }
  | { tipo: "pacote"; nome: string; servicos: ServicoEntrada[] };

const servicoProjetoSchema: z.ZodType<ServicoEntrada> = z.lazy(() =>
  z.discriminatedUnion("tipo", [
    z.object({ tipo: z.literal("atomico"), nome: z.string(), custo: z.number().nonnegative(), prazoDias: z.number().positive(), papel: z.nativeEnum(Papel) }),
    z.object({ tipo: z.literal("pacote"), nome: z.string(), servicos: z.array(servicoProjetoSchema) }),
  ]),
);

function criarServico(dados: ServicoEntrada): ServicoProjeto {
  if (dados.tipo === "atomico") return new ServicoAtomico(dados.nome, dados.custo, dados.prazoDias, dados.papel);
  return new PacoteServico(dados.nome, dados.servicos.map(criarServico));
}

const papelObrigatorioSchema = z.object({
  papel: z.nativeEnum(Papel),
  peso: z.number(),
  competenciasDesejadas: z.array(
    z.object({ nome: z.string(), nivel: z.number() }),
  ),
});

const projetoSchema = z.object({
  id: z.string(),
  genero: z.string(),
  duracao: z.number(),
  orcamento: z.number(),
  prazo: z.coerce.date(),
  tipoCaptacao: z.string(),
  localizacao: z.string(),
  papeisObrigatorios: z.array(papelObrigatorioSchema),
  servicoPrincipal: servicoProjetoSchema.optional(),
  estrategia: z
    .enum(["cosseno", "colaborativa", "baixo_orcamento"])
    .default("cosseno"),
});

const recomendacaoResponseSchema = z.array(
  z.object({
    papel: z.nativeEnum(Papel),
    sugestoes: z.array(
      z.object({
        profissionalId: z.string(),
        nome: z.string(),
        score: z.number(),
      }),
    ),
  }),
);

export default async function projetoRoutes(
  app: FastifyInstance<any, any, any, any, ZodTypeProvider>,
) {
  app.post(
    "/projetos/recomendacao",
    {
      schema: {
        body: projetoSchema,
        response: { 200: recomendacaoResponseSchema },
      },
    },
    async (request, reply) => {
      const dados = request.body;

      const fabrica = dados.genero.toLowerCase().includes("anim")
        ? new FabricaAnimacao()
        : dados.genero.toLowerCase().includes("public")
          ? new FabricaPublicitario()
          : new FabricaDocumentario();
      const projeto = fabrica.criarProjeto([
        dados.id,
        dados.genero,
        dados.duracao,
        dados.orcamento,
        dados.prazo,
        dados.tipoCaptacao,
        dados.localizacao,
        dados.papeisObrigatorios,
      ] as ConstructorParameters<typeof Projeto>);
      if (dados.servicoPrincipal) projeto.servicoPrincipal = criarServico(dados.servicoPrincipal);
      if (!projeto.validarServicos()) {
        return reply.code(400).send({ erro: "Servicos invalidos para o orcamento ou duracao do projeto." });
      }
      const orquestradorPorTipo = new OrquestradorPadrao(
        orquestradores[dados.estrategia].obterEstrategia(),
        fabrica,
      );

      await projetoRepository.salvar(projeto);

      const recomendacoes = await recomendacaoService.gerarRecomendacoes(
        projeto,
        orquestradorPorTipo,
      );

      return reply.send(
        recomendacoes.map((r) => ({
          papel: r.papel,
          sugestoes: r.sugestoes.map((s) => ({
            profissionalId: s.profissional.id,
            nome: s.profissional.nome,
            score: s.score,
          })),
        })),
      );
    },
  );
}
