# STATUS DO PROJETO ULTRON

> Arquivo de continuidade. Se o contexto da conversa for perdido/resetado (ou você estiver retomando em outra máquina), leia este arquivo primeiro para saber exatamente onde o trabalho parou e o que fazer a seguir.

Última atualização: 2026-07-31 — Fase 7 (Voz) em andamento, ~85% completa.

---

## 1. O QUE É ESTE PROJETO

Superassistente pessoal/profissional local-first ("Projeto Ultron"), especificado em [prompt_Inicial.md](prompt_Inicial.md) (4313 linhas).

Resumo rápido: monólito modular local (Tauri 2 + React no desktop, Control Plane em Node + Fastify + WebSocket + SQLite), com adapters para OpenClaw, Ollama, Claude Code, Codex, routers de modelo, ElevenLabs, Gmail, Calendar, WhatsApp, GitHub. 20 fases de implementação.

Repositório remoto: https://github.com/Vin1-SF19/Projeto_Ultron.git (branches `master`/`develop` sincronizadas até o commit `77124c0`; branch de trabalho atual `phase/07-voice`, ainda **não mergeada** — ver seção 3).

---

## 2. COMO RETOMAR EM OUTRA MÁQUINA (leia isto primeiro)

```bash
git clone https://github.com/Vin1-SF19/Projeto_Ultron.git
cd Projeto_Ultron
git checkout develop   # já tem tudo até o fim da Fase 6 + boa parte da Fase 7
pnpm install
pnpm -r build
```

Pré-requisitos de ambiente que a máquina nova vai precisar:
- **Node.js 22.5+** (usa `node:sqlite` nativo — não precisa instalar `better-sqlite3`).
- **Rust + Cargo** (para compilar o Tauri) — se for só mexer no Control Plane/lógica, não é necessário.
- **Visual Studio Build Tools** (Windows) — necessário só para compilar o Tauri.
- **Ollama** local rodando (`ollama serve`, com pelo menos um modelo baixado, ex. `ollama pull llama3.2:1b`) para testar o chat de texto/voz de ponta a ponta.
- **Conta ElevenLabs com créditos** — ver alerta crítico na seção 4. Sem crédito, TTS/STT retornam erro real (não simulado) e isso é o comportamento correto, não um bug.

Para rodar o Control Plane manualmente:
```bash
cd apps/control-plane
node dist/main.js
# sobe em http://127.0.0.1:4577
```

Para rodar o app desktop em modo dev:
```bash
cd apps/desktop
pnpm exec vite
# abre em http://localhost:1420 — mas sem CSP do Tauri (ver ADR-012), então CORS não é 100% representativo do app empacotado
```

Para buildar o app Tauri real (produção):
```bash
export PATH="$HOME/.cargo/bin:$PATH"   # no Windows/Git Bash o cargo pode não estar no PATH do shell não-interativo
cd apps/desktop
pnpm tauri build
# gera apps/desktop/src-tauri/target/release/ultron-desktop.exe
# e o instalador em .../target/release/bundle/nsis/Ultron_0.1.0_x64-setup.exe
```
**Atenção**: se o `.exe` anterior ainda estiver aberto, a build falha com "Acesso negado" ao tentar sobrescrever o arquivo — feche o processo antes (`Get-CimInstance Win32_Process -Filter "Name='ultron-desktop.exe'"` para achar o PID, confirme o `CommandLine` antes de matar).

---

## 3. ONDE PARAMOS EXATAMENTE (ESTADO ATUAL)

**FASES 0-6: 100% COMPLETAS**, mergeadas em `master`/`develop`, com push feito.

**FASE 7 (VOZ): ~85% completa.** Branch `phase/07-voice` tem commits além do que já está em `develop`/`master` — **na verdade, ao reler o histórico, todos os commits da Fase 7 até `77124c0` (streaming de TTS + correção do proxy) já foram mergeados e enviados ao GitHub**. Então `develop`/`master` já refletem o estado mais atual. A branch local `phase/07-voice` está no mesmo commit.

### O que falta para fechar a Fase 7 (em ordem de prioridade)

1. **Testar o streaming de TTS com créditos ElevenLabs disponíveis.** A conta usada nesta sessão ficou sem créditos (`quota_exceeded`, "0 credits remaining") durante os testes manuais. O código foi validado como correto (o erro 502 observado era a mensagem real da API sendo repassada fielmente, não um bug), mas **a validação visual final do áudio tocando incrementalmente via MediaSource não foi 100% concluída** por falta de crédito. Ação: adicionar créditos à conta ElevenLabs (ou trocar de conta/key) e repetir o teste manual: abrir o app, mandar uma mensagem, confirmar que o áudio começa a tocar antes da resposta completa ter sido sintetizada (não precisa de teste automatizado novo — os testes unitários com mocks já cobrem a lógica).
2. **Task #47 pendente: integrar `Identidade_Ultron.md` como system prompt de personalidade.** O usuário preencheu `Identidade_Ultron.md` (1672 linhas, já commitado na raiz) com a personalidade que o Ultron deve ter. Hoje o único system prompt injetado é a instrução fixa de idioma pt-BR em `apps/control-plane/src/chat-messages.ts` (função `buildChatMessages`). **Falta**: ler `Identidade_Ultron.md`, decidir como resumir/injetar esse conteúdo (provavelmente concatenado à instrução de idioma existente, ou como uma segunda mensagem de sistema), implementar, testar que o Ultron passa a se autodenominar corretamente, e **então apagar `Identidade_Ultron.md` da raiz** (pedido explícito do usuário: "depois que colocar o sistema nele, pode apagar-lo da raiz"). Provavelmente vale mover o conteúdo relevante para dentro do próprio código (`chat-messages.ts` ou um novo arquivo `identity-prompt.ts`) antes de apagar o `.md`.
3. **Critérios da Fase 7 ainda não verificados/fechados** (ver `prompt_Inicial.md`, seção "FASE 7 — VOZ"):
   - ✅ push-to-talk (clique único: clica para gravar, clica de novo para parar — funcionalmente equivalente, não é "segurar", usuário não pediu para mudar)
   - ✅ STT ElevenLabs, TTS ElevenLabs, seleção de voz, fallback textual, interrupção, lip sync (Camada 1), métricas — todos implementados e testados
   - ✅ streaming (de texto, via WebSocket) — Fase 6; streaming de áudio TTS implementado nesta sessão (ver item 1 acima para validação final)
   - ⚠️ **transcrição parcial**: NÃO implementada. O endpoint STT da ElevenLabs (`scribe_v1`) usado é request/response (manda o áudio completo, recebe o texto completo) — não há streaming de transcrição parcial enquanto o usuário ainda fala. Verificar se a ElevenLabs oferece isso antes de assumir que não dá para fazer.
   - ⚠️ **resposta rápida**: depende do modelo Ollama local (`llama3.2:1b` é pequeno mas ainda assim demora alguns segundos para respostas longas) — não é algo resolvível no código, é característica do hardware/modelo escolhido pelo usuário. Não tratar como bug.
   - ⚠️ **reconexão**: não foi testado explicitamente o cenário "WebSocket cai no meio de uma conversa por voz e reconecta sozinho". O `ChatSocket` (`apps/desktop/src/chat/chat-socket.ts`) já tem lógica de status `connecting/open/closed` mas não tenta reconectar automaticamente após `close` — só reflete o estado. Verificar se isso é suficiente ou se falta reconexão automática com backoff.
   - ✅ erro tratado, sem bloquear chat, custo registrado — feitos.

### Tarefas registradas no sistema de tasks (para quem retomar via ferramenta de tasks)
- Task #47 `pending`: Integrar Identidade_Ultron.md como system prompt.
- Task #51 `in_progress`: Revisar critérios restantes da Fase 7 (streaming de áudio, reconexão, erro tratado) — ver itens acima.
- Task #52 `in_progress`: Streaming real de TTS via MediaSource — **código completo, só falta validação final com créditos ElevenLabs** (ver item 1 acima). Pode ser marcada como concluída assim que a validação visual passar.

---

## 4. ALERTAS CRÍTICOS PARA A PRÓXIMA SESSÃO

### 🔴 Créditos da ElevenLabs esgotados
A conta ElevenLabs usada nesta sessão (chave salva no Windows Credential Manager como `ultron:voice:elevenlabs`) ficou com **0 créditos restantes** ("quota_exceeded") durante os testes desta sessão. TTS e STT vão falhar com erro real até que:
- a conta seja recarregada, ou
- uma nova chave/conta seja configurada via `PUT /api/v1/settings/voice`.

Isso **não é um bug** — o Control Plane trata e reporta esse erro corretamente (`voice_synthesis_failed` / `voice_transcription_failed` com a mensagem real da ElevenLabs). Não gastar tempo "depurando" isso: só trocar/recarregar a credencial.

### 🔴 Identidade_Ultron.md ainda na raiz, ainda não integrado
Arquivo com 1672 linhas, contém a personalidade/system prompt que o usuário quer para o Ultron. **Não foi lido nem integrado ao código ainda.** O usuário pediu explicitamente para apagá-lo da raiz depois de integrado — não apagar antes disso.

### 🟡 Windows Application Control pode bloquear o .exe não assinado
Pendência antiga (desde a Fase 5), o usuário mesmo disse "isso a gente vê depois" — relevante só quando chegar na Fase 18 (empacotamento/assinatura de código). Não é bloqueante agora.

### 🟡 Ambiente de preview/browser automatizado não tem microfone real
Se estiver usando um agente com browser automatizado para testar, ele não consegue testar a gravação de voz de verdade (getUserMedia é bloqueado no sandbox) — isso precisa ser validado manualmente pelo usuário no app real.

---

## 5. RESUMO POR FASE

- **Fase 0**: auditoria de 6 projetos de referência, arquitetura, threat model, ADRs 001-004.
- **Fase 1**: monorepo, Control Plane (Fastify+WebSocket+SQLite), app Tauri mínimo.
- **Fase 2**: Event Bus, Audit Log, erros padronizados, correlation IDs, replay por cursor.
- **Fase 3**: OpenClaw Adapter, testado contra Gateway real.
- **Fase 4**: RoutingEngine com fallback/circuit breaker, Ollama local testado com inferência real.
- **Fase 5**: keychain (`SecretStore`), configuração de providers em runtime, sistema de autonomia/permissões, seleção de pasta de projeto, onboarding com UI retomável.
- **Fase 6**: streaming real de tokens (WebSocket), rosto SVG original com 14 estados + partículas, layout de Home em 3 colunas, chat funcional, modo de conversa por voz contínua como padrão (chat de texto oculto, habilitável via toggle).
- **Fase 7 (em andamento)**: voz completa via ElevenLabs — ver detalhes abaixo.

### Checklist Fase 7 (detalhado)

**Backend (`apps/control-plane`, `packages/elevenlabs-adapter`)**
- [x] `packages/elevenlabs-adapter`: cliente HTTP para `/v1/voices`, `/v1/text-to-speech`, `/v1/text-to-speech/{id}/stream` (streaming real, confirmado chunked), `/v1/speech-to-text`.
- [x] `VoiceConfigStore`: persiste `voiceId`/`voiceName` no SQLite (migration `007_voice_config`), apiKey só no keychain.
- [x] Endpoints: `GET/PUT /api/v1/settings/voice`, `GET /api/v1/voices`, `POST /api/v1/voice/speak`, `POST /api/v1/voice/speak/stream` (proxy chunked sem bufferizar), `POST /api/v1/voice/transcribe`.
- [x] Métricas reais no `AuditLog`: caracteres enviados, bytes de áudio recebidos/enviados, `voiceId` usado — nunca custo monetário inventado.
- [x] Bug corrigido: erros dentro do `start()` assíncrono do `ReadableStream` de proxy não caíam no `try/catch` externo (viravam unhandled rejection) — agora capturado e propagado via `controller.error()`.

**Frontend (`apps/desktop`)**
- [x] `voice-client.ts`: `synthesizeSpeech` (não-streaming), `synthesizeSpeechStreamingIntoMediaSource` (streaming via MediaSource Extensions), `isMediaSourceStreamingSupported()`, `transcribeAudio`.
- [x] `voice-recorder.ts`: `VoiceRecorder` (captura de microfone via `MediaRecorder`, sem exigir permissão adicional do Tauri — o WebView2/WKWebView cuida disso nativamente).
- [x] `lip-sync.ts`: `AmplitudeLipSyncDriver` — mede amplitude real do áudio via Web Audio `AnalyserNode`, controla a abertura da boca do rosto. **Usa `setInterval`, não `requestAnimationFrame`** — bug real encontrado e corrigido nesta sessão: rAF é pausado pelo navegador quando a janela perde o foco, congelando a boca (o áudio continuava tocando normalmente).
- [x] `Face.tsx`: ganhou uma boca (elemento que não existia no design anterior), controlada por prop `mouthOpenness`.
- [x] `ChatPanel.tsx`: modo de conversa por voz contínua (fala → transcreve → envia automaticamente → Ultron responde falando), botão "Parar de falar" + interrupção automática ao clicar no microfone enquanto o Ultron fala, streaming de TTS com fallback automático para modo não-incremental quando MediaSource não é suportado.
- [x] Correção de CSP: `media-src 'self' blob:` adicionado a `tauri.conf.json` — sem isso, o áudio nunca tocava no app empacotado (bug real reportado pelo usuário e corrigido).

**Testes**: 135 testes automatizados no total no monorepo, todos passando. Build/lint/typecheck limpos em todos os pacotes.

---

## 6. LIÇÕES DE DIAGNÓSTICO DESTA SESSÃO (para não repetir investigação)

1. **"Failed to fetch" ou áudio que não toca no app Tauri empacotado quase sempre é CORS ou CSP**, não um bug de lógica. CORS: origem real do WebView2 em produção é `http://tauri.localhost` (Windows) / `tauri://localhost` (outras plataformas). CSP: precisa de `media-src 'self' blob:` para o `<audio>` tocar blob URLs (descoberto nesta sessão — o TTS "funcionava" no backend mas o áudio nunca tocava no app real).
2. **`app.inject()` do Fastify não simula CORS nem CSP** — sempre validar manualmente no app real para bugs desse tipo.
3. **`requestAnimationFrame` é pausado pelo navegador quando a janela perde o foco** — qualquer lógica de animação/medição que precise continuar rodando em background (como o lip sync) deve usar `setInterval` em vez de rAF.
4. **Erros dentro do `start()` de um `ReadableStream` custom não propagam automaticamente** para quem consome o stream — sempre envolver em `try/catch` e chamar `controller.error(e)` explicitamente, senão vira unhandled rejection silencioso.
5. **Ao investigar um "502" ou erro genérico de proxy, sempre olhar o corpo real da resposta antes de suspeitar de bug de concorrência/timing** — nesta sessão, um 502 que parecia ser bug de streaming era na verdade a API upstream (ElevenLabs) reportando `quota_exceeded` de forma legítima.
6. **`vi.stubGlobal('navigator', {...})` substitui o objeto inteiro** e pode vazar entre testes de forma sutil (quebra o cleanup de outros componentes que dependem de outras props do `navigator`). Preferir `Object.defineProperty(navigator, 'mediaDevices', {configurable: true, value: ...})` para stubar só a propriedade necessária.
7. **No Git Bash do Windows, `cargo`/`rustc` podem não estar no `$PATH`** mesmo estando instalados e funcionando no PowerShell — usar `export PATH="$HOME/.cargo/bin:$PATH"` antes de rodar `pnpm tauri build` via Bash.
8. **Notificações de conclusão de comandos em background podem reportar "completed"/exit 0 mesmo quando o comando teve exit code diferente de 0** — sempre ler o arquivo de output real e procurar a linha de sucesso/erro esperada, nunca confiar só no resumo da notificação.
9. **Antes de encerrar qualquer processo por PID, sempre confirmar via `Get-CimInstance Win32_Process | Select ProcessId, CommandLine`.**

---

## 7. DECISÕES TOMADAS (ADRs)

ADR-001 a ADR-012 — ver [docs/adr/](docs/adr/). Nenhum ADR novo foi criado na Fase 7 até agora (decisões de streaming de TTS via MediaSource e lip sync via setInterval foram registradas nas mensagens de commit, por serem reversíveis/implementação, não arquitetura).

---

## 8. ESTRUTURA DE CÓDIGO ATUAL (para orientação rápida)

```text
packages/
  elevenlabs-adapter/    NOVO (Fase 7) — cliente HTTP para voz (voices, TTS, TTS stream, STT)
  contracts/src/voice.ts NOVO (Fase 7) — VoiceConfig, VoiceOption
  database/migrations/007_voice_config.ts  NOVO (Fase 7)

apps/control-plane/src/
  voice-config-store.ts  NOVO (Fase 7) — persiste config de voz (SQLite + keychain)
  chat-messages.ts       instrução de idioma pt-BR injetada em toda mensagem — AQUI vai a identidade também (task #47)
  server.ts              + endpoints /api/v1/settings/voice, /api/v1/voices, /api/v1/voice/speak(/stream), /api/v1/voice/transcribe

apps/desktop/src/
  chat/voice-client.ts   síntese/transcrição de voz, incl. streaming via MediaSource
  chat/voice-recorder.ts captura de microfone
  chat/lip-sync.ts       AmplitudeLipSyncDriver (Web Audio API + setInterval)
  chat/ChatPanel.tsx     modo de conversa por voz contínua, interrupção, streaming de TTS
  face/Face.tsx          + boca controlada por mouthOpenness
```

---

## 9. PRÓXIMOS PASSOS IMEDIATOS (ordem sugerida)

1. Recarregar créditos da conta ElevenLabs (ou trocar de chave) e validar visualmente o streaming de TTS de ponta a ponta no app real.
2. Ler `Identidade_Ultron.md`, decidir a estratégia de integração (provavelmente resumir/injetar no `chat-messages.ts`), implementar, testar, depois apagar o `.md` da raiz.
3. Decidir/testar reconexão automática do WebSocket (`chat-socket.ts`) e transcrição parcial (verificar se a ElevenLabs oferece streaming de STT).
4. Fechar a Fase 7 (marcar tasks #47, #51, #52 como completas), fazer merge final para `develop`/`master`, push.
5. Ler a seção "FASE 8 — FILA PERSISTENTE" em `prompt_Inicial.md` e planejar antes de começar a codar.

---

## 10. REGRAS DE OURO (não esquecer em nenhuma sessão futura)

- Nunca instalar componentes de sistema sem confirmação explícita, salvo janela de autonomia vigente e específica.
- **Credenciais de provider pago/serviço externo são SEMPRE bloqueantes** — tratar com máximo cuidado quando fornecidas (nunca reexibir em terminal/log). Chaves da sessão ficam salvas apenas no keychain do SO, nunca em texto plano no banco/repositório.
- Nunca inventar que um comando funcionou — sempre registrar comando, resultado, exit code, erro real.
- **Antes de encerrar qualquer processo por PID, inspecionar o `CommandLine` completo.**
- Antes de usar qualquer SDK/pacote de terceiro, verificar com `npm view` que a versão real existe e não é um placeholder.
- Um evento nunca deve ser publicado no EventBus antes de estar persistido no Event Store.
- Toda resposta de erro da API segue o envelope `{ error: { code, message, correlationId, details? } }`.
- Toda integração externa é opcional e desligada por padrão.
- Nunca encadear dois routers de modelo no mesmo caminho de requisição.
- Nunca instalar/baixar modelo local automaticamente sem confirmação.
- Nunca inventar custo de provider — quando desconhecido, `estimatedCost` fica `undefined`. Métricas de voz registram unidades reais (caracteres, bytes), nunca R$/USD estimado.
- Identidade visual do Ultron deve ser 100% original — ícone oficial já gerado a partir da arte do usuário (Fase 5).
- **App Tauri empacotado roda sob origem `http://tauri.localhost`/`tauri://localhost`** — todo novo endpoint do Control Plane precisa estar coberto pela lista de CORS em `ALLOWED_ORIGINS` (server.ts), e a CSP em `tauri.conf.json` precisa cobrir qualquer novo tipo de recurso (ex: `media-src` para áudio).
- Testes automatizados com `app.inject()` não substituem validação manual no app real para bugs de CORS/CSP/rede/browser/foco de janela.
- Sempre rebuildar (`pnpm --filter <pacote> build`) pacotes internos consumidos via `dist/` antes de testar mudanças neles refletidas em outro pacote.

---

*Atualize este arquivo ao final de cada fase concluída ou sempre que houver uma mudança relevante de direção, para que qualquer sessão futura (nesta máquina ou em outra) possa retomar o trabalho sem perda de contexto.*
