#!/usr/bin/env node
/**
 * trophy-lot-3.js — Story 11.7, lote 3 de Lottie dos troféus sem animação.
 *
 * Lote 3: os 27 litúrgicos de maio a julho (`month` 5, 6 e 7 em
 * `packages/gamification/src/liturgicalTrophies/data.ts`, inclusive
 * `lt_pedro_paulo` e `lt_santana`). Todos com 3 níveis (como
 * `getSeasonalTier`): x.json = bronze, x_t2 = prata, x_t3 = ouro.
 *
 * Segue `_bmad-output/planning-artifacts/guia-de-movimento-dos-trofeus.md`:
 * cada troféu tem o gesto da tabela da §6, feito de 2 a 4 peças animadas em
 * camadas separadas (nome `G_*`), sem medalha nem disco em volta. A prata
 * acrescenta o que a tabela diz (camadas `T2_*`) e o ouro, o resto (`T3_*`).
 * Regras da §6: a luz usa só a `luzSuave` (sem esticar); santo representado
 * por pessoa usa o busto simples (`busto`, no estilo de Maria e Águeda); nada
 * de emoji infiel à tradição católica (terço, escapulário, custódia, medalha
 * de São Bento e crucifixo são desenhados). Mesmo formato, `ART_SCALE`, janela
 * visível, base comum e quadro final dos lotes 1 e 2 (montagem comum em
 * `scripts/lottie-lib/trophy-kit.js`).
 *
 * Fontes das peças (copiadas para a tabela NEW_ICONS; nada é baixado em tempo
 * de execução). Além das peças novas abaixo, o lote reaproveita peças da tabela
 * comum `scripts/lottie-lib/icons.js` (REUSED), das mesmas fontes:
 *  - Twemoji (https://github.com/jdecked/twemoji, v15.1.0), licença CC-BY 4.0
 *    — © Twitter, Inc. e colaboradores.
 *  - Bootstrap Icons (https://github.com/twbs/icons, v1.11.3), licença MIT
 *    — © The Bootstrap Authors.
 *
 * Peças principais desenhadas (tabela DRAWN), compostas de formas próprias,
 * feitas aqui mesmo ou em `scripts/lottie-lib/desenhos.js`; quando o desenho
 * também embrulha peças da tabela acima (com a fonte citada), ele as lista em
 * `uses`, e nenhuma delas é a peça principal de outro troféu: desenho-plaina,
 * desenho-maria-azinheira, desenho-arado, desenho-rosa-na-neve,
 * desenho-visitacao, desenho-custodia, desenho-sagrado-coracao,
 * desenho-evangelho-na-pedra, desenho-menino-sobre-livro, desenho-crucifixo,
 * desenho-chapeus, desenho-fogueira, desenho-baculo, desenho-chaves-e-espada,
 * desenho-medalha-sao-bento, desenho-escapulario, desenho-vaso-de-perfume,
 * desenho-vela-e-livro, desenho-lamparina, desenho-concha-de-vieira,
 * desenho-sant-ana-e-joaquim, desenho-vassoura, desenho-ihs,
 * desenho-doze-chamas, desenho-tome-e-jesus e desenho-jesus-glorioso. Todas as desenhadas: figuras de
 * corpo inteiro no estilo dos bustos (`figura`: Maria de Fátima, Jesus
 * glorioso, Jesus ressuscitado e São Tomé, com o braço e a mão de Tomé),
 * bustos (pastorinhos, Maria e Isabel, Menino Jesus, Maria do Carmo,
 * Sant'Ana, São Joaquim e a menina Maria), mãos de Maria e Isabel, plaina,
 * tábua, lascas, azinheira, arado, sulco, campo, neve, figos, círculo de chamas,
 * monte, pegadas, custódia, cruz do Sagrado Coração, ramo de oliveira,
 * crucifixo, terço católico, chapéu de cardeal (galero), chapéu de chanceler,
 * lenha da fogueira, fio de água, concha de vieira, báculo, mitra, rede de
 * pesca, chaga com a luz, esquadro, medalha de São Bento (frente com a cruz e
 * verso), escapulário marrom, vaso de perfume e tampa, aroma, livro fechado
 * das revelações, bordão de peregrina com bolsa, lamparina, cedro do Líbano, bordão,
 * cabaça, vassoura, prato, o monograma IHS no sol, as chamas (`chamaShapes`),
 * os livros abertos (`livroAbertoShapes`), a nuvem de Fátima, a rosa de Santa
 * Rita e a pedra de São Barnabé.
 *
 * Uso: node scripts/trophy-lot-3.js
 * Recusa (e não escreve) qualquer id que já esteja em APPROVED_LOTTIE.
 */
const lib = require("./lottie-lib");
const kit = require("./lottie-lib/trophy-kit");
const { ICONS: SHARED_ICONS } = require("./lottie-lib/icons");
const { rect, forma, poligono, fill, hostiaShapes, espinhosShapes, velaComprida, brilho, chuva, petala, PELE, busto, figura, OMBRO_D, CHAGA, chamaShapes, livroAbertoShapes, tercoShapes, conchaShapes, espelhar, transladar } = require("./lottie-lib/desenhos");
const { anim, trajeto, pulo, abrir, onda, aparecer, pop, pulsar, giro, hex } = lib;
const { END, L, add, flutuar, deslocar, stroke, reta, aureola, raios } = kit;

// ── Peças novas (fonte e licença por ícone) ──────────────────────────────────
const NEW_ICONS = {
  "twemoji-1fa93": {
    source: "Twemoji 1fa93.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#F4900C", d: "M35.22 30.741l-.024.024c-.97.97-2.542.97-3.511 0L7.835 6.915c-.582-.582-.582-1.525 0-2.107l1.429-1.429c.582-.582 1.525-.582 2.107 0l23.85 23.85c.969.97.969 2.542-.001 3.512z" },
      { fill: "#66757F", d: "M17.765 6.946L14.229 3.41c-.586-.586-1.535-.586-2.121 0L8.573 6.946c-2.128 2.092-3.85 3.015-6.055 3.056-.171 1.573.665 5.193 1.967 6.652 1.692 1.896 4.545 2.495 7.223 2.454-.134-2.363.437-4.422 2.521-6.506l3.535-3.536c.587-.585.587-1.535.001-2.12z" },
      { fill: "#CCD6DD", d: "M2.518 10.002C1.767 10.016.962 9.93.064 9.75c-.707 4.95 7.071 12.728 12.021 12.021-.193-.937-.328-1.819-.376-2.663-4.418-1.409-8.107-5.072-9.191-9.106z" },
    ],
  },
  "twemoji-1f331": {
    source: "Twemoji 1f331.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#77B255", d: "M22.911 14.398c-1.082.719-2.047 1.559-2.88 2.422-.127-4.245-1.147-9.735-6.772-12.423C12.146-1.658-.833 1.418.328 2.006c2.314 1.17 3.545 4.148 5.034 5.715 2.653 2.792 5.603 2.964 7.071.778 3.468 2.254 3.696 6.529 3.59 11.099-.012.505-.023.975-.023 1.402v14c0 1.104 4 1.104 4 0V23.51c.542-.954 2.122-3.505 4.43-5.294 1.586 1.393 4.142.948 6.463-1.495 1.489-1.567 2.293-4.544 4.607-5.715 1.221-.618-12.801-3.994-12.589 3.392z" },
    ],
  },
  "twemoji-1f33e": {
    source: "Twemoji 1f33e.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#FFCC4D", d: "M21.388.62c-1.852 0-4.235 1.849-6.22 4.826-2.322 3.483-1.069 5.989-.062 8.002.155.31.459.517.805.549.029.001.059.003.089.003.313 0 .61-.147.8-.4 2.394-3.193 6.211-8.196 6.907-8.893C23.895 4.52 24 4.265 24 4 24 1.508 22.65.62 21.388.62zm2.378 8.995c-1.21 0-2.575 1.132-4.565 3.785-2.124 2.831-2.461 5.313-1.095 8.047.151.302.444.507.779.546.038.005.077.007.115.007.295 0 .577-.131.769-.359 1.719-2.063 5.173-6.168 5.938-6.934.188-.188.293-.442.293-.707 0-1.085 0-4.385-2.234-4.385z" },
      { fill: "#77B255", d: "M29.874 11.517c-.268-.482-.878-.654-1.359-.385-7.171 3.983-13.783 14.15-16.367 19.609.838-10.195 5.569-20.044 13.559-28.034.391-.391.391-1.023 0-1.414s-1.023-.391-1.414 0C16.33 9.256 11.466 19.01 10.288 29.174c-.674-5.697-.978-13.91 1.625-19.768.225-.505-.003-1.096-.507-1.32-.505-.226-1.096.003-1.32.507-1.326 2.983-1.945 6.501-2.162 10.009C7.04 16.718 6.001 15 4.472 15h-.046c-.91 0-1.691.466-2.321 1.726-.247.494-.047.922.447 1.169.495.248 1.095.046 1.342-.447.311-.622.525-.77.521-.792.636.196 1.744 2.696 2.162 3.642.196.443.374.842.527 1.15.148.296.425.478.728.529.026 4.957.698 9.53 1.163 12.091l.02.11c.088.483.509.822.984.822.059 0 .119-.005.179-.016.122-.023.231-.071.331-.132.147.086.308.148.491.148s.344-.062.492-.147c.144.085.302.147.482.147H12c.53 0 .971-.448 1-.98.057-1.037 2.494-6.014 6.143-11.043.104-.015.207-.033.305-.082.244-.122.517-.272.808-.433.934-.517 2.494-1.38 3.106-1.02.149.088.638.535.638 2.558 0 .553.447 1 1 1s1-.447 1-1c0-2.236-.53-3.636-1.622-4.28-.783-.461-1.668-.424-2.54-.174 2.32-2.714 4.938-5.165 7.647-6.67.484-.269.658-.876.389-1.359z" },
    ],
  },
  "twemoji-2744": {
    source: "Twemoji 2744.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#88C9F9", d: "M19 27.586V8.415l4.828-4.829s.707-.707 0-1.415c-.707-.707-1.414 0-1.414 0L19 5.586V1s0-1-1-1-1 1-1 1v4.586l-3.414-3.415s-.707-.707-1.414 0c-.707.708 0 1.415 0 1.415L17 8.415v19.171l-4.828 4.828s-.707.707 0 1.414 1.414 0 1.414 0L17 30.414V35s0 1 1 1 1-1 1-1v-4.586l3.414 3.414s.707.707 1.414 0 0-1.414 0-1.414L19 27.586z" },
      { fill: "#88C9F9", d: "M34.622 20.866c-.259-.966-1.225-.707-1.225-.707l-6.595 1.767-16.603-9.586-1.767-6.595s-.259-.966-1.225-.707C6.24 5.297 6.5 6.263 6.5 6.263l1.25 4.664-3.972-2.294s-.866-.5-1.366.366c-.5.866.366 1.366.366 1.366l3.971 2.293-4.664 1.249s-.967.259-.707 1.225c.259.967 1.225.708 1.225.708l6.596-1.767 16.603 9.586 1.767 6.596s.259.966 1.225.707c.966-.26.707-1.225.707-1.225l-1.25-4.664 3.972 2.293s.867.5 1.367-.365c.5-.867-.367-1.367-.367-1.367l-3.971-2.293 4.663-1.249c0-.001.966-.26.707-1.226z" },
      { fill: "#88C9F9", d: "M33.915 13.907l-4.664-1.25 3.972-2.293s.867-.501.367-1.367c-.501-.867-1.367-.366-1.367-.366l-3.971 2.292 1.249-4.663s.259-.966-.707-1.225c-.966-.259-1.225.707-1.225.707l-1.767 6.595-16.604 9.589-6.594-1.768s-.966-.259-1.225.707c-.26.967.707 1.225.707 1.225l4.663 1.249-3.971 2.293s-.865.501-.365 1.367c.5.865 1.365.365 1.365.365l3.972-2.293-1.25 4.663s-.259.967.707 1.225c.967.26 1.226-.706 1.226-.706l1.768-6.597 16.604-9.585 6.595 1.768s.966.259 1.225-.707c.255-.967-.71-1.225-.71-1.225z" },
    ],
  },
  "twemoji-1f319": {
    source: "Twemoji 1f319.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#FFD983", d: "M30.312.776C32 19 20 32 .776 30.312c8.199 7.717 21.091 7.588 29.107-.429C37.9 21.867 38.03 8.975 30.312.776z" },
      { fill: "#FFCC4D", d: "M30.705 15.915c-.453.454-.453 1.189 0 1.644.454.453 1.189.453 1.643 0 .454-.455.455-1.19 0-1.644-.453-.454-1.189-.454-1.643 0zm-16.022 14.38c-.682.681-.682 1.783 0 2.465.68.682 1.784.682 2.464 0 .681-.682.681-1.784 0-2.465-.68-.682-1.784-.682-2.464 0zm13.968-2.147c-1.135 1.135-2.974 1.135-4.108 0-1.135-1.135-1.135-2.975 0-4.107 1.135-1.136 2.974-1.136 4.108 0 1.135 1.133 1.135 2.973 0 4.107z" },
    ],
  },
  "twemoji-1f409": {
    source: "Twemoji 1f409.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#3E721D", d: "M12.434 29.833c.626-6.708-4.417-7.542-6.417-6.083-1.097.8-1.353 2.323-.479 1.521 1.542-1.416 2.083-.375.917.375s-1.375 2.145-.083 1.188c1.292-.958 1.646-.334.646.895-.605.744.042 1.438 1.167-.062.938-1.251 3.2-1.294 2.662 2.99-.222 1.756 1.453.608 1.587-.824zm7.941-21.022c-.583-3.5-1.125-5.248-4.625-5.832s-6.417 1.75-6.417 1.75.583-3.5 2.333-4.667c.686-.458 1.167 1.75 1.75 1.75s1.167-1.75 2.917-1.75c.583 0 .583 1.75 1.167 1.75.583 0 2.243-.577 2.333 0 .126.812-.167 1.729.292 2.104s1.553-.148 1.901.489c.349.636-.61 1.553-.526 1.97s.719.583.526 1.375-.65.833-.692 1.417.885 1.081.692 1.686c-.192.606-.651.688-.859 1.459-.208.771.541.649.333 1.439-.208.79-.958.991-1.208 1.766-.25.774.666.941.208 1.691s-1.291.875-1.333 1.333.209.818.042 1.555c-.167.736-1.126.362-1.209.945s.209.875.209 1.583-.709.834-.625 1.542.75.167 1.167 1-.249 1.583.209 2.083 1.083-.667 1.708-.25c.625.417.677 1.25 1.359 1.375s.891-1.292 1.391-1.25 1.625.709 2.208.417.541-1.459 1-1.959 1.042-.041 1.458-.583-.145-1.175-.062-1.967.854-1.241.812-1.866-.667-.625-.917-1.292.458-1.25.208-1.875-1.332-.833-1.291-1.458.459-1.333.25-2.042-1.084-1.166-1.042-1.707.499-1.25.583-1.646-.749-.812-.666-1.479.624-.621.832-1.223c.208-.602-.749-.901-.249-1.672s.751-.27 1.167-.688c.416-.417-.001-1.334.416-1.542.417-.208 1.25-.042 1.667-.333s.417-.708.875-.875c.458-.167 1.042.542 1.417.542s1.041-.708 1.541-.542c.5.167 1.584 1.333.917 1.688s-5.751.605-5.792 2.938 2.793 12.917 1.959 15.583-4.291 8.334-8.25 7.25c-3.959-1.084-8.667-3.501-7.542-7.209 1.125-3.709 4.749-11.296 5.458-14.773z" },
      { fill: "#77B255", d: "M21 7.897c0 3.978-2.382 8.144-5.833 7.566-5.323-.89-5.606-2.587-6.417-1.546-2.917 3.743-4.644-.485-5.307-1.186C3.276 12.555 0 11.59 0 9.744c0-1.197 1.75-2.418 2.917-1.231 1.722-.043 8.167-6.156 12.25-6.156C19.25 2.356 21 5.435 21 7.897z" },
      { fill: "#292F33", d: "M14.583 7.062c0 .644-.523 1.167-1.167 1.167s-1.167-.523-1.167-1.167.523-1.167 1.167-1.167c.645.001 1.167.523 1.167 1.167z" },
      { fill: "#3E721D", d: "M2.917 10.271c0 .483-.392.292-.875.292s-.875.191-.875-.292.392-.875.875-.875.875.392.875.875z" },
      { fill: "#FFFFFF", d: "M11.083 11.144c0 .645-.392.583-.875.583s-.875.061-.875-.583c0-.644.392-2.333.875-2.333s.875 1.689.875 2.333zm-2.333.583c0 .645-.392.583-.875.583-.483.001-.875.062-.875-.583 0-.644.392-2.333.875-2.333s.875 1.689.875 2.333z" },
      { fill: "#3E721D", d: "M11.001 11.152c-3.095.442-6.215 1.224-7.558 1.579.167.177.403.579.709 1.021 1.472-.38 4.253-1.051 7.015-1.444.319-.046.54-.342.495-.661-.047-.32-.344-.542-.661-.495z" },
      { fill: "#77B255", d: "M20.946 8.937c0 4.375-1.714 8.201-2.946 11.17-1.333 3.212-1 9 4 9s6.511-3.191 7-5c1.358-5.021-2-8-2-13 0-9 8-7 8-6s-6.934 1.374-3 9S36 36 22 36 8 27.107 10 23.107c1.416-2.832 4-7.107.5-9.045-2.282-1.263 10.446-5.125 10.446-5.125z" },
      { fill: "#3E721D", d: "M11.335 7.771c-.256 0-.512-.098-.707-.293-.391-.391-.391-1.023 0-1.414.083-.083 2.081-2.043 5.374-2.043.552 0 1 .448 1 1s-.448 1-1 1c-2.435 0-3.945 1.442-3.96 1.457-.195.195-.451.293-.707.293z" },
      { fill: "#5C913B", d: "M10.708 25.333c.627-6.708-5.417-7.542-7.417-6.083-1.097.8-1.353 2.323-.479 1.521 1.542-1.416 2.083-.375.917.375-1.167.75-1.375 2.146-.083 1.188s1.646-.334.646.895c-.605.744.042 1.438 1.167-.062.938-1.251 4.2-1.294 3.662 2.99-.222 1.756 1.454.608 1.587-.824z" },
    ],
  },
  "twemoji-1f3fa": {
    source: "Twemoji 1f3fa.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#C1694F", d: "M27.843 11.9c.205-.371.39-.766.548-1.183 1.209-3.187.467-6.423-1.658-7.229-1.588-.602-3.499.326-4.868 2.164-.397-1.141-.548-2.209-.092-2.652h-8.228c.455.443.304 1.511-.093 2.652-1.369-1.838-3.28-2.766-4.868-2.164-2.125.806-2.868 4.042-1.659 7.229.158.418.344.812.548 1.183-1.184 1.166-2.157 2.879-2.157 5.563 0 6.17 8.227 13.39 9.256 15.447-.126.045 6.297.045 6.171 0C21.773 30.852 30 23.633 30 17.462c0-2.683-.973-4.396-2.157-5.562zM11.488 9.214c-.382.382-1.333.768-2.377 1.418-.111-.198-.214-.406-.299-.631-.617-1.624-.237-3.272.845-3.683.931-.354 2.076.329 2.772 1.559-.335.585-.673 1.069-.941 1.337zm15.017.787c-.085.225-.188.433-.299.632-1.044-.65-1.995-1.036-2.377-1.418-.268-.268-.606-.753-.94-1.337.695-1.23 1.841-1.913 2.772-1.559 1.081.41 1.461 2.058.844 3.682z" },
      { fill: "#272B2B", d: "M18.546 31.747H16.63c-2.057 0-5.142.971-5.142 3.027 0 1.029 3.942 1.143 6.085 1.143h.032c2.143 0 6.084-.113 6.084-1.143-.001-2.056-3.085-3.027-5.143-3.027zM30 17.462c0-2.611-.923-4.299-2.063-5.462H7.38c-1.14 1.163-2.063 2.852-2.063 5.462 0 1.481.481 3.022 1.216 4.538h22.251C29.519 20.484 30 18.943 30 17.462zM23.688 1.373c0-1.011-3.808-1.159-5.972-1.164H17.6c-2.164.005-5.972.152-5.972 1.164 0 2.013 3.796 2.942 5.887 2.982h.285c2.093-.041 5.888-.97 5.888-2.982z" },
      { fill: "#C1694F", d: "M13.031 20H10.46c-.284 0-.514-.216-.514-.5s.23-.5.514-.5H13v-4H9v1h2.488c.284 0 .514.216.514.5s-.23.5-.514.5H9.062C8.521 17 8 16.854 8 16.229v-1.315c0-.726.604-.914.888-.914h4.143c.698 0 .969.479.969.915v4.114c0 .617-.458.971-.969.971zm14 0h-2.572c-.283 0-.514-.216-.514-.5s.231-.5.514-.5H27v-4h-4v1h2.488c.283 0 .514.216.514.5s-.231.5-.514.5h-2.426c-.541 0-1.062-.146-1.062-.771v-1.315c0-.726.604-.914.889-.914h4.143c.697 0 .968.479.968.915v4.114c0 .617-.458.971-.969.971zm-7 0h-2.572c-.283 0-.514-.216-.514-.5s.231-.5.514-.5H20v-4h-4v1h2.488c.283 0 .514.216.514.5s-.231.5-.514.5h-2.426c-.541 0-1.062-.146-1.062-.771v-1.315c0-.726.604-.914.889-.914h4.143c.697 0 .968.479.968.915v4.114c0 .617-.458.971-.969.971z" },
    ],
  },
};

/** Peças da tabela comum (lottie-lib/icons.js) usadas aqui (mesma fonte e licença). */
const REUSED = ["twemoji-2601", "twemoji-1f5dd", "twemoji-1f528", "twemoji-1f35e", "twemoji-1fabd",
  "twemoji-1f31f", "twemoji-1f525", "twemoji-1f54a", "twemoji-2764", "twemoji-2b50", "twemoji-1f451",
  "twemoji-1f33f", "twemoji-269c", "twemoji-1f411", "twemoji-1f4a7", "twemoji-1f4d6", "twemoji-2600", "twemoji-1f426",
  "twemoji-1f5e1", "bootstrap-book-fill"];

const ICONS = { ...NEW_ICONS };
for (const key of REUSED) {
  if (NEW_ICONS[key]) throw new Error(`Peça em NEW_ICONS e em REUSED: ${key} (use uma tabela só)`);
  if (!SHARED_ICONS[key]) throw new Error(`Peça não encontrada na tabela comum: ${key}`);
  ICONS[key] = SHARED_ICONS[key];
}

/** Peças principais desenhadas no próprio gerador (sem fonte externa; ver o cabeçalho). */
const DRAWN = {
  "desenho-plaina": { desc: "plaina de carpinteiro correndo sobre a tábua", uses: [] },
  "desenho-maria-azinheira": { desc: "Maria (corpo inteiro, manto branco, mãos postas) de pé sobre a azinheira de Fátima", uses: [] },
  "desenho-arado": { desc: "arado de São Isidoro abrindo o sulco, e os brotos", uses: ["twemoji-1f331"] },
  "desenho-rosa-na-neve": { desc: "rosa desenhada que floresce na neve, com flocos", uses: ["twemoji-2744"] },
  "desenho-visitacao": { desc: "Maria e Isabel (dois bustos) inclinadas uma para a outra, mão sobre mão", uses: [] },
  "desenho-custodia": { desc: "custódia dourada com a hóstia", uses: [] },
  "desenho-sagrado-coracao": { desc: "coração com chamas desenhadas e a cruz", uses: ["twemoji-2764"] },
  "desenho-evangelho-na-pedra": { desc: "livro do Evangelho aberto sobre a pedra (ambos desenhados)", uses: [] },
  "desenho-menino-sobre-livro": { desc: "Menino Jesus (busto pequeno) sobre o livro aberto desenhado", uses: [] },
  "desenho-crucifixo": { desc: "crucifixo de madeira com o corpo de Cristo, e o lírio", uses: ["twemoji-269c"] },
  "desenho-chapeus": { desc: "chapéu de cardeal e chapéu de chanceler sobre os livros", uses: [] },
  "desenho-fogueira": { desc: "fogueira de São João (lenha e fogo desenhados)", uses: [] },
  "desenho-baculo": { desc: "báculo de bispo e o livro aberto desenhado", uses: [] },
  "desenho-chaves-e-espada": { desc: "chaves de Pedro e espada de Paulo cruzadas em X", uses: ["twemoji-1f5dd", "twemoji-1f5e1"] },
  "desenho-medalha-sao-bento": { desc: "medalha de São Bento que gira e mostra a cruz", uses: [] },
  "desenho-escapulario": { desc: "escapulário marrom do Carmo", uses: [] },
  "desenho-vaso-de-perfume": { desc: "vaso de alabastro com perfume", uses: [] },
  "desenho-vela-e-livro": { desc: "vela acesa sobre o livro das revelações", uses: [] },
  "desenho-lamparina": { desc: "lamparina de barro do eremita, sob a lua", uses: ["twemoji-1f319"] },
  "desenho-concha-de-vieira": { desc: "concha de vieira do peregrino", uses: [] },
  "desenho-sant-ana-e-joaquim": { desc: "Sant'Ana, São Joaquim e a menina Maria (três bustos)", uses: [] },
  "desenho-vassoura": { desc: "vassoura de Santa Marta e o dragão que foge", uses: ["twemoji-1f409"] },
  "desenho-ihs": { desc: "monograma IHS num sol", uses: [] },
  "desenho-jesus-glorioso": { desc: "Jesus glorioso (corpo inteiro, braços abertos) sobre a nuvem do Twemoji 2601", uses: ["twemoji-2601"] },
  "desenho-doze-chamas": { desc: "círculo de 11 chamas desenhadas que acende a 12ª (os Doze)", uses: [] },
  "desenho-tome-e-jesus": { desc: "Jesus ressuscitado e Tomé de corpo inteiro, a mão de Tomé na chaga", uses: [] },
};

const { piece, pt, pieces, pieceAt, buildTrophy, checkUniqueIcons, checkUniqueIds, main } = kit.makeLot(ICONS, { DRAWN });

// ── Ajudas do lote ───────────────────────────────────────────────────────────
/** Palma do martírio (folhagem do Twemoji 1f33f) em pé, girando em volta do pé do caule. */
const PALMA = "twemoji-1f33f";
function palmaEmPe(nm, size, base, ks = {}) {
  return L(nm, piece(PALMA, size), { a: pt(PALMA, size, [4.75, 35]), p: base, r: -45, ...ks });
}
/** Lírio branco (Twemoji 269c recolorido), com o pé em `base`. */
const LIRIO = "twemoji-269c";
const LIRIO_BRANCO = { "#744EAA": "#77B255", "#AA8DD8": "#FFFFFF", "#9266CC": "#FFCC4D" };
/** Fogo do Twemoji 1f525 (peça principal de Pentecostes; os outros troféus usam a chama desenhada). */
const FOGO = "twemoji-1f525";
/** Chama desenhada (`chamaShapes`) de altura `size`, com o pé em `base`, crescendo em t0 e tremulando. */
function chama(nm, size, base, t0, { period = 10, amp = 8 } = {}) {
  return L(nm, chamaShapes(size), {
    a: [0, 0], p: base,
    s: anim([[0, [0, 0]], [t0, [0, 0], "out"], [t0 + 10, [100, 112]], [t0 + 14, [100, 100]], ...onda([100, 100], amp, t0 + 14, END, { period, axis: 1 })]),
    o: anim(aparecer(t0, 3)),
  });
}
/** Auréola e raios do ouro, em volta de `center`. */
function aureolaERaios(center, { rx = 18, ry = 5, t0 = 52, r1 = 22, r2 = 32 } = {}) {
  return [aureola({ center, rx, ry, t0, nm: "T3_Aureola" }), raios("T3_Raios", center, { r1, r2, t0: t0 + 4 })];
}
/** Luz do ouro (sempre a `luzSuave`, sem esticar), na cor litúrgica. */
const luzDoOuro = (c, opts = {}) => lib.luzSuave(0, c.col.luz, { nm: "T3_Luz", top: 24, bottom: 150, w0: 12, w1: 80, t0: 40, peak: 28, ...opts });

// ── Gestos (tabela da §6 do guia) ────────────────────────────────────────────
// Cada gesto devolve as camadas da frente para trás. `t` = nível (1 bronze,
// 2 prata, 3 ouro); `c.col` = cor litúrgica.

/** Plaina de carpinteiro com a sola em y = 8 (a lâmina no meio). */
function plainaShapes() {
  return [
    fill([poligono([[-1, -13], [4, -13], [2, 5], [-3, 5]])], "#AAB8C2", "Lamina"),
    fill([poligono([[-5, -10], [-1, -10], [-3, 3], [-7, 3]])], "#8A4633", "Cunha"),
    lib.makeEllipse(15, -6, 4.5, 4, hex("#8A4633"), "Pomo"),
    fill([forma([[-12, -2], [-17, -12], [-13, -19], [-7, -18], [-9, -11], [-6, -2]])], "#8A4633", "Punho"),
    fill([rect(-24, -3, 24, 6)], "#D99E82", "Corpo"),
    fill([rect(-24, 6, 24, 8)], "#A0522D", "Sola"),
  ];
}

/** Cacho de lasca de madeira (espiral) de raio `r`, centrado em `c`. */
function lasca(r, [cx, cy] = [0, 0]) {
  return lib.polyline(Array.from({ length: 14 }, (_, k) => {
    const u = k / 13, a = u * Math.PI * 3, rr = r * (1 - 0.6 * u);
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  }));
}

/** São José Operário: a plaina corre sobre a tábua e soltam-se lascas. */
function gestoJoseOperario(t) {
  const veios = [lib.polyline([[46, 137], [90, 136], [154, 138]]), lib.polyline([[50, 142], [110, 143], [152, 141]])];
  const tabua = L("G_Tabua", [
    stroke(veios, 1.2, hex("#A0522D"), "Veios", { opacity: 80 }),
    fill([rect(40, 132, 160, 146)], "#C1694F", "Tabua"),
    fill([rect(40, 146, 160, 150)], "#8A4633", "Lado"),
  ], { p: anim([[0, [0, 6], "out"], [12, [0, 0]]]), o: anim(aparecer(0, 8)) });
  const Y = 124;
  const plaina = L("G_Plaina", plainaShapes(), {
    p: anim([[0, [100, Y]], [8, [100, Y], "ease"], [28, [136, Y]], [32, [136, Y], "ease"], [50, [102, Y]], [54, [102, Y], "ease"], [72, [134, Y]]]),
    o: anim(aparecer(4, 6)),
  });
  const lascas = L("G_Lascas", [
    stroke([lasca(5)], 2, hex("#E8C39E"), "Lasca1"),
    stroke([lasca(4, [8, -5])], 2, hex("#FFE8B6"), "Lasca2"),
    stroke([lasca(4.5, [15, 1])], 2, hex("#D99E82"), "Lasca3"),
  ], {
    p: anim([[0, [140, 124]], [24, [140, 124], "out"], [36, [146, 118]], [70, [146, 118], "out"], [80, [148, 116]]]),
    s: anim([[0, 0], ...pop(24, 10, { over: 120 })]), o: anim(aparecer(24, 3)),
  });
  const layers = [lascas, plaina];
  if (t >= 2) {
    // martelo (Twemoji 1f528) espelhado, girando em volta do fim do cabo: bate na ponta da tábua
    const M = "twemoji-1f528", MS = 40, cabo = pt(M, MS, [33, 33]);
    const BATE = 64, ERGUE = 24;
    const golpes = [[0, ERGUE]];
    for (const tb of [46, 60, 74]) golpes.push([tb - 8, ERGUE, "in"], [tb, BATE, "out"], [tb + 3, BATE - 6, "ease"]);
    golpes.push([END - 1, ERGUE - 4]);
    layers.push(L("T2_Martelo", piece(M, MS), { a: cabo, p: [26, 124], s: [-100, 100], r: anim(golpes), o: anim(aparecer(36, 6)) }));
  }
  layers.push(tabua);
  if (t >= 3) layers.push(...aureolaERaios([100, 74], { t0: 54 }));
  return layers;
}

/** Altura do rosto de Maria em Fátima, com os pés (rosto + 106·0,7) no alto da copa da azinheira (y 132). */
const MARIA_FATIMA_Y = 132 - 106 * 0.7;

/** Nossa Senhora de Fátima: Maria (corpo inteiro, manto branco, mãos postas) de pé sobre a copa da azinheira. */
function gestoFatima(t, c) {
  const copa = L("G_Copa", [
    lib.makeEllipse(82, 138, 16, 9, hex("#77B255"), "Folhas1"),
    lib.makeEllipse(120, 137, 16, 9, hex("#77B255"), "Folhas2"),
    lib.makeEllipse(100, 146, 38, 14, hex("#5C913B"), "Folhas3"),
    lib.makeEllipse(68, 152, 16, 10, hex("#3E721D"), "Folhas4"),
    lib.makeEllipse(132, 152, 16, 10, hex("#3E721D"), "Folhas5"),
  ], { a: [100, 178], p: [100, 178], s: anim(pop(0, 14, { over: 104 })), o: anim(aparecer(0, 6)) });
  const tronco = L("Tronco", [fill([forma([[95, 178], [97, 156], [90, 148], [96, 146], [100, 152], [104, 144], [110, 148], [103, 156], [105, 178]])], "#8A4633", "Tronco")], {
    p: [0, 0], o: anim(aparecer(0, 6)),
  });
  // Maria grande e no centro, de pé sobre a copa, sempre na frente da árvore
  const maria = L("G_Maria", figura(0.7, { manto: "#F5F8FA", tunica: "#E1E8ED", orla: "#FFCC4D", bracos: "postas" }), {
    // pousa em 30 e fica parada: os pés (rosto + 106·0,7) ficam no alto da copa (y 132)
    p: anim([[0, [100, 70]], [10, [100, 70], "out"], [30, [100, MARIA_FATIMA_Y]]]),
    o: anim(aparecer(10, 10)),
  });
  const layers = [];
  if (t >= 3) {
    layers.push(L("T3_Sol", piece("twemoji-2600", 30), {
      p: anim([[0, [150, 48]], ...onda([150, 48], 6, 44, END, { period: 12, axis: 0 })]),
      r: anim(giro(90)), o: anim(aparecer(44, 6)),
    }));
  }
  if (t >= 2) {
    const crianca = (pos, veste, cabelo, corCabelo) => transladar(busto(0.3, { veste, cabelo, corCabelo }), pos);
    layers.push(L("T2_Pastorinhos", [
      ...crianca([31, 150], "#7A4A2A", "longo", "#3B2416"),
      ...crianca([49, 154], "#3B88C3", "curto", "#662113"),
      ...crianca([168, 152], "#DD2E44", "longo", "#3B2416"),
    ], { p: anim([[0, [0, 3]], [40, [0, 3], "out"], [52, [0, 0]]]), o: anim(aparecer(40, 6)) }));
  }
  layers.push(maria, copa, tronco);
  if (t >= 3) layers.push(luzDoOuro(c, { bottom: 140, w1: 76 }));
  return layers;
}

/**
 * São Matias: um círculo de 11 chamas (os Onze) acende a 12ª, no alto do
 * círculo, completando os Doze.
 */
function gestoMatias(t, c) {
  const C = [100, 114], R = 40, H = 16;
  const lugar = (k) => {
    const a = (k / 12) * Math.PI * 2 - Math.PI / 2;
    return [R * Math.cos(a), R * Math.sin(a)];
  };
  const onze = L("G_Onze", Array.from({ length: 11 }, (_, j) => transladar(chamaShapes(H), lugar(j + 1))).flat(), {
    p: C, s: anim([[0, 0], ...pop(0, 14, { over: 108 }), ...pulsar(30, END, { amp: 4, period: 12 })]), o: anim(aparecer(0, 6)),
  });
  const doze = chama("G_Chama12", H, add(C, lugar(0)), 26, { period: 12 });
  const layers = [];
  if (t >= 3) {
    layers.push(L("T3_Machado", piece("twemoji-1fa93", 34), {
      p: [158, 150], r: -20, s: anim([[0, 0], ...pop(46, 10, { over: 112 })]), o: anim(aparecer(46, 3)),
    }));
  }
  layers.push(doze, onze);
  if (t >= 2) {
    layers.push(L("T2_Livro", livroAbertoShapes(40, 24, "#BE1931"), {
      p: add(C, [0, 6]), s: anim([[0, [4, 100]], ...abrir(40, 54, { axis: "x", from: 4 })]), o: anim(aparecer(40, 3)),
    }));
  }
  if (t >= 3) layers.push(luzDoOuro(c, { w1: 84 }));
  return layers;
}

/** Arado: a ponta da relha em (0,0), puxado para a direita; `k` = escala. */
function aradoShapes(k = 1) {
  const P = (pts) => pts.map(([x, y]) => [x * k, y * k]);
  return [
    fill([poligono(P([[3, 0], [-10, -8], [-8, 2]]))], "#8899A6", "Relha"),
    stroke([reta(P([[0, -5], [-28, -14]])), reta(P([[-22, -12], [-36, -32]])), reta(P([[-36, -32], [-42, -32]]))], 3 * k, hex("#8A4633"), "Rabica"),
  ];
}

/** São Isidoro Lavrador: o arado abre um sulco e brotos nascem. */
function gestoIsidoroLavrador(t) {
  const campo = L("Campo", [fill([rect(30, 150, 170, 164)], "#C1694F", "Terra"), fill([rect(30, 164, 170, 168)], "#A0522D", "TerraFunda")], {
    p: [0, 0], o: anim(aparecer(0, 6)),
  });
  const sulco = L("G_Sulco", [stroke([reta([[60, 152], [160, 152]])], 4, hex("#662113"), "Sulco", { trim: { e: anim([[0, 0], [6, 0, "linear"], [40, 100]]) } })], {
    p: [0, 0], o: anim(aparecer(6, 2)),
  });
  const arado = L("G_Arado", aradoShapes(), {
    p: anim([[0, [60, 152]], [6, [60, 152], "linear"], [40, [160, 152], "out"], [44, [158, 152]]]),
    o: anim(aparecer(0, 4)),
  });
  const brotos = L("G_Brotos", pieces("twemoji-1f331", 16, [[78, 142], [102, 141], [126, 142]]), {
    a: [100, 150], p: [100, 150], s: anim([[0, [0, 0]], ...abrir(40, 54, { axis: "xy" })]), o: anim(aparecer(40, 4)),
  });
  const layers = [arado, brotos, sulco];
  if (t >= 2) {
    const W = "twemoji-1fabd", branco = { "#CAD4DB": "#F5F8FA", "#97A8B3": "#CCD6DD" };
    const asa = pieceAt(W, 22, [9, -6], { recolor: branco });
    layers.unshift(L("T2_Anjo", [...asa, ...espelhar(asa), ...transladar(aradoShapes(0.55), [6, 14])], {
      p: anim([[0, [44, 100]], [36, [44, 100], "linear"], [END - 1, [68, 100]]]),
      r: anim([[0, 0], ...onda(0, 3, 36, END, { period: 18 })]), o: anim(aparecer(36, 6)),
    }));
  }
  if (t >= 3) {
    layers.push(L("T3_Trigo", pieces("twemoji-1f33e", 30, [[34, 136], [166, 136]], { recolor: { "#77B255": "#C8962A", "#FFCC4D": "#FFE08A" } }), {
      a: [100, 151], p: [100, 151], s: anim([[0, [0, 0]], ...abrir(46, 60, { axis: "xy" })]), o: anim(aparecer(46, 4)),
    }));
  }
  layers.push(campo);
  return layers;
}

/** Rosa desenhada, com o pé do caule em (0,0) e 52 px de altura. */
function rosaShapes() {
  return [
    stroke([lib.polyline([[-3, -44], [0, -41], [3, -44], [0, -46]])], 1.2, hex("#A0041E"), "Miolo"),
    fill([forma([[-7, -44], [-4, -51], [0, -48], [4, -52], [8, -45], [4, -40], [-3, -39]])], "#DD2E44", "Petalas"),
    fill([forma([[-12, -45], [-13, -37], [-8, -30], [0, -28], [8, -30], [13, -37], [12, -45], [6, -41], [0, -47], [-6, -41]])], "#BE1931", "Calice"),
    fill([forma([[0, -14], [8, -21], [15, -19], [8, -13]]), forma([[0, -20], [-8, -27], [-14, -25], [-8, -19]])], "#5C913B", "Folhas"),
    stroke([lib.polyline([[0, 0], [1, -14], [-1, -24], [0, -30]])], 2.6, hex("#3E721D"), "Caule"),
  ];
}

/** Santa Rita de Cássia: uma rosa floresce no meio da neve. */
function gestoRita(t, c) {
  const rosa = L("G_Rosa", rosaShapes(), {
    p: [100, 158],
    s: anim([[0, [0, 0]], ...abrir(8, 30, { axis: "xy" })]),
    r: anim([[0, 0], [30, 0], ...onda(0, 3, 30, END, { period: 30 })]),
    o: anim(aparecer(8, 4)),
  });
  const neve = L("G_Neve", [
    fill([forma([[28, 172], [44, 160], [72, 153], [100, 151], [128, 153], [156, 160], [172, 172]])], "#F5F8FA", "Neve"),
    fill([forma([[30, 172], [44, 164], [100, 158], [156, 164], [170, 172]])], "#CCD6DD", "Sombra"),
  ], { p: anim([[0, [0, 4], "out"], [10, [0, 0]]]), o: anim(aparecer(0, 6)) });
  const flocos = L("G_Flocos", pieces("twemoji-2744", 10, [[44, 60], [70, 42], [134, 48], [158, 74], [54, 104], [148, 108]]), {
    p: anim([[0, [0, 0]], ...onda([0, 0], 4, 0, END, { period: 45, axis: 1 })]), o: anim(aparecer(0, 10, { to: 90 })),
  });
  const layers = [];
  if (t >= 3) {
    const figo = (x, y) => [
      stroke([reta([[x, y - 7], [x + 1.5, y - 10]])], 1.4, hex("#5C913B"), "Talo"),
      fill([forma([[x, y - 7], [x + 4, y - 3], [x + 6, y + 3], [x + 3, y + 7], [x - 3, y + 7], [x - 6, y + 3], [x - 4, y - 3]])], "#7B3F8C", "Figo"),
    ];
    layers.push(L("T3_Figos", [...figo(50, 156), ...figo(64, 162), ...figo(148, 158)], {
      a: [100, 164], p: [100, 164], s: anim([[0, 0], ...pop(46, 10)]), o: anim(aparecer(46, 4)),
    }));
  }
  layers.push(flocos, neve, rosa);
  if (t >= 2) {
    layers.push(L("T2_Espinho", piece("twemoji-2b50", 11), {
      p: [100, 84], s: anim([[0, 0], ...pop(40, 10, { over: 130 }), ...pulsar(50, END, { amp: 12, period: 18 })]), o: anim(aparecer(40, 3)),
    }));
  }
  if (t >= 3) layers.push(luzDoOuro(c, { bottom: 150 }));
  return layers;
}

/**
 * Visitação de Maria: Maria e Isabel (bustos) se aproximam e se inclinam uma
 * para a outra, com as cabeças próximas; a mão de Isabel pousa sobre a de Maria.
 */
function gestoVisitacao(t, c) {
  const K = 0.72, base = [0, 75 * K];
  const pessoa = (nm, opts, x0, x1, lean, t0) => L(nm, busto(K, opts), {
    a: base, p: anim([[0, [x0, 90 + base[1]]], [t0, [x0, 90 + base[1]], "ease"], [t0 + 26, [x1, 90 + base[1]]]]),
    r: anim([[0, 0], [t0 + 26, 0, "ease"], [t0 + 36, lean]]), o: anim(aparecer(t0, 6)),
  });
  const LEAN = 9, FIM_M = [80, 90 + base[1]], FIM_I = [120, 90 + base[1]], PARADA = 4 + 36;
  const maria = pessoa("G_Maria", { manto: "#3D6FB6", veste: "#F5F8FA" }, 54, FIM_M[0], LEAN, 4);
  const isabel = pessoa("G_Isabel", { manto: "#A0785A", veste: "#FFE8B6" }, 146, FIM_I[0], -LEAN, 4);
  // ponto do desenho do busto (rosto em (0,0)) na pose final de cada uma (posição, âncora e inclinação)
  const naPose = (p, r, [x, y]) => {
    const a = (r * Math.PI) / 180, lx = x - base[0], ly = y - base[1];
    return [p[0] + lx * Math.cos(a) - ly * Math.sin(a), p[1] + lx * Math.sin(a) + ly * Math.cos(a)];
  };
  // a mão de Maria na frente do peito dela; a de Isabel pousa por cima, um pouco à direita
  const maoM = naPose(FIM_M, LEAN, [11, 36]), maoI = add(maoM, [2.4, -1.6]);
  const mangaM = naPose(FIM_M, LEAN, [3, 38]), mangaI = naPose(FIM_I, -LEAN, [-6, 34]);
  const manga = (de, ate, cor, nm) => {
    // só o punho: os últimos 7 px antes da mão, na direção do corpo
    const d = Math.hypot(ate[0] - de[0], ate[1] - de[1]), u = [(de[0] - ate[0]) / d, (de[1] - ate[1]) / d];
    return stroke([reta([add(ate, [u[0] * 2.5, u[1] * 2.5]), add(ate, [u[0] * 9, u[1] * 9])])], 5.5, hex(cor), nm);
  };
  const maos = L("G_Maos", [
    lib.makeEllipse(maoI[0], maoI[1], 3.6, 3, hex(PELE), "MaoIsabel"),
    manga(mangaI, maoI, "#A0785A", "MangaIsabel"),
    lib.makeEllipse(maoM[0], maoM[1], 3.6, 3, hex(PELE), "MaoMaria"),
    manga(mangaM, maoM, "#3D6FB6", "MangaMaria"),
  ], {
    // só depois que as duas terminam de se inclinar
    p: anim([[0, [0, 3]], [PARADA, [0, 3], "out"], [PARADA + 8, [0, 0]]]), o: anim(aparecer(PARADA, 6)),
  });
  const layers = [];
  if (t >= 2) {
    layers.push(L("T2_Estrela", piece("twemoji-2b50", 16), {
      p: [100, 44], s: anim([[0, 0], ...pop(40, 10, { over: 125 }), ...pulsar(50, END, { amp: 8, period: 18 })]), o: anim(aparecer(40, 3)),
    }));
  }
  if (t >= 3) {
    const cores = ["#F4ABBA", "#FFFFFF", "#FFCC4D"];
    layers.push(...chuva("T3_Flores", (k) => petala(cores[k % 3]), { count: 7, t0: 44, area: [36, 30, 164, 150], seed: 33 }));
  }
  layers.push(maos, maria, isabel);
  if (t >= 3) layers.push(luzDoOuro(c, { w1: 84, peak: 26 }));
  return layers;
}

/** Ascensão do Senhor: Jesus glorioso (corpo inteiro, braços abertos) sobe sobre a nuvem e a luz acende. */
function gestoAscensao(t, c) {
  const N = "twemoji-2601";
  const sobe = [[0, [100, 140]], [8, [100, 140], "in"], [48, [100, 112], "out"], ...flutuar([100, 112], 48, 2)];
  const nuvem = L("G_Nuvem", piece(N, 60, { recolor: { "#CCD6DD": "#E1E8ED", "#E1E8ED": "#FFFFFF" } }), { p: anim(sobe), o: anim(aparecer(4, 8)) });
  // os pés de Jesus sobre a nuvem: o rosto 62 px acima do centro dela
  const jesus = L("G_Jesus", figura(0.5, { tunica: "#F5F8FA", faixa: "#FFCC4D", cabelo: "longo", corCabelo: "#8A4633", barba: "#8A4633", bracos: "abertos" }), {
    p: anim(deslocar(sobe, [0, -62])), o: anim(aparecer(4, 8)),
  });
  // a luz faz parte do gesto do bronze ("sobe sobre a nuvem enquanto a luz acende", ajuste do dono, rodada 3),
  // por isso é uma camada G_ desde o bronze e não a luzDoOuro, que só o ouro acrescenta
  const luz = lib.luzSuave(0, c.col.luz, { nm: "G_Luz", top: 24, bottom: 130, w0: 16, w1: 90, t0: 20, peak: 30 });
  const monte = L("Monte", [fill([forma([[30, 172], [56, 156], [100, 150], [144, 156], [170, 172]])], "#8899A6", "Monte")], { p: [0, 0], o: anim(aparecer(0, 6)) });
  const layers = [jesus, nuvem];
  if (t >= 2) {
    const pe = (x, y) => [
      lib.makeEllipse(x, y, 2.6, 4.6, hex("#4A5560"), "Sola"),
      ...[-2.2, -0.7, 0.8, 2.2].map((dx, k) => lib.makeEllipse(x + dx, y - 6 + Math.abs(dx) * 0.4, 0.8, 0.8, hex("#4A5560"), `Dedo${k}`)),
    ];
    layers.push(L("T2_Pegadas", [...pe(-6, 2), ...pe(6, 0)], {
      p: [100, 156], s: anim([[0, 0], ...pop(44, 10, { over: 115 })]), o: anim(aparecer(44, 3)),
    }));
  }
  layers.push(monte);
  if (t >= 3) layers.push(raios("T3_Raios", [100, 70], { count: 16, r1: 34, r2: 48, half: 3, t0: 50, peak: 80 }));
  layers.push(luz);
  return layers;
}

/** Pentecostes: línguas de fogo descem e acendem. */
function gestoPentecostes(t, c) {
  const S = 26, a = pt(FOGO, S, [18, 36]);
  const lingua = (nm, x, t0) => L(nm, piece(FOGO, S), {
    a, p: anim([[0, [x, 60]], [t0, [x, 60], "in"], [t0 + 22, [x, 120], "out"]]),
    s: anim([[0, [60, 60]], [t0 + 22, [60, 60], "out"], [t0 + 30, [110, 118]], [t0 + 34, [100, 100]], ...onda([100, 100], 8, t0 + 34, END, { period: 10, axis: 1 })]),
    o: anim(aparecer(t0, 4)),
  });
  const layers = [];
  if (t >= 2) {
    layers.push(L("T2_Pomba", piece("twemoji-1f54a", 28), {
      p: anim([[0, [100, 32]], [34, [100, 32], "ease"], [50, [100, 40]], ...flutuar([100, 40], 50, 1.5)]), o: anim(aparecer(34, 6)),
    }));
  }
  layers.push(lingua("G_Chama1", 64, 0), lingua("G_Chama2", 100, 6), lingua("G_Chama3", 136, 12));
  if (t >= 3) {
    const doze = Array.from({ length: 12 }, (_, k) => {
      const ang = (k / 12) * Math.PI * 2 - Math.PI / 2;
      return [100 + 54 * Math.cos(ang), 110 + 54 * Math.sin(ang)];
    });
    layers.push(L("T3_Chamas", pieces(FOGO, 10, doze), {
      a: [100, 110], p: [100, 110], s: anim([[0, 0], ...pop(46, 12)]), r: anim(giro(30)), o: anim(aparecer(46, 6)),
    }));
    layers.push(luzDoOuro(c, { w1: 90 }));
  }
  return layers;
}

/** Custódia dourada, com o sol (a luneta da hóstia) em (0,0) e o pé em y = 64. */
function custodiaShapes() {
  return [
    stroke([reta([[0, -30], [0, -44]]), reta([[-6, -38], [6, -38]])], 3, hex("#F4900C"), "Cruz"),
    lib.makeEllipseRing(0, 0, 19, 19, 3.5, hex("#F4900C"), "Moldura"),
    lib.makeEllipse(0, 0, 17, 17, hex("#FFF8D6"), "Luneta"),
    lib.makeRays(12, 18, 34, 5, hex("#FFCC4D"), "RaiosLongos", [0, 0]),
    lib.makeRays(24, 18, 27, 4, hex("#FFAC33"), "RaiosCurtos", [0, 0]),
    lib.makeEllipse(0, 38, 6, 4, hex("#F4900C"), "No"),
    fill([rect(-2.5, 18, 2.5, 56)], "#FFAC33", "Haste"),
    fill([forma([[-20, 64], [-12, 54], [12, 54], [20, 64]])], "#F4900C", "Pe"),
  ];
}

/** Corpus Christi: a custódia aparece e a hóstia brilha no centro. */
function gestoCorpusChristi(t) {
  const C = [100, 92];
  const custodia = L("G_Custodia", custodiaShapes(), { a: [0, 64], p: add(C, [0, 64]), s: anim(pop(0, 14, { over: 106 })), o: anim(aparecer(0, 6)) });
  const hostia = L("G_Hostia", hostiaShapes(13), { p: C, s: anim([[0, 0], ...pop(16, 10, { over: 118 })]), o: anim(aparecer(16, 3)) });
  const luz = L("G_Brilho", [lib.makeEllipse(0, 0, 20, 20, hex("#FFFFFF"), "Brilho")], {
    p: C, s: anim([[0, 60], [22, 60, "out"], [32, 100], ...pulsar(32, END, { amp: 10, period: 20 })]),
    o: anim([...aparecer(22, 8, { to: 45 }), ...onda(45, -15, 30, END, { period: 20 })]),
  });
  const layers = [];
  if (t >= 2) {
    layers.push(...chuva("T2_Petalas", (k) => petala(k % 2 ? "#DD2E44" : "#FFFFFF"), { count: 7, t0: 36, dur: 40, area: [34, 30, 166, 166], seed: 12, fade: false }));
  }
  layers.push(hostia, luz, custodia);
  if (t >= 3) layers.push(raios("T3_Raios", C, { count: 16, r1: 36, r2: 52, half: 3, t0: 50, peak: 80 }));
  return layers;
}

/** Sagrado Coração de Jesus: o coração com chamas e a cruz pulsa. */
function gestoSagradoCoracao(t, c) {
  const C = [100, 112];
  const bate = (t0) => [[0, 0], ...pop(t0, 12, { over: 110 }), ...pulsar(t0 + 16, END, { amp: 7, period: 20 })];
  const coracao = L("G_Coracao", piece("twemoji-2764", 54), { p: C, s: anim(bate(0)), o: anim(aparecer(0, 4)) });
  const chamas = chama("G_Chamas", 22, [100, 100], 8, { period: 10 });
  const cruz = L("G_Cruz", [stroke([reta([[0, -9], [0, 9]]), reta([[-5, -4], [5, -4]])], 3, hex("#FFAC33"), "Cruz")], {
    a: [0, 9], p: [100, 84], s: anim(bate(14)), o: anim(aparecer(14, 3)),
  });
  // a coroa de espinhos envolve o coração: o arco de baixo passa na frente dele e o de cima, atrás
  const coroa = (nm, metade) => L(nm, espinhosShapes(32, 9, "#8A4633", { metade }), {
    p: add(C, [0, 4]), s: anim([[0, 0], ...pop(40, 10, { over: 112 })]), o: anim(aparecer(40, 4)),
  });
  const layers = [cruz, chamas];
  if (t >= 2) layers.push(coroa("T2_EspinhosFrente", "frente"));
  layers.push(coracao);
  if (t >= 2) layers.push(coroa("T2_EspinhosTras", "tras"));
  if (t >= 3) layers.push(raios("T3_Raios", C, { count: 16, r1: 36, r2: 56, half: 3, t0: 50, peak: 80 }), luzDoOuro(c, { bottom: 130, w1: 76, t0: 44, peak: 24 }));
  return layers;
}

/** Ramo de oliveira com o pé em (0,0): folhas estreitas e azeitonas. */
function oliveiraShapes() {
  const at = (u) => [-6 * u * u, -40 * u];
  const folha = (u, lado) => {
    const [x, y] = at(u);
    const dir = [lado * 0.75, -0.66], comp = 11 - 4 * u, larg = 2;
    const meio = [x + dir[0] * comp * 0.5, y + dir[1] * comp * 0.5], nl = [-dir[1] * larg, dir[0] * larg];
    return forma([[x, y], [meio[0] + nl[0], meio[1] + nl[1]], [x + dir[0] * comp, y + dir[1] * comp], [meio[0] - nl[0], meio[1] - nl[1]]]);
  };
  const us = [0.25, 0.4, 0.55, 0.7, 0.85];
  return [
    lib.makeEllipse(-4, -18, 2.2, 2.8, hex("#3E4A2A"), "Azeitona1"),
    lib.makeEllipse(-9, -30, 2.2, 2.8, hex("#3E4A2A"), "Azeitona2"),
    fill(us.map((u, k) => folha(u, k % 2 ? 1 : -1)), "#7A9A5C", "Folhas1"),
    fill(us.map((u, k) => folha(u + 0.06, k % 2 ? -1 : 1)), "#9DB37A", "Folhas2"),
    stroke([lib.polyline(Array.from({ length: 6 }, (_, k) => at(k / 5)))], 1.6, hex("#6B5A3A"), "Galho"),
  ];
}

/** São Barnabé: o livro do Evangelho abre sobre uma pedra. */
function gestoBarnabe(t) {
  const pedra = L("G_Pedra", [
    fill([forma([[-20, -10], [-6, -18], [10, -16], [20, -8], [6, -10], [-8, -8]])], "#CCD6DD", "Reflexo"),
    fill([forma([[-30, 22], [-34, 4], [-24, -12], [-6, -20], [14, -18], [30, -6], [34, 12], [24, 24], [0, 26]])], "#99AAB5", "Rocha"),
    fill([forma([[-30, 22], [-10, 16], [14, 18], [30, 14], [24, 24], [0, 27]])], "#66757F", "Sombra"),
  ], {
    p: anim([[0, [100, 150], "out"], [12, [100, 148]]]), o: anim(aparecer(0, 6)),
  });
  const livro = L("G_Livro", [
    stroke([reta([[14, -9], [14, 3]]), reta([[9, -5], [19, -5]])], 2, hex("#DD2E44"), "Cruz"),
    ...livroAbertoShapes(54, 34, "#BE1931"),
  ], {
    p: [100, 116], s: anim([[0, [4, 100]], ...abrir(14, 30, { axis: "x", from: 4 })]), o: anim(aparecer(14, 3)),
  });
  const layers = [livro, pedra];
  if (t >= 2) {
    layers.unshift(L("T2_Oliveira", oliveiraShapes(), {
      p: [44, 156], r: anim([[0, 16], ...onda(16, 3, 44, END, { period: 30 })]),
      s: anim([[0, 0], ...abrir(40, 54, { axis: "xy" })]), o: anim(aparecer(40, 4)),
    }));
  }
  if (t >= 3) layers.push(...aureolaERaios([100, 64], { t0: 54 }));
  return layers;
}

/** Santo Antônio de Lisboa e Pádua: o Menino Jesus (pequeno) aparece sobre o livro aberto. */
function gestoAntonio(t, c) {
  const K = 0.5;
  const livro = L("G_Livro", livroAbertoShapes(64, 38, "#8A4633"), {
    p: [100, 146], s: anim(abrir(0, 14, { axis: "x", from: 4 })), o: anim(aparecer(0, 3)),
  });
  const menino = L("G_Menino", busto(K, { veste: "#F5F8FA", cabelo: "curto", corCabelo: "#C1694F" }), {
    a: [0, 70 * K], p: anim([[0, [100, 138]], [40, [100, 138]], ...flutuar([100, 138], 40, 1.2)]),
    s: anim([[0, 0], ...pop(14, 14, { over: 110 })]), o: anim(aparecer(14, 4)),
  });
  const layers = [];
  if (t >= 3) {
    layers.push(L("T3_Paes", pieces("twemoji-1f35e", 20, [[42, 152], [58, 158]]), {
      a: [50, 168], p: [50, 168], s: anim([[0, 0], ...pop(46, 10)]), o: anim(aparecer(46, 4)),
    }));
  }
  layers.push(livro, menino);
  if (t >= 2) {
    layers.push(L("T2_Lirio", piece(LIRIO, 34, { recolor: LIRIO_BRANCO }), {
      a: pt(LIRIO, 34, [18, 36]), p: [150, 154], s: anim([[0, [100, 0]], ...abrir(40, 54, { axis: "y" })]), o: anim(aparecer(40, 4)),
    }));
  }
  if (t >= 3) layers.push(luzDoOuro(c, { bottom: 140, w1: 76 }));
  return layers;
}

/** Crucifixo de madeira com o corpo de Cristo, com o pé em (0,0) e 80 px de altura. */
function crucifixoShapes() {
  return [
    fill([forma([[-3.6, -41], [3.6, -41], [3, -35], [-3, -35]])], "#FFFFFF", "Pano"),
    stroke([reta([[-1, -35], [-0.6, -22]]), reta([[1, -35], [0.6, -22]])], 2, hex(PELE), "Pernas"),
    fill([forma([[-3, -53], [3, -53], [2.6, -40], [-2.6, -40]])], PELE, "Tronco"),
    stroke([lib.polyline([[-16, -59], [-6, -55], [0, -54], [6, -55], [16, -59]], { smooth: false })], 2, hex(PELE), "Bracos"),
    lib.makeEllipse(0.6, -57, 3, 3.3, hex(PELE), "Cabeca"),
    fill([rect(-5, -79, 5, -73)], "#F5F8FA", "Titulo"),
    stroke([reta([[0, 0], [0, -80]]), reta([[-20, -60], [20, -60]])], 5, hex("#8A4633"), "Madeira"),
  ];
}

/** São Luís Gonzaga: o lírio sobe e se abre ao lado do crucifixo. */
function gestoLuisGonzaga(t) {
  const crucifixo = L("G_Crucifixo", crucifixoShapes(), { p: [74, 160], s: anim(pop(0, 14, { over: 106 })), o: anim(aparecer(0, 6)) });
  const lirio = L("G_Lirio", piece(LIRIO, 46, { recolor: LIRIO_BRANCO }), {
    a: pt(LIRIO, 46, [18, 36]), p: anim([[0, [128, 176]], [8, [128, 176], "out"], [30, [128, 160]]]),
    s: anim(abrir(8, 34, { axis: "xy", from: 20 })), o: anim(aparecer(8, 4)),
  });
  const layers = [lirio];
  if (t >= 2) {
    // o terço pendurado na ponta do braço esquerdo da cruz
    layers.push(L("T2_Terco", tercoShapes(), { p: [54, 100], r: anim([[0, 0], ...onda(0, 5, 44, END, { period: 30 })]), o: anim(aparecer(40, 8)) }));
  }
  layers.push(crucifixo);
  if (t >= 3) layers.push(...aureolaERaios([104, 54], { t0: 52 }));
  return layers;
}

/** São João Fisher e São Tomás Moro: dois chapéus (cardeal e chanceler) se encontram sobre um livro. */
function gestoFisherMoro(t, c) {
  const galero = [
    stroke([reta([[-21, 1], [-25, 16]]), reta([[21, 1], [25, 16]])], 1.2, hex("#A0041E"), "Cordoes"),
    fill([poligono([[-25, 15], [-28, 21], [-22, 21]]), poligono([[25, 15], [22, 21], [28, 21]])], "#A0041E", "Borlas"),
    fill([forma([[-10, 0], [-9, -8], [0, -11], [9, -8], [10, 0]])], "#DD2E44", "Copa"),
    lib.makeEllipse(0, 0, 24, 5, hex("#BE1931"), "Abas"),
  ];
  const chapeu = [
    stroke([reta([[-8, -6], [8, -6]])], 1.4, hex("#FFCC4D"), "Fita"),
    fill([forma([[-15, -1], [-13, -8], [0, -11], [13, -8], [15, -1]])], "#31373D", "Copa"),
    lib.makeEllipse(0, 0, 18, 4.5, hex("#292F33"), "Abas"),
  ];
  const vem = (nm, shapes, x0, x1, r0, t0) => L(nm, shapes, {
    p: anim([[0, [x0, 74]], [t0, [x0, 74], "ease"], [t0 + 26, [x1, 122], "out"], [t0 + 30, [x1, 120]]]),
    r: anim([[0, r0], [t0, r0], [t0 + 26, r0 / 3]]), o: anim(aparecer(t0, 6)),
  });
  const livro = L("G_Livro", [...transladar(livroFechadoShapes("#1F4E79", "#163A5C"), [0, -18]), ...livroFechadoShapes("#5C3A21", "#3B2416")], {
    p: anim([[0, [100, 152], "out"], [10, [100, 148]]]), o: anim(aparecer(0, 6)),
  });
  const layers = [];
  if (t >= 3) {
    layers.push(L("T3_Coroa", piece("twemoji-1f451", 24), {
      p: anim([[0, [100, 40]], [48, [100, 40], "ease"], [62, [100, 56]], ...flutuar([100, 56], 62, 1.5)]), o: anim(aparecer(48, 8)),
    }));
  }
  layers.push(vem("G_Galero", galero, 50, 82, -18, 4), vem("G_Chapeu", chapeu, 150, 120, 18, 8), livro);
  if (t >= 2) layers.push(palmaEmPe("T2_Palma", 46, [100, 132], { p: anim([[0, [100, 150]], [40, [100, 150], "out"], [54, [100, 132]]]), o: anim(aparecer(40, 4)) }));
  if (t >= 3) layers.push(luzDoOuro(c, { w1: 84, t0: 42 }));
  return layers;
}

/** Natividade de João Batista: a fogueira de São João acende. */
function gestoJoaoBatista(t) {
  const lenha = L("G_Lenha", [
    ...[[-26, 8], [22, -6], [-22, -6], [26, 8]].map(([x, y], k) => lib.makeEllipse(x, y, 3.4, 3.4, hex("#D99E82"), `Ponta${k}`)),
    stroke([reta([[-26, 8], [22, -6]])], 7, hex("#8A4633"), "Tora1"),
    stroke([reta([[-22, -6], [26, 8]])], 7, hex("#A0522D"), "Tora2"),
  ], { p: [100, 156], s: anim(pop(0, 10, { over: 108 })), o: anim(aparecer(0, 4)) });
  const fogo = chama("G_Fogo", 50, [100, 152], 8, { period: 12 });
  const luz = brilho("G_Brilho", [100, 132], { rx: 26, ry: 24, color: "#FFCC4D", t0: 14, peak: 20, period: 12 });
  const layers = [fogo, lenha];
  if (t >= 2) {
    layers.unshift(L("T2_Cordeiro", piece("twemoji-1f411", 32), {
      p: anim([[0, [150, 148]], ...pulo([150, 148], 40, { h: 6, d: 10, n: 2, gap: 4 })]), o: anim(aparecer(36, 6)),
    }));
  }
  if (t >= 3) {
    layers.unshift(
      L("T3_Concha", conchaShapes(14), { p: [48, 90], r: -40, s: anim([[0, 0], ...pop(44, 10)]), o: anim(aparecer(44, 3)) }),
      L("T3_Agua", [stroke([lib.polyline([[58, 98], [60, 112], [61, 128]])], 3, hex("#5DADEC"), "Agua", {
        opacity: 85, trim: { e: anim([[0, 0], [52, 0, "out"], [62, 100]]) },
      })], { p: [0, 0], o: anim(aparecer(52, 2)) }),
    );
  }
  layers.push(luz);
  return layers;
}

/** Báculo de bispo, com o pé em (0,0): cajado e voluta no alto. */
function baculoShapes() {
  const c = [9, -88];
  const voluta = Array.from({ length: 15 }, (_, j) => {
    const u = j / 14, a = Math.PI + u * 1.7 * Math.PI, r = 9 - 4 * u;
    return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  });
  return [
    lib.makeEllipse(0, -70, 4, 3, hex("#FFAC33"), "No"),
    stroke([lib.polyline([[0, -80], ...voluta])], 4, hex("#F4900C"), "Voluta"),
    stroke([reta([[0, 0], [0, -80]])], 4, hex("#C1694F"), "Cajado"),
  ];
}

/** São Ireneu de Lyon: o báculo de bispo se ergue e o livro abre. */
function gestoIreneu(t) {
  const baculo = L("G_Baculo", baculoShapes(), {
    p: [70, 162], r: anim([[0, -28], [4, -28, "ease"], [24, 3], [30, 0]]), o: anim(aparecer(4, 6)),
  });
  const livro = L("G_Livro", livroAbertoShapes(50, 30, "#1F4E79"), {
    p: [128, 142], s: anim([[0, [4, 100]], ...abrir(24, 38, { axis: "x", from: 4 })]), o: anim(aparecer(24, 3)),
  });
  const layers = [baculo, livro];
  if (t >= 2) {
    const mitra = [
      stroke([reta([[0, -18], [0, 12]]), reta([[-12, 4], [12, 4]])], 2.4, hex("#FFCC4D"), "Faixas"),
      fill([forma([[-12, 12], [-12, -4], [-6, -14], [0, -20], [6, -14], [12, -4], [12, 12]])], "#F5F8FA", "Mitra"),
      fill([rect(-8, 12, -4, 22), rect(4, 12, 8, 22)], "#FFCC4D", "Fitas"),
    ];
    layers.unshift(L("T2_Mitra", mitra, {
      p: anim([[0, [128, 84]], [40, [128, 84], "ease"], [56, [128, 98]], ...flutuar([128, 98], 56, 1.5)]), o: anim(aparecer(40, 8)),
    }));
  }
  if (t >= 3) layers.push(...aureolaERaios([100, 50], { rx: 16, ry: 4.5, t0: 54, r1: 20, r2: 30 }));
  return layers;
}

/** Rede de pesca centrada em (0,0): malha em losango, borda com boias. */
function redeShapes(w = 96, h = 22) {
  const linhas = [];
  for (let x = -w / 2 - h; x <= w / 2; x += 8) {
    const a = [x, -h / 2], b = [x + h, h / 2];
    const corta = ([px, py], [qx, qy]) => {
      // parâmetros em que a reta cruza x = −w/2 e x = w/2 (em qualquer ordem: a diagonal espelhada vai para a esquerda)
      const ua = (-w / 2 - px) / (qx - px), ub = (w / 2 - px) / (qx - px);
      const t0 = Math.max(0, Math.min(ua, ub)), t1 = Math.min(1, Math.max(ua, ub));
      return t1 > t0 ? reta([[px + (qx - px) * t0, py + (qy - py) * t0], [px + (qx - px) * t1, py + (qy - py) * t1]]) : null;
    };
    linhas.push(corta(a, b), corta([-x, -h / 2], [-x - h, h / 2]));
  }
  const boias = Array.from({ length: 7 }, (_, k) => lib.makeEllipse(-w / 2 + (w * k) / 6, -h / 2, 2.4, 2.4, hex("#F4900C"), `Boia${k}`));
  return [...boias, stroke([reta([[-w / 2, -h / 2], [w / 2, -h / 2]])], 1.8, hex("#8A4633"), "Corda"),
    stroke(linhas.filter(Boolean), 1.1, hex("#C1694F"), "Malha")];
}

/** São Pedro e São Paulo: as chaves e a espada se cruzam em X. */
function gestoPedroPaulo(t, c) {
  const K = "twemoji-1f5dd", E = "twemoji-1f5e1", S = 54;
  const ouro = { "#31373D": "#F4900C", "#67757F": "#FFCC4D" };
  const vem = (nm, shapes, x0, r0, t0, mirror) => L(nm, shapes, {
    p: anim([[0, [x0, 92]], [t0, [x0, 92], "in"], [t0 + 22, [100, 104], "out"], [t0 + 26, [100, 101]], [t0 + 30, [100, 104]]]),
    r: anim([[0, r0], [t0, r0, "ease"], [t0 + 22, 0]]), s: mirror ? [-100, 100] : 100, o: anim(aparecer(t0, 6)),
  });
  const chaves = vem("G_Chaves", piece(K, S, { recolor: ouro }), 54, -30, 0, false);
  const espada = vem("G_Espada", piece(E, S), 146, -30, 6, true);
  const layers = [espada, chaves];
  if (t >= 2) {
    layers.push(L("T2_Rede", redeShapes(), {
      p: [100, 156], s: anim([[0, [0, 100]], ...abrir(40, 56, { axis: "x" })]), o: anim(aparecer(40, 4)),
    }));
  }
  if (t >= 3) {
    layers.push(
      aureola({ center: [76, 58], rx: 13, ry: 3.8, t0: 50, nm: "T3_Aureola1" }),
      aureola({ center: [124, 58], rx: 13, ry: 3.8, t0: 54, nm: "T3_Aureola2" }),
      luzDoOuro(c, { w1: 90, t0: 44 }),
    );
  }
  return layers;
}

/**
 * São Tomé Apóstolo: Jesus ressuscitado (corpo inteiro, túnica branca, a
 * chaga do lado à vista) e Tomé ao lado, de corpo inteiro; o braço de Tomé se
 * estende e a mão entra na chaga.
 */
function gestoTome(t) {
  const K = 0.6, J = [124, 84], T = [72, 88];
  const jesus = L("G_Jesus", figura(K, { tunica: "#F5F8FA", cabelo: "longo", corCabelo: "#8A4633", barba: "#8A4633", bracos: "mostrando", chaga: true }), {
    p: J, o: anim(aparecer(0, 8)),
  });
  const TUNICA_TOME = "#C1694F";
  const tome = L("G_Tome", figura(K, { tunica: TUNICA_TOME, faixa: "#DD2E44", cabelo: "curto", corCabelo: "#3B2416", barba: "#3B2416", bracos: "esquerdo" }), {
    p: anim([[0, [T[0] - 10, T[1]]], [4, [T[0] - 10, T[1]], "out"], [20, T]]), o: anim(aparecer(4, 6)),
  });
  // braço de Tomé: do ombro direito dele (OMBRO_D·K) até a chaga de Jesus (CHAGA·K)
  const ombro = add(T, [OMBRO_D[0] * K, OMBRO_D[1] * K]), chaga = add(J, [CHAGA[0] * K, CHAGA[1] * K]);
  const alcance = Math.hypot(chaga[0] - ombro[0], chaga[1] - ombro[1]);
  const angulo = (Math.atan2(chaga[1] - ombro[1], chaga[0] - ombro[0]) * 180) / Math.PI;
  const braco = L("G_Braco", [
    lib.makeEllipse(alcance, 0, 4.2 * K, 3.4 * K, hex(PELE), "Mao"),
    stroke([lib.polyline([[0, 0], [alcance * 0.5, 2], [alcance - 3, 0]])], 8 * K, hex(TUNICA_TOME), "Manga"),
  ], {
    p: anim([[0, add(ombro, [-10, 0])], [4, add(ombro, [-10, 0]), "out"], [20, ombro]]),
    r: anim([[0, 75], [20, 75, "ease"], [44, angulo - 4], [50, angulo]]), o: anim(aparecer(4, 6)),
  });
  const layers = [braco, jesus, tome];
  if (t >= 2) {
    const marcas = [8, 14, 20, 26].map((x) => reta([[x, 0], [x, 2.5]]));
    layers.unshift(L("T2_Esquadro", [
      stroke([...marcas, ...[8, 14, 20].map((y) => reta([[0, y], [2.5, y]]))], 0.9, hex("#66757F"), "Marcas"),
      fill([poligono([[0, 0], [34, 0], [34, 5], [5, 5], [5, 30], [0, 30]])], "#AAB8C2", "Esquadro"),
    ], { p: [22, 142], r: -10, s: anim([[0, 0], ...pop(42, 10, { over: 88, base: 80 })]), o: anim(aparecer(42, 3)) }));
  }
  if (t >= 3) {
    layers.push(
      aureola({ center: [J[0], J[1] - 15], rx: 10, ry: 3, t0: 52, nm: "T3_Aureola1" }),
      aureola({ center: [T[0], T[1] - 15], rx: 9, ry: 2.7, t0: 56, nm: "T3_Aureola2" }),
      raios("T3_Raios", J, { count: 12, r1: 16, r2: 26, half: 4, t0: 56 }),
    );
  }
  return layers;
}

/** Medalha de São Bento, frente (com a cruz) e verso, centradas em (0,0), raio 30, argola em (0,−34). */
function medalhaShapes(lado) {
  const argola = lib.makeEllipseRing(0, -34, 4, 4, 2, hex("#F4900C"), "Argola");
  const borda = lib.makeEllipseRing(0, 0, 30, 30, 3, hex("#F4900C"), "Borda");
  const contas = Array.from({ length: 16 }, (_, k) => {
    const a = (k / 16) * Math.PI * 2;
    return lib.makeEllipse(26.4 * Math.cos(a), 26.4 * Math.sin(a), 0.9, 0.9, hex("#C8962A"), `Letra${k}`);
  });
  if (lado === "frente") {
    return [
      stroke([reta([[0, -17], [0, 17]]), reta([[-17, 0], [17, 0]])], 4, hex("#8A4633"), "Cruz"),
      ...[[-8, -8], [8, -8], [-8, 8], [8, 8]].map(([x, y], k) => lib.makeEllipse(x, y, 1.6, 1.6, hex("#8A4633"), `Sigla${k}`)),
      ...contas,
      lib.makeEllipseRing(0, 0, 23, 23, 1.2, hex("#C8962A"), "Faixa"),
      borda, argola,
      lib.makeEllipse(0, 0, 30, 30, hex("#FFCC4D"), "Face"),
    ];
  }
  return [
    stroke([reta([[9, -14], [9, 18]])], 1.6, hex("#C8962A"), "Cajado"),
    lib.makeEllipse(0, -10, 4, 4.4, hex("#C8962A"), "Cabeca"),
    fill([forma([[-6, -5], [6, -5], [9, 18], [-9, 18]])], "#C8962A", "Habito"),
    ...contas, borda, argola,
    lib.makeEllipse(0, 0, 30, 30, hex("#FFD983"), "Face"),
  ];
}

/** São Bento de Núrsia: a medalha de São Bento gira e mostra a cruz. */
function gestoBento(t, c) {
  const A = [0, -34], P = [100, 70];
  const balanca = anim([[0, 0], [30, 0], ...onda(0, 6, 30, END, { period: 36 })]);
  const verso = L("G_Verso", medalhaShapes("verso"), {
    a: A, p: P, s: anim([[0, [100, 100]], [10, [100, 100], "in"], [20, [0, 100]]]), r: balanca, o: anim(aparecer(0, 6)),
  });
  const frente = L("G_Medalha", medalhaShapes("frente"), {
    a: A, p: P, s: anim([[0, [0, 100]], [20, [0, 100], "out"], [30, [100, 100]]]), r: balanca, o: anim(aparecer(18, 2)),
  });
  const layers = [];
  if (t >= 2) {
    const corvo = { "#FFAC33": "#66757F", "#DD2E44": "#292F33", "#292F33": "#14171A", "#A0041E": "#14171A" };
    layers.push(L("T2_Corvo", piece("twemoji-1f426", 30, { recolor: corvo }), {
      p: anim([[0, [164, 70]], ...trajeto([[164, 70], [158, 110], [150, 146]], 40, 58), ...pulo([150, 146], 62, { h: 3, d: 6 })]),
      o: anim(aparecer(40, 4)),
    }));
  }
  if (t >= 3) {
    layers.push(L("T3_Livro", livroFechadoShapes("#8A4633", "#5C3A21"), {
      a: [0, 9], p: [56, 162], s: anim([[0, 0], ...pop(46, 10, { over: 66, base: 60 })]), r: -8, o: anim(aparecer(46, 4)),
    }));
  }
  layers.push(frente, verso);
  if (t >= 3) layers.push(luzDoOuro(c, { w1: 84 }));
  return layers;
}

/** Escapulário marrom pendurado: cordão em V e dois panos em (x ± 19, 122..148). */
function escapulario(x) {
  const pano = (cx) => [
    lib.makeEllipse(cx, 135, 4, 5, hex("#FFE8B6"), "Imagem"),
    stroke([forma([[cx - 8, 125], [cx + 8, 125], [cx + 8, 145], [cx - 8, 145]])], 1, hex("#A0785A"), "Costura"),
    fill([rect(cx - 11, 122, cx + 11, 148)], "#7A4A2A", "Pano"),
  ];
  return {
    cordao: [stroke([lib.polyline([[x - 18, 124], [x - 14, 92], [x - 6, 66], [x, 58], [x + 6, 66], [x + 14, 92], [x + 18, 124]])], 1.6, hex("#5C3A21"), "Cordao")],
    panos: [...pano(x - 19), ...pano(x + 19)],
  };
}

/** Nossa Senhora do Carmo: o escapulário marrom desce. */
function gestoCarmo(t, c) {
  const X = t >= 3 ? 120 : 100;
  const { cordao, panos } = escapulario(X);
  const ks = () => ({
    a: [X, 58], p: anim([[0, [X, 30]], [4, [X, 30], "in"], [26, [X, 62], "out"], [30, [X, 58]]]),
    r: anim([[0, 0], [30, 0], ...onda(0, 4, 30, END, { period: 36 })]), o: anim(aparecer(4, 6)),
  });
  const layers = [];
  if (t >= 2) {
    layers.push(L("T2_Estrela", piece("twemoji-2b50", 14), {
      p: [X, 40], s: anim([[0, 0], ...pop(40, 10, { over: 125 }), ...pulsar(50, END, { amp: 8, period: 18 })]), o: anim(aparecer(40, 3)),
    }));
  }
  layers.push(L("G_Panos", panos, ks()), L("G_Cordao", cordao, ks()));
  if (t >= 3) {
    layers.push(
      aureola({ center: [60, 73], rx: 10, ry: 3, t0: 58, nm: "T3_Aureola" }),
      L("T3_Maria", busto(0.62, { manto: "#7A4A2A", veste: "#FFE8B6", orla: "#FFCC4D" }), {
        p: anim([[0, [60, 102]], [44, [60, 102], "out"], [60, [60, 94]], ...flutuar([60, 94], 60, 1.2)]), o: anim(aparecer(44, 10)),
      }),
      luzDoOuro(c, { bottom: 140, w1: 84, t0: 44 }),
    );
  }
  return layers;
}

/** Santa Maria Madalena: o vaso de perfume abre e o aroma sobe. */
function gestoMagdalena(t, c) {
  const vaso = L("G_Vaso", [
    stroke([reta([[81, 128], [119, 128]])], 2, hex("#FFCC4D"), "Faixa"),
    fill([rect(91, 100, 109, 103)], "#E8D5B0", "Boca"),
    fill([rect(94, 102, 106, 112)], "#E8D5B0", "Gargalo"),
    fill([forma([[86, 150], [80, 138], [80, 124], [88, 114], [94, 110], [106, 110], [112, 114], [120, 124], [120, 138], [114, 150]])], "#F5E6C8", "Bojo"),
    fill([forma([[88, 150], [112, 150], [116, 156], [84, 156]])], "#D9C49A", "Pe"),
  ], { a: [100, 156], p: [100, 156], s: anim(pop(0, 14, { over: 106 })), o: anim(aparecer(0, 6)) });
  const tampa = L("G_Tampa", [
    lib.makeEllipse(0, -7, 2.5, 2.5, hex("#D9C49A"), "Botao"),
    fill([forma([[-9, 0], [-7, -4], [0, -6], [7, -4], [9, 0]])], "#E8D5B0", "Tampa"),
  ], {
    p: anim([[0, [100, 100]], [18, [100, 100], "ease"], [32, [128, 94]]]), r: anim([[0, 0], [18, 0], [32, 28]]), o: anim(aparecer(0, 6)),
  });
  const fio = (x) => lib.polyline([[x, 98], [x + 5, 88], [x - 3, 78], [x + 4, 68], [x - 2, 60]]);
  const aroma = L("G_Aroma", [stroke([fio(94), fio(100), fio(106)], 2, hex("#F4ABBA"), "Aroma", {
    opacity: 75, trim: { e: anim([[0, 0], [22, 0, "out"], [44, 100]]), s: anim([[0, 0], [44, 0, "ease"], [80, 30]]) },
  })], { p: anim([[0, [0, 0]], [22, [0, 0], "linear"], [END - 1, [0, -6]]]), o: anim(aparecer(22, 4)) });
  const layers = [];
  if (t >= 3) {
    layers.push(L("T3_Sol", piece("twemoji-2600", 26), {
      p: anim([[0, [48, 74]], [48, [48, 74], "out"], [64, [48, 56]]]), r: anim(giro(45)), o: anim(aparecer(48, 6)),
    }));
  }
  layers.push(tampa, aroma, vaso);
  if (t >= 2) {
    layers.push(
      L("T2_Lagrima", piece("twemoji-1f4a7", 12), { p: anim([[0, [68, 92]], [40, [68, 92], "in"], [56, [68, 112]]]), o: anim(aparecer(40, 4)) }),
      L("T2_Coracao", piece("twemoji-2764", 18), { p: [138, 132], s: anim([[0, 0], ...pop(46, 10), ...pulsar(56, END, { amp: 8, period: 18 })]), o: anim(aparecer(46, 3)) }),
    );
  }
  if (t >= 3) layers.push(luzDoOuro(c, { w1: 84, t0: 44 }));
  return layers;
}

/** Livro fechado deitado, centrado em (0,0), 68 × 18 px: capa, lombada e o miolo das folhas. */
function livroFechadoShapes(capa = "#7A2E1E", lombada = "#5C1E14") {
  return [
    stroke([reta([[-28, -2], [30, -2]]), reta([[-28, 2], [30, 2]])], 0.8, hex("#E1C38F"), "Folhas"),
    fill([rect(-32, -9, 32, -6), rect(-32, 6, 32, 9)], capa, "Capa"),
    fill([rect(-30, -6, 31, 6)], "#FFE8B6", "Miolo"),
    fill([rect(-34, -9, -30, 9)], lombada, "Lombada"),
  ];
}

/**
 * Bordão de peregrina (Santa Brígida, peregrina a Roma e Jerusalém), com o pé
 * em (0,0): cajado reto de madeira com pomo, fita amarrada no alto e a
 * pequena bolsa de peregrino (escarcela) pendurada por uma alça.
 */
function bordaoPeregrinaShapes() {
  return [
    fill([forma([[-11, -50], [-3, -50], [-2, -40], [-6, -37], [-11, -40]])], "#8A4633", "Bolsa"),
    stroke([reta([[-11, -46], [-3, -46]])], 1, hex("#5C3A21"), "Aba"),
    stroke([lib.polyline([[0, -68], [-4, -60], [-7, -50]]), lib.polyline([[0, -68], [-1, -58], [-3, -50]])], 1.1, hex("#5C3A21"), "Alca"),
    fill([poligono([[0, -72], [7, -69], [5, -64], [0, -67]])], "#DD2E44", "Fita"),
    lib.makeEllipse(0, -84, 3, 3, hex("#A0522D"), "Pomo"),
    stroke([reta([[0, 0], [0, -82]])], 3.4, hex("#C1694F"), "Cajado"),
  ];
}

/** Santa Brígida da Suécia: a vela acende sobre o livro das revelações. */
function gestoBrigida(t) {
  const livro = L("G_Livro", livroFechadoShapes(), { p: [100, 150], s: anim(pop(0, 12, { over: 106 })), o: anim(aparecer(0, 6)) });
  const vela = L("G_Vela", velaComprida(46, 11, "#FFF1C1"), {
    a: [0, 23], p: [100, 141], s: anim([[0, [100, 0]], ...abrir(6, 20, { axis: "y" })]), o: anim(aparecer(6, 3)),
  });
  const fogo = chama("G_Chama", 16, [100, 91], 20, { period: 10 });
  const luz = brilho("G_Brilho", [100, 84], { rx: 12, ry: 14, color: "#FFE8A3", t0: 26, peak: 24, period: 12 });
  const layers = [fogo, vela, livro];
  if (t >= 2) {
    layers.unshift(L("T2_Bordao", bordaoPeregrinaShapes(), {
      p: [142, 162], r: anim([[0, 16], [40, 16, "ease"], [54, 6], [58, 8]]), o: anim(aparecer(40, 4)),
    }));
  }
  layers.push(luz);
  if (t >= 3) layers.push(...aureolaERaios([100, 58], { rx: 16, ry: 4.5, t0: 54, r1: 20, r2: 30 }));
  return layers;
}

/** Lamparina de barro (de azeite), com o bico em (32, −1). */
function lamparinaShapes() {
  return [
    lib.makeEllipse(-2, -5, 6, 2, hex("#8A4633"), "Boca"),
    stroke([lib.polyline([[-20, 0], [-28, -6], [-24, -12], [-18, -6]])], 3, hex("#A0522D"), "Alca"),
    fill([forma([[-22, 4], [-16, -4], [0, -7], [16, -5], [28, -3], [32, -1], [28, 2], [14, 6], [0, 8], [-16, 8]])], "#C1694F", "Barro"),
    lib.makeEllipse(0, 9, 10, 2.5, hex("#8A4633"), "Base"),
  ];
}

/** São Charbel Makhlouf: a lamparina do eremita acende na noite. */
function gestoCharbel(t, c) {
  const P = [96, 146], bico = add(P, [32, -1]);
  const lua = L("G_Lua", piece("twemoji-1f319", 28), { p: anim([[0, [148, 54]], ...flutuar([148, 54], 0, 1.5)]), o: anim(aparecer(0, 10)) });
  const lamparina = L("G_Lamparina", lamparinaShapes(), { p: P, s: anim(pop(0, 12, { over: 106 })), o: anim(aparecer(0, 6)) });
  const fogo = chama("G_Chama", 18, add(bico, [-2, -1]), 14, { period: 10 });
  const luz = brilho("G_Brilho", add(bico, [-2, -9]), { rx: 14, ry: 15, color: "#FFE8A3", t0: 20, peak: 26, period: 14 });
  const layers = [];
  if (t >= 3) {
    layers.push(L("T3_Estrelas", pieces("twemoji-2b50", 8, [[40, 50], [72, 36], [118, 42], [58, 80]]), {
      p: [80, 52], a: [80, 52], s: anim([[0, 0], ...pop(46, 10), ...pulsar(56, END, { amp: 10, period: 14 })]), o: anim(aparecer(46, 4)),
    }));
  }
  layers.push(lua, fogo, lamparina);
  if (t >= 2) {
    const cedro = [
      fill([poligono([[-6, -40], [6, -40], [0, -46]]), poligono([[-12, -32], [12, -32], [4, -40], [-4, -40]])], "#5C913B", "Copa1"),
      fill([poligono([[-18, -22], [18, -22], [8, -32], [-8, -32]]), poligono([[-24, -10], [24, -10], [12, -22], [-12, -22]])], "#3E721D", "Copa2"),
      fill([rect(-2.5, -10, 2.5, 0)], "#8A4633", "Tronco"),
    ];
    layers.push(L("T2_Cedro", cedro, { p: [48, 160], s: anim([[0, 0], ...abrir(40, 54, { axis: "xy" })]), o: anim(aparecer(40, 4)) }));
  }
  layers.push(luz);
  if (t >= 3) layers.push(luzDoOuro(c, { peak: 26 }));
  return layers;
}

/** São Tiago Maior: a concha de vieira aparece e o bordão de peregrino se ergue. */
function gestoTiago(t, c) {
  const concha = L("G_Concha", conchaShapes(24), {
    p: [92, 104], s: anim(pop(0, 14, { over: 110 })), r: anim([[0, 0], [20, 0], ...onda(0, 3, 20, END, { period: 30 })]), o: anim(aparecer(0, 4)),
  });
  const bordaoKs = (t0) => ({ p: [138, 166], r: anim([[0, -60], [10, -60, "ease"], [34, -6], [38, -8]]), o: anim(aparecer(t0, 6)) });
  const bordao = L("G_Bordao", [
    lib.makeEllipse(0, -112, 3.5, 3.5, hex("#A0522D"), "Pomo"),
    stroke([reta([[0, 0], [0, -110]])], 4, hex("#8A4633"), "Bordao"),
  ], bordaoKs(8));
  const layers = [];
  if (t >= 3) {
    layers.push(L("T3_Estrela", piece("twemoji-1f31f", 28), {
      p: anim([[0, [62, 60]], [46, [62, 60], "out"], [60, [62, 48]], ...flutuar([62, 48], 60, 1.5)]),
      s: anim([[0, 40], [46, 40, "out"], [60, 100]]), o: anim(aparecer(46, 4)),
    }));
  }
  if (t >= 2) {
    // cabaça amarrada perto do alto do bordão (acompanha o bordão)
    layers.push(L("T2_Cabaca", [
      lib.makeEllipse(8, -84, 4, 4, hex("#E8A84C"), "Gargalo"),
      lib.makeEllipse(9, -75, 6.5, 6.5, hex("#D4893A"), "Bojo"),
      stroke([lib.polyline([[0, -96], [5, -92], [8, -88]])], 1.2, hex("#5C3A21"), "Cordel"),
    ], bordaoKs(40)));
  }
  layers.push(concha, bordao);
  if (t >= 3) layers.push(luzDoOuro(c, { w1: 84, t0: 44 }));
  return layers;
}

/** Sant'Ana e São Joaquim: duas figuras (bustos) com a menina Maria entre eles. */
function gestoSantana(t, c) {
  const K = 0.7, KM = 0.42;
  const entra = (x0, x1, t0) => ({ p: anim([[0, [x0, 100]], [t0, [x0, 100], "out"], [t0 + 16, [x1, 94]]]), o: anim(aparecer(t0, 8)) });
  const ana = L("G_Ana", busto(K, { manto: "#5C913B", veste: "#BE1931" }), entra(56, 64, 0));
  const joaquim = L("G_Joaquim", busto(K, { veste: "#8A4633", cabelo: "curto", corCabelo: "#CCD6DD", barba: "#CCD6DD" }), entra(144, 136, 4));
  const menina = L("G_Menina", busto(KM, { veste: "#F5F8FA", cabelo: "longo", corCabelo: "#662113" }), {
    a: [0, 70 * KM], p: [100, 114 + 70 * KM], s: anim([[0, 0], ...pop(20, 12, { over: 112 })]), o: anim(aparecer(20, 4)),
  });
  const layers = [];
  if (t >= 2) {
    layers.push(L("T2_Livro", piece("twemoji-1f4d6", 28), {
      p: [78, 140], s: anim([[0, [4, 100]], ...abrir(40, 52, { axis: "x", from: 4 })]), o: anim(aparecer(40, 3)),
    }));
  }
  layers.push(menina, ana, joaquim);
  if (t >= 3) {
    layers.push(L("T3_Aureolas", [
      lib.makeEllipseRing(64, 70, 11, 3, 2.6, kit.HALO_GOLD, "Aureola1"),
      lib.makeEllipseRing(136, 78, 11, 3, 2.6, kit.HALO_GOLD, "Aureola2"),
      lib.makeEllipseRing(100, 104, 7, 2, 2, kit.HALO_GOLD, "Aureola3"),
    ], { p: [0, 0], o: anim([...aparecer(50, 10, { to: 85 }), ...onda(85, 12, 60, END, { period: 30 })]) }));
    layers.push(luzDoOuro(c, { bottom: 140, w1: 90, t0: 44 }));
  }
  return layers;
}

/** Vassoura, pendurada pelo alto do cabo em (0,0), com as cerdas embaixo (y 72 a 96). */
function vassouraShapes() {
  return [
    fill([rect(-5, 68, 5, 73)], "#8A4633", "Amarra"),
    stroke([-8, -3, 2, 7].map((x) => reta([[x * 0.4, 74], [x, 95]])), 0.9, hex("#B8913F"), "Fios"),
    fill([forma([[-5, 72], [5, 72], [14, 96], [-14, 96]])], "#D9B26F", "Cerdas"),
    stroke([reta([[0, 0], [0, 70]])], 3.5, hex("#A0522D"), "Cabo"),
  ];
}

/** Santa Marta: a vassoura varre e um dragão pequeno foge. */
function gestoMarta(t, c) {
  const vassoura = L("G_Vassoura", vassouraShapes(), {
    p: [86, 56], r: anim([[0, 0], [4, 0], ...onda(0, 12, 4, END, { period: 24 })]), o: anim(aparecer(0, 6)),
  });
  const dragao = L("G_Dragao", piece("twemoji-1f409", 34), {
    p: anim([[0, [118, 148]], [12, [118, 148], "out"], [17, [126, 140], "in"], [22, [134, 148], "out"], [27, [142, 140], "in"], [32, [150, 148], "out"], [37, [154, 144], "in"], [42, [156, 148]]]),
    r: anim([[0, 0], [12, 0], ...onda(0, 6, 12, 42, { period: 10 })]), o: anim(aparecer(0, 6)),
  });
  const layers = [vassoura, dragao];
  if (t >= 2) {
    layers.push(L("T2_JarroPrato", [
      ...pieceAt("twemoji-1f3fa", 26, [38, 140]),
      lib.makeEllipseRing(38, 156, 14, 3.4, 1.2, hex("#AAB8C2"), "Borda"),
      lib.makeEllipse(38, 156, 14, 3.4, hex("#E1E8ED"), "Prato"),
    ], { a: [38, 160], p: [38, 160], s: anim([[0, 0], ...pop(42, 10)]), o: anim(aparecer(42, 3)) }));
  }
  if (t >= 3) {
    layers.push(aureola({ center: [86, 44], rx: 14, ry: 4, t0: 52, nm: "T3_Aureola" }));
    layers.push(luzDoOuro(c, { w1: 84, t0: 44 }));
  }
  return layers;
}

/** Monograma IHS com a cruz sobre o H, centrado em (0,0). */
function ihsShapes() {
  return [
    reta([[-15, -8], [-15, 8]]),
    reta([[-7, -8], [-7, 8]]), reta([[3, -8], [3, 8]]), reta([[-7, 0], [3, 0]]),
    lib.polyline([[16, -6], [13, -8.5], [9, -7], [9, -2.5], [16, 1.5], [16, 6], [12, 8.5], [8, 6]]),
    reta([[-2, -10], [-2, -19]]), reta([[-5.5, -15.5], [1.5, -15.5]]),
  ];
}

/** São Inácio de Loyola: o monograma IHS acende num sol. */
function gestoInacio(t) {
  const C = [100, 96];
  const sol = L("G_Sol", [
    lib.makeEllipseRing(0, 0, 25, 25, 2.5, hex("#F4900C"), "Borda"),
    lib.makeEllipse(0, 0, 25, 25, hex("#FFCC4D"), "Sol"),
    lib.makeRays(16, 25, 36, 5, hex("#FFAC33"), "Raios", [0, 0]),
  ], { p: C, s: anim([[0, 0], ...pop(0, 14, { over: 108 })]), r: anim(giro(360 / 16)), o: anim(aparecer(0, 6)) });
  const letras = L("G_IHS", [stroke(ihsShapes(), 3.2, hex("#A0041E"), "IHS", { trim: { e: anim([[0, 0], [14, 0, "out"], [32, 100]]) } })], {
    p: C, s: anim([[0, 100], [32, 100, "out"], [36, 110], [42, 100]]), o: anim(aparecer(14, 3)),
  });
  const layers = [letras, sol];
  if (t >= 3) {
    layers.unshift(chama("T3_Chama", 16, [100, 42], 50, { period: 10 }));
    layers.push(raios("T3_Raios", C, { count: 12, r1: 46, r2: 58, half: 3, t0: 54, peak: 80 }));
  }
  if (t >= 2) {
    layers.unshift(L("T2_Livro", piece("twemoji-1f4d6", 36), {
      p: [100, 164], s: anim([[0, [4, 100]], ...abrir(40, 52, { axis: "x", from: 4 })]), o: anim(aparecer(40, 3)),
    }));
  }
  return layers;
}

// ── Tabela do lote 3 ─────────────────────────────────────────────────────────
/**
 * Os 27 litúrgicos de maio a julho, na ordem do calendário.
 * icon: peça principal do gesto (chave em ICONS ou DRAWN; uma diferente por
 * troféu, em todos os lotes). color: cor litúrgica (vermelho para os mártires e
 * apóstolos — Matias, Barnabé, Fisher e Moro, Ireneu, Pedro e Paulo, Tomé,
 * Tiago — e Pentecostes; branco para as demais). halo: auréola de base que
 * acende; todo santo tem, menos os da lista SEM_HALO (festas sem santo e
 * troféus em que a tabela do guia põe a auréola só no ouro).
 */
const TROPHIES = [
  // Maio
  { id: "lt_jose_operario",      kind: "liturgical", icon: "desenho-plaina",             color: "branco",   gesture: gestoJoseOperario,    symbol: "plaina sobre a tábua, com lascas" },
  { id: "lt_fatima",             kind: "liturgical", icon: "desenho-maria-azinheira",    color: "branco",   gesture: gestoFatima,          halo: { center: [100, 33], rx: 12, ry: 3.5, t0: 30 }, symbol: "Maria de manto branco de pé sobre a azinheira" },
  { id: "lt_matias",             kind: "liturgical", icon: "desenho-doze-chamas",        color: "vermelho", gesture: gestoMatias,          halo: { center: [100, 48], rx: 14, ry: 4, t0: 40 }, symbol: "a 12ª chama que completa os Doze" },
  { id: "lt_isidoro_lavrador",   kind: "liturgical", icon: "desenho-arado",              color: "branco",   gesture: gestoIsidoroLavrador, halo: { center: [100, 70], rx: 16, ry: 4.5, t0: 44 }, symbol: "arado, sulco e brotos" },
  { id: "lt_rita_cassia",        kind: "liturgical", icon: "desenho-rosa-na-neve",       color: "branco",   gesture: gestoRita,            halo: { center: [100, 98], rx: 14, ry: 4, t0: 34 }, symbol: "rosa que floresce na neve" },
  { id: "lt_visitacao",          kind: "liturgical", icon: "desenho-visitacao",          color: "branco",   gesture: gestoVisitacao,       halo: { center: [92, 66], rx: 10, ry: 3, t0: 44 }, symbol: "Maria e Isabel inclinadas uma para a outra" },
  { id: "lt_ascensao",           kind: "liturgical", icon: "desenho-jesus-glorioso",     color: "branco",   gesture: gestoAscensao,        symbol: "Jesus glorioso sobe sobre a nuvem" },
  // Junho
  { id: "lt_pentecostes",        kind: "liturgical", icon: "twemoji-1f525",              color: "vermelho", gesture: gestoPentecostes,     symbol: "línguas de fogo que descem" },
  { id: "lt_corpus_christi",     kind: "liturgical", icon: "desenho-custodia",           color: "branco",   gesture: gestoCorpusChristi,   symbol: "custódia com a hóstia" },
  { id: "lt_sagrado_coracao",    kind: "liturgical", icon: "desenho-sagrado-coracao",    color: "branco",   gesture: gestoSagradoCoracao,  symbol: "coração com chamas e a cruz" },
  { id: "lt_barnabe",            kind: "liturgical", icon: "desenho-evangelho-na-pedra", color: "vermelho", gesture: gestoBarnabe,         symbol: "Evangelho aberto sobre a pedra" },
  { id: "lt_antonio",            kind: "liturgical", icon: "desenho-menino-sobre-livro", color: "branco",   gesture: gestoAntonio,         halo: { center: [100, 90], rx: 10, ry: 3, t0: 30 }, symbol: "Menino Jesus sobre o livro" },
  { id: "lt_luis_gonzaga",       kind: "liturgical", icon: "desenho-crucifixo",          color: "branco",   gesture: gestoLuisGonzaga,     symbol: "lírio ao lado do crucifixo" },
  { id: "lt_fisher_tomas_moro",  kind: "liturgical", icon: "desenho-chapeus",            color: "vermelho", gesture: gestoFisherMoro,      halo: { center: [100, 76], rx: 16, ry: 4.5, t0: 44 }, symbol: "chapéu de cardeal e de chanceler sobre o livro" },
  { id: "lt_joao_batista",       kind: "liturgical", icon: "desenho-fogueira",           color: "branco",   gesture: gestoJoaoBatista,     halo: { center: [100, 80], rx: 16, ry: 4.5, t0: 40 }, symbol: "fogueira de São João" },
  { id: "lt_ireneu",             kind: "liturgical", icon: "desenho-baculo",             color: "vermelho", gesture: gestoIreneu,          symbol: "báculo de bispo e livro" },
  { id: "lt_pedro_paulo",        kind: "liturgical", icon: "desenho-chaves-e-espada",    color: "vermelho", gesture: gestoPedroPaulo,      symbol: "chaves e espada cruzadas" },
  // Julho
  { id: "lt_tome",               kind: "liturgical", icon: "desenho-tome-e-jesus",       color: "vermelho", gesture: gestoTome,            symbol: "a mão de Tomé na chaga de Jesus" },
  { id: "lt_bento",              kind: "liturgical", icon: "desenho-medalha-sao-bento",  color: "branco",   gesture: gestoBento,           halo: { center: [100, 56], rx: 14, ry: 4, t0: 34 }, symbol: "medalha de São Bento" },
  { id: "lt_carmo",              kind: "liturgical", icon: "desenho-escapulario",        color: "branco",   gesture: gestoCarmo,           symbol: "escapulário marrom" },
  { id: "lt_magdalena",          kind: "liturgical", icon: "desenho-vaso-de-perfume",    color: "branco",   gesture: gestoMagdalena,       halo: { center: [100, 46], rx: 16, ry: 4.5, t0: 44 }, symbol: "vaso de perfume que se abre" },
  { id: "lt_brigida",            kind: "liturgical", icon: "desenho-vela-e-livro",       color: "branco",   gesture: gestoBrigida,         symbol: "vela acesa sobre o livro das revelações" },
  { id: "lt_charbel",            kind: "liturgical", icon: "desenho-lamparina",          color: "branco",   gesture: gestoCharbel,         halo: { center: [96, 104], rx: 16, ry: 4.5, t0: 40 }, symbol: "lamparina do eremita na noite" },
  { id: "lt_tiago",              kind: "liturgical", icon: "desenho-concha-de-vieira",   color: "vermelho", gesture: gestoTiago,           halo: { center: [92, 72], rx: 16, ry: 4.5, t0: 40 }, symbol: "concha de vieira e bordão" },
  { id: "lt_santana",            kind: "liturgical", icon: "desenho-sant-ana-e-joaquim", color: "branco",   gesture: gestoSantana,         symbol: "Sant'Ana, São Joaquim e a menina Maria" },
  { id: "lt_marta",              kind: "liturgical", icon: "desenho-vassoura",           color: "branco",   gesture: gestoMarta,           symbol: "vassoura e o dragão que foge" },
  { id: "lt_inacio_loyola",      kind: "liturgical", icon: "desenho-ihs",                color: "branco",   gesture: gestoInacio,          halo: { center: [100, 96], r: 42, t0: 40 }, symbol: "monograma IHS no sol" },
];

/** Litúrgicos sem auréola de base, com o motivo (os demais santos têm `halo`). */
const SEM_HALO = {
  lt_jose_operario: "auréola só no ouro",
  lt_ascensao: "festa sem santo",
  lt_pentecostes: "festa sem santo",
  lt_corpus_christi: "festa sem santo",
  lt_sagrado_coracao: "festa sem santo",
  lt_barnabe: "auréola só no ouro",
  lt_luis_gonzaga: "auréola só no ouro",
  lt_ireneu: "auréola só no ouro",
  lt_pedro_paulo: "auréola só no ouro (dupla)",
  lt_tome: "auréola só no ouro",
  lt_carmo: "auréola só no ouro (com Maria)",
  lt_brigida: "auréola só no ouro",
  lt_santana: "auréola só no ouro (as três)",
  lt_marta: "auréola só no ouro",
};

module.exports = { ICONS, DRAWN, TROPHIES, SEM_HALO, TIERS: kit.TIERS, LITURGICAL_COLORS: kit.LITURGICAL_COLORS, buildTrophy, checkUniqueIcons, checkUniqueIds };

if (require.main === module) main(TROPHIES, { self: __filename });
