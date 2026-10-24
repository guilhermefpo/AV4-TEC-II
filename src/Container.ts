import ProfissionalRepository from "./repository/ProfissionalRepository.js";
import EquipeRepository from "./repository/EquipeRepository.js";
import ConviteRepository from "./repository/ConviteRepository.js";
import ProjetoRepository from "./repository/ProjetoRepository.js";
import EmissorRecomendacao from "./observer/EmissorRecomendacao.js";
import NotificacaoEmail from "./observer/NotificacaoEmail.js";
import NotificacaoInterna from "./observer/NotificacaoInterna.js";
import AuditoriaOperacoes from "./observer/AuditoriaOperadores.js";
import OrquestradorPadrao from "./template/OrquestradorPadrao.js";
import EstrategiaCosseno from "./strategy/EstrategiaCosseno.js";
import FiltragemColaborativa from "./strategy/FiltragemColaborativa.js";
import RegraBaixoOrcamento from "./strategy/RegraBaixoOrcamento.js";
import RecomendacaoService from "./service/RecomendacaoService.js";
import ConviteService from "./service/ConviteService.js";
import RelatorioService from "./service/RelatorioService.js";
import { decorarRecomendador, type DecoradorRecomendacao } from "./strategy/Decorators.js";
import SistemaRecomendacao from "./factory/SistemaRecomendacao.js";
import { FabricaDocumentario } from "./factory/FabricasConcretas.js";
import { AdaptadorGoogleCloud, AdaptadorInterno, AdaptadorPagSeguro } from "./adapters/Adaptadores.js";
import { env } from "node:process";

export const profissionalRepository = new ProfissionalRepository();
export const equipeRepository = new EquipeRepository(profissionalRepository);
export const conviteRepository = new ConviteRepository();
export const projetoRepository = new ProjetoRepository(); // Villain - Neoni
 
export const emissor = new EmissorRecomendacao();
emissor.inscrever(new NotificacaoEmail());
emissor.inscrever(new NotificacaoInterna());
emissor.inscrever(new AuditoriaOperacoes());

const decoradoresConfigurados = (env.CINEBRIDGE_DECORATORS ?? "cache,auditoria,compressao")
  .split(",")
  .map((item) => item.trim())
  .filter((item): item is DecoradorRecomendacao =>
    item === "cache" || item === "auditoria" || item === "compressao",
  );

export const sistemaRecomendacao = new SistemaRecomendacao(
  new FabricaDocumentario(),
  {
    armazenamento: new AdaptadorGoogleCloud(),
    pagamento: new AdaptadorPagSeguro(),
    profissionais: new AdaptadorInterno(),
  },
  decoradoresConfigurados,
);

export const orquestradores = {
  cosseno: new OrquestradorPadrao(decorarRecomendador(new EstrategiaCosseno(), decoradoresConfigurados)),
  colaborativa: new OrquestradorPadrao(decorarRecomendador(new FiltragemColaborativa(), decoradoresConfigurados)),
  baixo_orcamento: new OrquestradorPadrao(decorarRecomendador(new RegraBaixoOrcamento(), decoradoresConfigurados)),
};

export const orquestrador = orquestradores.cosseno;

export const recomendacaoService = new RecomendacaoService(
  profissionalRepository,
  orquestrador,
  emissor,
  projetoRepository,
);

export const conviteService = new ConviteService(
  conviteRepository,
  equipeRepository,
  profissionalRepository,
  emissor,
);

export const relatorioService = new RelatorioService(
  projetoRepository,
  equipeRepository,
);
