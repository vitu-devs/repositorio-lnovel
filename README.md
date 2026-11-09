# Nexustoons — novels no LNReader

Plugin independente, em português, dedicado às novels da Nexustoons. Não inclui mangás.

## Instalação

1. No LNReader, abra **Explorar / Browse → menu ⋮ → Repositórios / Repositories**.
2. Toque em **+** e adicione:

   `https://raw.githubusercontent.com/vitu-devs/repositorio-lnovel/main/plugins.min.json`

3. Volte a **Plugins**, habilite o idioma **Português** se necessário e instale **Nexustoons (Novels)**.
4. Em **Fontes / Sources**, abra **Nexustoons (Novels)** e pesquise **Shadow Slave**.
5. Abra a obra, adicione à biblioteca e escolha um capítulo.

## Funcionamento e limites

- Catálogo, busca, novidades, capas, sinopse e capítulos em ordem crescente.
- Texto com parágrafos e formatação para o leitor do LNReader.
- Capítulos restritos são marcados; o plugin não implementa login, compras ou verificações interativas. Leia esses capítulos no site.
- A extensão faz apenas consultas à API que o cliente público utiliza. Não registra leituras nem modifica sua conta no site.
- Mudanças na API ou no formato das respostas podem exigir uma atualização.
- Validação automática em Node com o arquivo compilado e ambiente sem APIs exclusivas de Node/navegador. A validação final no Android depende de instalar no aparelho.

## Desenvolvimento

Node.js 22 ou superior:

```sh
npm ci
npm run build
npm test
npm run test:live
npm run format:check
```

O código-fonte está em `plugins/portuguese/nexustoons.ts`. O build gera `dist/nexustoons.js` em CommonJS/ES5 e `plugins.min.json`. Mantenha ambos publicados na branch `main`. Atualizações precisam incrementar a versão do plugin e do manifesto.

A implementação segue o contrato do [LNReader Plugins](https://github.com/LNReader/lnreader-plugins). O ícone pertence à Nexustoons. Este repositório não hospeda capítulos ou livros.

## Atualização 1.0.1 — leitura em voz alta

Corrige capítulos enviados pela Nexus como texto solto separado por `<hr>`. O leitor de voz do LNReader 2.1.4 percorre elementos HTML e ignorava esses trechos. Agora o plugin envolve o texto em parágrafos, preservando a ordem e a formatação existente.

O teste usa o trecho original do leitor TTS da versão 2.1.4 (licença em `scripts/fixtures/LNREADER-LICENSE`). Além dos testes sintéticos, a leitura integral e ordenada dos capítulos 0, 1 e 2 de Shadow Slave foi verificada no site. Isso valida a fila de texto, não o áudio produzido por um aparelho Android.

No LNReader, atualize **Nexustoons (Novels)** para **1.0.1**, feche e reabra o aplicativo. Para capítulos baixados anteriormente, remova somente o download do capítulo e baixe novamente: o HTML antigo não é alterado pela atualização do plugin. Preserve a obra na biblioteca e os dados do aplicativo.

A voz é escolhida no LNReader em **configurações do leitor → TTS → Engine / Voice**. Ela depende dos motores instalados no Android; o plugin não instala nem substitui vozes. No Galaxy, procure **Texto para voz** nas configurações, selecione um motor e instale os dados de voz em português do Brasil. Depois escolha o mesmo motor e uma voz `pt-BR` no LNReader. Compare as vozes disponíveis; uma voz neural externa exige um motor compatível ou uma integração adicional, não apenas esta extensão.
