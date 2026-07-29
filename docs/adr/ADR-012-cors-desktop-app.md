# ADR-012 — CORS explícito para a origem do app desktop empacotado

## Status
Aceito

## Data
2026-07-29

## Contexto
Após implementar o onboarding com UI (Fase 5), o app desktop compilado (`tauri build`, não `tauri dev`) parou de conseguir se comunicar com o Control Plane — a tela sempre mostrava "desconectado" / "Failed to fetch", mesmo com o Control Plane rodando e respondendo normalmente a `curl`.

Investigação (nesta ordem, todas descartadas antes da causa real):
1. Suspeita de cache do WebView2 (`~/AppData/Local/dev.ultron.desktop/EBWebView`) — removido, não resolveu.
2. Suspeita de binário desatualizado — descartado (`strings`/grep no `.exe` confirmaram o bundle JS correto embutido).
3. Suspeita de bloqueio por Application Control do Windows — o usuário já havia desativado essa política antes do teste; não era a causa.
4. **Causa real, confirmada pelo usuário abrindo o DevTools do app (F12) e lendo o Console:**
   ```
   Access to fetch at 'http://127.0.0.1:4577/health' from origin 'http://tauri.localhost'
   has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present.
   ```

O Control Plane (Fastify) nunca teve CORS configurado. Isso não aparecia nas Fases 1–4 porque provavelmente só havia sido testado achando que `tauri dev` (origem `http://localhost:1420`) tinha o mesmo comportamento do build de produção — mas builds empacotados do Tauri 2 servem o frontend sob a origem `http://tauri.localhost` (Windows) ou `tauri://localhost` (outras plataformas), que é estritamente cross-origin em relação a `http://127.0.0.1:4577`.

## Decisão
Registrar `@fastify/cors` no Control Plane, permitindo explicitamente apenas as origens conhecidas do app desktop:
```text
tauri://localhost
http://tauri.localhost
https://tauri.localhost
http://localhost:1420   (dev server)
```
com métodos `GET, POST, PUT, DELETE` declarados explicitamente (o plugin não infere corretamente todos os métodos usados nas rotas registradas depois dele sem essa declaração).

## Alternativas consideradas
- **CORS aberto (`origin: true` / `*`):** rejeitado — o Control Plane escuta em loopback mas não há razão para aceitar qualquer origem arbitrária; a lista fechada de origens conhecidas do próprio app é mais segura e não tem custo de manutenção real (a lista muda apenas se a estratégia de empacotamento do Tauri mudar).
- **Desabilitar CSP/usar `webview.disable-web-security` no Tauri:** rejeitado — enfraqueceria a superfície de segurança do próprio app por um problema que é do lado do servidor, não do cliente.

## Consequências
- Todo endpoint HTTP do Control Plane agora responde com headers CORS corretos para a origem do app; testado com `curl` real (incluindo preflight `OPTIONS` para `DELETE`/`PUT`, que exigiu declarar `methods` explicitamente no registro do plugin) e validado no app real após a correção.
- 2 testes automatizados novos (`server.test.ts`) cobrem que o header `Access-Control-Allow-Origin` está presente para `http://tauri.localhost`, e que o preflight libera `DELETE`/`PUT` — para que uma regressão futura seja pega antes de chegar ao usuário.
- **Lição de processo**: `app.inject()` do Fastify (usado em todos os testes até agora) não simula o comportamento de CORS de um browser real — por isso este bug não foi pego pelos 98 testes que passavam antes desta correção. Validação manual no app real continua necessária para esta classe de problema.
