# CineBridge

API para recomendar e formar equipes audiovisuais. Node.js, TypeScript estrito, Fastify, PostgreSQL e TypeORM. Não há interface gráfica; a documentação interativa da API fica em `/docs`.

Atividades práticas (ATVI, ATVII e ATVIII) — Engenharia de Software. Professor: Dr. Eng. Gerson Penha.

O projeto implementa o microsserviço de recomendação e orquestração de equipes da plataforma CineBridge. A AV1 utiliza Strategy, Template Method, Observer e Visitor. A AV2 acrescenta Prototype, Factory Method e Abstract Factory. A AV3 acrescenta Adapter, Composite e Decorator para provedores, pacotes hierárquicos de serviços e preocupações transversais.

## Executar

Com o Docker Desktop aberto, execute no PowerShell, na pasta do projeto:

```powershell
npm install
docker compose up -d
npm run dev
```

O PostgreSQL 16 sobe em `localhost:5432` (usuário, senha e banco `cinebridge`, definidos em `docker-compose.yml` e `src/database/data-source.ts`). As tabelas `profissionais`, `projetos`, `equipes` e `convites` são criadas automaticamente na primeira conexão (`synchronize: true`), então não há migração nem seed. O banco começa vazio: cadastre profissionais antes de pedir recomendações.

A API fica em `http://localhost:3333` e a documentação em `http://localhost:3333/docs`. Os dados persistem entre reinícios do servidor. Para apagar tudo e recomeçar: `docker compose down -v`.

No Ubuntu, os comandos são os mesmos (`npm install`, `docker compose up -d`, `npm run dev`). É necessário Node.js LTS e Docker com Compose.

## Testes

```bash
docker compose up -d
npm test
npm run test:coverage
```

- `npm test`: roda a suíte. Os testes de integração existentes usam o PostgreSQL real, então o Docker precisa estar de pé.
- `npm test -- --exclude src/tests/integration/**`: roda somente os testes unitários, sem exigir PostgreSQL.
- `npm run test:watch`: reexecuta os testes a cada alteração.
- `npm run test:coverage`: gera relatório de cobertura no terminal e em `coverage/index.html`.

Na validação desta revisão, os 24 testes unitários passaram. Os 7 testes de integração dependem do PostgreSQL em `localhost:5432` e não puderam ser executados porque o Docker não estava ativo. A cobertura percentual ainda não foi medida.

| Arquivo | Tipo | Demonstra |
| --- | --- | --- |
| `src/tests/strategy/EstrategiaCosseno.test.ts` | Unitário | Similaridade de cosseno e exclusão de indisponíveis |
| `src/tests/strategy/TrocaEstrategia.test.ts` | Unitário | Troca de estratégia e alteração do ranking |
| `src/tests/template/OrquestradorPadrao.test.ts` | Unitário | Fluxo de validação orçamentária e recomendação por papel |
| `src/tests/observer/EmissorRecomendacao.test.ts` | Unitário | Notificação independente e inscrição/cancelamento |
| `src/tests/visitor/ValidatorConsistencia.test.ts` | Unitário | Validação sem dispersar lógica nas classes de domínio |
| `src/tests/factory/PadroesCriacionais.test.ts` | Unitário | Fábricas e clonagem dos tipos de projeto |
| `src/tests/adapter/Adaptadores.test.ts` | Unitário | Troca dos provedores simulados para armazenamento, pagamento e cadastro |
| `src/tests/composite/ServicoProjeto.test.ts` | Unitário | Custo, prazo, validação, persistência e clonagem da hierarquia |
| `src/tests/decorator/Decorators.test.ts` | Unitário | Cache, auditoria e redução do payload comprimido |
| `src/tests/http/CompressaoHttp.test.ts` | Unitário | Gzip HTTP e resposta sem compressão quando não aceita pelo cliente |
| `src/tests/integration/FluxoCompleto.test.ts` | Integração | Cadastro, recomendação, convite, aceite e relatório |
| `src/tests/integration/SubstituicaoReavaliacao.test.ts` | Integração | Substituição, reavaliação e erros 404 |

## API

| Método | Rota | Ação |
| --- | --- | --- |
| POST | `/profissionais` | Cadastra profissional (id gerado: `P1`, `P2`...) |
| GET | `/profissionais` | Lista profissionais |
| POST | `/projetos/recomendacao` | Salva projeto e recomenda profissionais para cada papel |
| POST | `/projetos/:projetoId/convites` | Convida profissional para um papel (id `C1`, `C2`...) |
| PATCH | `/convites/:conviteId` | Registra aceite ou recusa |
| GET | `/projetos/:projetoId/relatorio` | Relatório, consistência e compatibilidade |
| POST | `/projetos/:projetoId/equipe/substituir` | Nova rodada de recomendação para um papel |
| POST | `/projetos/:projetoId/reavaliar` | Atualiza orçamento/prazo e refaz recomendações |

### Fazer as requisicoes em `/docs`

Depois de iniciar a API com `npm run dev`, o terminal mostra os enderecos do servidor e da documentacao:

```text
HTTP server running on http://localhost:3333
Docs available at http://localhost:3333/docs
```

Abra `http://localhost:3333/docs`, escolha uma rota e preencha os campos de caminho e o corpo JSON indicados. Para testar o fluxo completo, use esta ordem:

1. **POST `/profissionais`** - cadastre pelo menos um profissional. Corpo:

   ```json
   { "nome": "Ana", "precoMedio": 500, "competencias": [], "disponivel": true }
   ```

   Guarde o `id` retornado (por exemplo, `P1`).

2. **POST `/projetos/recomendacao`** - envie um projeto. Exemplo de corpo completo logo abaixo. Guarde o `id` do projeto e um `profissionalId` sugerido.

3. **POST `/projetos/{projetoId}/convites`** - substitua `{projetoId}` pelo ID do projeto. Corpo:

   ```json
   { "profissionalId": "P1", "papel": "DIRETOR" }
   ```

   Guarde o `id` do convite retornado.

4. **PATCH `/convites/{conviteId}`** - substitua `{conviteId}` pelo ID do convite. Corpo:

   ```json
   { "resposta": "aceito" }
   ```

5. **GET `/projetos/{projetoId}/relatorio`** - consulte o resultado da equipe.

Tambem e possivel testar **POST `/projetos/{projetoId}/equipe/substituir`** com `{ "papel": "DIRETOR" }` ou **POST `/projetos/{projetoId}/reavaliar`** com `{ "novoOrcamento": 80000 }`.

### Exemplo completo no PowerShell

Com o servidor rodando, o exemplo abaixo executa o mesmo fluxo sem abrir a interface:

```powershell
$prof = Invoke-RestMethod -Method Post -Uri http://localhost:3333/profissionais -ContentType 'application/json' -Body '{"nome":"Ana","precoMedio":500}'
$projeto = @{
  id = 'projeto-1'; genero = 'documentario'; duracao = 90; orcamento = 50000
  prazo = '2026-12-01'; tipoCaptacao = 'documentario'; localizacao = 'Sao Paulo'
  papeisObrigatorios = @(@{ papel = 'DIRETOR'; peso = 5; competenciasDesejadas = @() })
} | ConvertTo-Json -Depth 10
Invoke-RestMethod -Method Post -Uri http://localhost:3333/projetos/recomendacao -ContentType 'application/json' -Body $projeto
$convite = Invoke-RestMethod -Method Post -Uri http://localhost:3333/projetos/projeto-1/convites -ContentType 'application/json' -Body ('{"profissionalId":"' + $prof.id + '","papel":"DIRETOR"}')
Invoke-RestMethod -Method Patch -Uri "http://localhost:3333/convites/$($convite.id)" -ContentType 'application/json' -Body '{"resposta":"aceito"}'
Invoke-RestMethod http://localhost:3333/projetos/projeto-1/relatorio
```

`estrategia` pode ser `cosseno` (padrão), `colaborativa` ou `baixo_orcamento`. `resposta` aceita `aceito` ou `recusado`. Para substituição, `papel` aceita `DIRETOR`, `DIRETOR_FOTOGRAFIA`, `SONOPLASTA`, `EDITOR`, `ROTEIRISTA` ou `EFEITOS_VISUAIS`. Na reavaliação, `novoOrcamento` e `novoPrazo` são opcionais. Entradas que não respeitam o schema retornam 400. Projeto ou papel inexistente nas rotas de relatório, substituição e reavaliação retorna 404.

`servicoPrincipal` é opcional no corpo da recomendação e pode conter serviços atômicos ou pacotes aninhados. Os serviços atômicos precisam de nome, custo, prazo em dias e papel:

```json
{
  "tipo": "pacote",
  "nome": "Pos-producao",
  "servicos": [
    { "tipo": "atomico", "nome": "Edicao", "custo": 1000, "prazoDias": 5, "papel": "EDITOR" },
    { "tipo": "pacote", "nome": "Audio", "servicos": [
      { "tipo": "atomico", "nome": "Mixagem", "custo": 500, "prazoDias": 2, "papel": "SONOPLASTA" }
    ] }
  ]
}
```

## Organização e padrões

```
src/
  adapters/       contratos, adaptadores e provedores externos simulados
  composite/      ServicoProjeto, ServicoAtomico e PacoteServico
  entities/       Projeto, Profissional, Equipe, Convite e objetos do domínio
  enum/           Papel
  interface/      contratos do Visitor
  gerador/        visitantes concretos
  strategy/       recomendadores e decorators
  template/       orquestrador do fluxo de equipe
  observer/       eventos e notificadores
  repository/     acesso ao banco (TypeORM)
  service/        casos de uso
  routes/         rotas Fastify com validação Zod
  database/       DataSource do TypeORM
  tests/          testes unitários e de integração
  utils/          gerador de ids sequenciais
  factory/        fábricas e SistemaRecomendacao
  Container.ts    composition root
  ---
  raiz:
  app.ts          montagem do Fastify
  server.ts       conecta ao banco e sobe o HTTP
```

| Padrão | Implementação | Demonstração |
| --- | --- | --- |
| Strategy | `EstrategiaCosseno`, `FiltragemColaborativa`, `RegraBaixoOrcamento` | Algoritmos intercambiáveis |
| Template Method | `OrquestradorEquipe` e `OrquestradorPadrao` | Normalização, validação, recomendação e pós-processamento |
| Observer | `EmissorRecomendacao` e observadores de e-mail, interno e auditoria | Um evento alcança observadores independentes |
| Visitor | `ValidadorConsistencia`, `CalculadorCompatibilidade`, `GeradorRelatorio` | Operações distintas sobre o domínio |
| Prototype | `Projeto.clonar()` e subclasses | Cópia dos papéis, competências e serviço composto |
| Factory Method / Abstract Factory | `FabricaProjetoBase` e fábricas concretas | Famílias de projeto e colaboradores |
| Adapter | `AdaptadorArmazenamento`, `AdaptadorPagamento`, `AdaptadorProfissional` | S3/Google Cloud, Stripe/PagSeguro, LinkedIn/cadastro interno |
| Composite | `ServicoAtomico` e `PacoteServico` | Custo, prazo e validação recursivos |
| Decorator | `CacheDecorator`, `AuditoriaDecorator`, `CompressaoDecorator` | Cache, registro e medição de compressão combináveis |

Os provedores de nuvem, pagamento e profissionais são simulados em `SistemasSimulados.ts`; não realizam chamadas reais. `SistemaRecomendacao` recebe os adaptadores por injeção e oferece operações padronizadas para cada integração. A pilha dos decorators usada pelas rotas é configurada pela variável `CINEBRIDGE_DECORATORS`, separada por vírgulas. Valores aceitos: `cache`, `auditoria` e `compressao`; por padrão, os três são habilitados.

`Projeto.servicoPrincipal` aceita um `ServicoProjeto`, é persistido em coluna JSON e pode ser enviado no corpo de recomendação. `calcularCustoTotal()` e `validarServicos()` delegam ao Composite; a validação verifica papéis, orçamento e duração. `papeisObrigatorios` continua disponível para compatibilidade.

## Regras adotadas

- Cada papel obrigatório possui peso e competências desejadas. A recomendação é feita por papel e não recomenda profissionais indisponíveis.
- Cosseno compara competências; colaborativa considera avaliações históricas; baixo orçamento prioriza preço dentro do orçamento e usa avaliações como desempate.
- Pacotes somam o custo e o prazo dos serviços filhos e validam recursivamente todos os componentes.
- Cache usa dados do projeto, papel e profissionais como chave. Auditoria registra duração e quantidade de sugestões. O decorator de compressão calcula o tamanho gzip das sugestões sem alterar `RecomendacaoStrategy`; o hook HTTP comprime respostas JSON maiores que 256 bytes quando o cliente aceita gzip.
- Um orçamento menor ou igual a zero é rejeitado pelo orquestrador. Ao aceitar convite, o profissional vira membro confirmado; substituição de membro põe a equipe em `em_revisao`.
- A falha ao listar profissionais usa lista vazia como fallback.

## Notificações e eventos

Os eventos são `recomendacao_gerada`, `convite_aceito` e `convite_recusado`. Os observadores reagem em memória e registram no console; não há envio real de e-mail. Os logs HTTP estruturados vêm do Pino, embutido no Fastify. O decorator de auditoria também emite registros JSON no console.

## Requisitos não funcionais

| Requisito | Situação |
| --- | --- |
| Algoritmo parametrizável | Atendido: estratégia selecionada pela requisição |
| Integração substituível | Atendido em demonstração com APIs simuladas e adaptadores injetáveis |
| Pacotes hierárquicos | Atendido pelo Composite e persistido como JSON no projeto |
| Cache, auditoria e compressão | Decorators implementados; respostas JSON grandes usam gzip quando solicitado pelo cliente |
| Latência abaixo de 2 s e 100 requisições simultâneas | Não medido |
| Compatibilidade Windows e Ubuntu | Desenvolvido para Node.js e Docker Compose; Ubuntu não validado nesta revisão |

## Limitações

- Adaptadores apontam para provedores simulados. Credenciais, rede, persistência de mídia e transações reais exigem implementação específica do provedor.
- `servicoPrincipal` é persistido como JSON em uma coluna própria; projetos antigos sem serviço continuam válidos.
- O cache é em memória, sem expiração ou limite de tamanho, e reinicia junto com o processo. A auditoria do decorator também é local ao processo e não é enviada a armazenamento externo.
- Recusar convite emite `convite_recusado`, mas não inicia recomendação automática. A substituição retorna sugestões para o papel; o produtor escolhe e convida o substituto.
- IDs `P1`, `C1` e `E1` usam contadores em memória e podem colidir após reiniciar o servidor com os dados preservados.
- Erros nas rotas de convite para profissional ou convite inexistente ainda resultam em resposta 500 genérica.
- Não há RabbitMQ, autenticação, migrações, seed ou integração real de e-mail. As credenciais de banco são de desenvolvimento local.
- Testes de integração acumulam registros no banco e exigem PostgreSQL e dependências instaladas.
