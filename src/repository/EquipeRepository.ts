import { AppDataSource } from "../database/Data-source.js";
import Equipe from "../entities/Equipe.js";
import MembroEquipe from "../entities/MembroEquipe.js";
import Profissional from "../entities/Profissional.js";
import type ProfissionalRepository from "./ProfissionalRepository.js";
import { gerarId } from "../utils/GeradorID.js";
import { requisitarProfissionais } from "../messaging/RabbitMq.js";

export default class EquipeRepository {
  private repo = AppDataSource.getRepository(Equipe);

  constructor(private profissionalRepository: ProfissionalRepository) {}

  public async salvar(equipe: Equipe): Promise<void> {
    // antes de salvar, achata os membros completos (com Profissional)
    // para o formato simples que vai pro banco
    equipe.membrosPersistidos = equipe.membros.map((m) => ({
      papel: m.papel,
      profissionalId: m.profissional.id,
      confirmado: m.confirmado,
    }));
    await this.repo.save(equipe);
  }

  public async buscarPorId(id: string): Promise<Equipe | undefined> {
    const encontrada = await this.repo.findOneBy({ id });
    if (!encontrada) return undefined;
    return this.hidratar(encontrada);
  }

  public async buscarPorProjetoId(
    projetoId: string,
  ): Promise<Equipe | undefined> {
    const encontrada = await this.repo.findOneBy({ projetoId });
    if (!encontrada) return undefined;
    return this.hidratar(encontrada);
  }

  public async obterOuCriar(projetoId: string): Promise<Equipe> {
    const existente = await this.buscarPorProjetoId(projetoId);
    if (existente) return existente;

    const nova = new Equipe(
      gerarId("E"),
      projetoId,
      [],
      new Date(),
      "em_formacao",
    );
    await this.salvar(nova);
    return nova;
  }

  private async hidratar(equipe: Equipe): Promise<Equipe> {
    const membros: MembroEquipe[] = [];
    for (const persistido of equipe.membrosPersistidos) {
      const profissionalRemoto = process.env.RABBITMQ_URL
        ? await requisitarProfissionais("buscarPorId", { id: persistido.profissionalId }) as Parameters<typeof Profissional.criar>[0] | undefined
        : undefined;
      const profissional = process.env.RABBITMQ_URL
        ? profissionalRemoto ? Profissional.criar(profissionalRemoto) : undefined
        : await this.profissionalRepository.buscarPorId(persistido.profissionalId);
      if (!profissional) continue;
      membros.push(
        new MembroEquipe(persistido.papel, profissional, persistido.confirmado),
      );
    }
    equipe.membros = membros;
    return equipe;
  }
}
