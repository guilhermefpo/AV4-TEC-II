# CineBridge

API de recomendação e formação de equipes audiovisuais, desenvolvida em Node.js, TypeScript, Fastify e PostgreSQL com TypeORM. A documentação interativa fica em `/docs`.

Projeto das atividades práticas de Engenharia de Software (ATV I a ATV IV), ministradas pelo Prof. Dr. Eng. Gerson Penha.

## Iniciar com Docker Compose

Requisito: Docker Desktop iniciado no Windows ou Docker Engine com Docker Compose no Linux. Na raiz do projeto, execute:

```powershell
docker compose up -d --build
docker compose ps
```

Espere os serviços aparecerem como `healthy`. Se algum serviço não iniciar, consulte os logs:

```powershell
docker compose logs -f
```

A API e o painel do RabbitMQ ficam disponíveis em:

- API: <http://localhost:3333>
- Health check da API: <http://localhost:3333/health>
- Documentação: <http://localhost:3333/docs>
- RabbitMQ Management: <http://localhost:15672> (usuário e senha locais: `cinebridge` / `cinebridge`)

O Compose inclui a API, os consumidores de profissionais, projetos e notificações, o RabbitMQ e quatro bancos PostgreSQL independentes. Os serviços se comunicam pela rede interna; somente a API e as portas do RabbitMQ são publicadas no host. Os dados dos bancos e do RabbitMQ são mantidos em volumes.

Para encerrar os containers mantendo os dados:

```powershell
docker compose down
```

Para também apagar os dados persistidos e reiniciar do zero:

```powershell
docker compose down -v
```

As credenciais padrão são apenas para desenvolvimento. Antes de usar em outro ambiente, configure `POSTGRES_PASSWORD`, `RABBITMQ_USER` e `RABBITMQ_PASSWORD` no ambiente do Compose.

## Fluxo da aplicação

1. Cadastre profissionais pela API. O pedido é enviado ao serviço de profissionais pela fila RPC `consulta-profissionais` e salvo no banco de profissionais.
2. Envie um projeto para `POST /projetos/recomendacao`. A API persiste os dados usados pela recomendação, consulta profissionais pela fila e retorna sugestões por papel.
3. A criação do projeto também gera o comando durável `projeto.criado`. O serviço de projetos registra sua projeção e publica o evento em `eventos-projetos`.
4. O serviço de notificações consome os eventos e registra cada um no seu banco e nos logs.

Os serviços de profissionais, projetos e notificações disponibilizam `/health` na porta interna `3000`. O health check verifica as conexões necessárias ao serviço. A API verifica PostgreSQL e RabbitMQ.

O envio de e-mail e mensagens externas ainda não está conectado a provedores reais. O serviço de notificações persiste os eventos recebidos e os registra nos logs.

## Testar a API pela documentação

Com os containers saudáveis, abra <http://localhost:3333/docs>. Selecione uma rota, clique em **Try it** (ou **Try it out**), preencha o corpo JSON e execute a requisição.

Para testar a recomendação e a comunicação com os serviços, siga esta ordem:

1. Em `POST /profissionais`, cadastre um profissional. Exemplo de corpo:

   ```json
   {
     "nome": "Ana",
     "precoMedio": 500,
     "competencias": [],
     "disponivel": true
   }
   ```

   Guarde o `id` retornado.

2. Em `POST /projetos/recomendacao`, envie um projeto. Exemplo de corpo:

   ```json
   {
     "id": "projeto-1",
     "genero": "documentario",
     "duracao": 90,
     "orcamento": 50000,
     "prazo": "2026-12-01",
     "tipoCaptacao": "documentario",
     "localizacao": "Sao Paulo",
     "papeisObrigatorios": [
       {
         "papel": "DIRETOR",
         "peso": 5,
         "competenciasDesejadas": []
       }
     ]
   }
   ```

   A resposta contém as sugestões por papel. Guarde o `id` do projeto e o `profissionalId` de uma sugestão.

3. Em `POST /projetos/{projetoId}/convites`, substitua `{projetoId}` pelo ID do projeto e envie:

   ```json
   {
     "profissionalId": "P1",
     "papel": "DIRETOR"
   }
   ```

   Use o ID retornado no próximo passo.

4. Em `PATCH /convites/{conviteId}`, substitua `{conviteId}` pelo ID do convite e envie:

   ```json
   { "resposta": "aceito" }
   ```

5. Em `GET /projetos/{projetoId}/relatorio`, informe o ID do projeto para consultar a equipe e o relatório.

Também é possível testar `POST /projetos/{projetoId}/equipe/substituir` com o corpo `{ "papel": "DIRETOR" }` e `POST /projetos/{projetoId}/reavaliar` com `{ "novoOrcamento": 80000 }`.

Consulte filas e mensagens em <http://localhost:15672>. Para acompanhar eventos e erros dos serviços:

```powershell
docker compose logs -f cinebridge-api cinebridge-profissionais cinebridge-projetos cinebridge-notificacoes
```

Outras rotas disponíveis:

| Método | Rota | Ação |
| --- | --- | --- |
| `POST` | `/profissionais` | Cadastra profissional |
| `GET` | `/profissionais` | Lista profissionais |
| `POST` | `/projetos/recomendacao` | Persiste projeto e gera recomendações por papel |
| `POST` | `/projetos/:projetoId/convites` | Cria convite para profissional e papel |
| `PATCH` | `/convites/:conviteId` | Registra aceite ou recusa |
| `GET` | `/projetos/:projetoId/relatorio` | Retorna relatório e consistência da equipe |
| `POST` | `/projetos/:projetoId/equipe/substituir` | Gera sugestões para substituir um papel |
| `POST` | `/projetos/:projetoId/reavaliar` | Atualiza orçamento ou prazo e refaz recomendações |

`estrategia` aceita `cosseno` (padrão), `colaborativa` ou `baixo_orcamento`. `resposta` aceita `aceito` ou `recusado`. Os papéis possíveis são `DIRETOR`, `DIRETOR_FOTOGRAFIA`, `SONOPLASTA`, `EDITOR`, `ROTEIRISTA` e `EFEITOS_VISUAIS`.

`servicoPrincipal` é opcional no corpo da recomendação e aceita serviços atômicos e pacotes aninhados:

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

## Executar a API fora do Compose

`npm run dev` inicia apenas a API no host. É necessário ter PostgreSQL e RabbitMQ acessíveis e definir as variáveis `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` e `RABBITMQ_URL`. Sem `RABBITMQ_URL`, a aplicação usa o repositório local de profissionais. Ao executar o sistema pelo Compose, use a API em `http://localhost:3333`; não inicie outra cópia com `npm run dev` na mesma porta.

As imagens usam Node 22 Alpine, PostgreSQL 15 Alpine e RabbitMQ 3 Management Alpine. A configuração Compose está preparada para Windows e Linux com Docker Compose; o funcionamento no Ubuntu ainda precisa ser validado neste ambiente.

## Testes

```bash
npm install
npm test -- --exclude "src/tests/integration/**"
```

Esse comando executa os testes unitários sem depender do PostgreSQL. Os testes de integração exigem PostgreSQL disponível e `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` configurados para o banco de teste.

Outros comandos:

```bash
npm test
npm run test:watch
npm run test:coverage
npx tsc --noEmit
```

No estado atual, `npx tsc --noEmit` ainda reporta dois erros de tipagem em `src/tests/composite/ServicoProjeto.test.ts`; eles precisam ser corrigidos para que a checagem TypeScript completa passe.

## Padrões de projeto

| Padrão | Implementação | Uso |
| --- | --- | --- |
| Strategy | `EstrategiaCosseno`, `FiltragemColaborativa`, `RegraBaixoOrcamento` | Algoritmos de recomendação intercambiáveis |
| Template Method | `OrquestradorEquipe`, `OrquestradorPadrao` | Etapas comuns de recomendação |
| Observer | `EmissorRecomendacao` e observadores | Notificações de eventos locais |
| Visitor | `ValidadorConsistencia`, `CalculadorCompatibilidade`, `GeradorRelatorio` | Operações sobre objetos do domínio |
| Prototype | `Projeto.clonar()` e subclasses | Clonagem de projetos |
| Factory Method / Abstract Factory | `FabricaProjetoBase` e fábricas concretas | Criação de projetos e colaboradores |
| Adapter | Adaptadores de armazenamento, pagamento e profissionais | Integrações substituíveis; provedores atuais são simulados |
| Composite | `ServicoAtomico`, `PacoteServico` | Serviços e pacotes hierárquicos |
| Decorator | `CacheDecorator`, `AuditoriaDecorator`, `CompressaoDecorator` | Cache, auditoria e compressão |

## Estrutura principal

```text
src/
  adapters/       adaptadores e provedores simulados
  composite/      serviços atômicos e pacotes
  entities/       entidades do domínio
  factory/        fábricas e composição de recomendação
  gerador/        implementações de Visitor
  messaging/      conexão RabbitMQ, filas e comandos
  observer/       eventos e observadores
  repository/     persistência com TypeORM
  routes/         rotas Fastify e validação Zod
  services/       consumidores de profissionais, projetos e notificações
  service/        casos de uso da API
  strategy/       estratégias e decorators
  tests/          testes unitários e de integração
app.ts            montagem da API
server.ts         inicialização do banco e servidor HTTP
docker-compose.yml
```

## Limitações conhecidas

- A API mantém dados de projeto usados na recomendação no banco da API; o serviço de projetos também mantém uma projeção recebida por RabbitMQ.
- O serviço de notificações registra eventos, mas não envia e-mails nem mensagens externas.
- Os adaptadores de nuvem, pagamento e cadastro de profissionais são simulados.
- Cache e contadores de IDs são locais ao processo. IDs podem colidir após reiniciar com dados persistidos.
- Não há autenticação, migrações ou seed de dados.
- Latência abaixo de 2 segundos, 100 requisições simultâneas e compatibilidade com Ubuntu não foram medidos nesta revisão.
