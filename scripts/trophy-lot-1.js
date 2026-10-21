#!/usr/bin/env node
/**
 * trophy-lot-1.js — Story 11.7, lote 1 de Lottie dos troféus sem animação.
 *
 * Lote 1: os 3 sazonais sem Lottie (3 níveis cada: x.json = bronze, x_t2 =
 * prata, x_t3 = ouro) e os 10 litúrgicos de janeiro (um nível só: lt_x.json).
 *
 * Cada troféu tem o seu próprio elemento (um ícone diferente por troféu). Os
 * litúrgicos usam o símbolo do santo ou da festa (atributo iconográfico) sobre
 * um disco com auréola e raios; os sazonais ficam sobre uma medalha na cor do
 * nível.
 *
 * Ícones: Twemoji (https://github.com/jdecked/twemoji, v15.1.0),
 * licença CC-BY 4.0 — © Twitter, Inc. e colaboradores. Os caminhos SVG foram
 * copiados para esta tabela; nada é baixado em tempo de execução.
 *
 * Uso: node scripts/trophy-lot-1.js
 * Recusa (e não escreve) qualquer id que já esteja em APPROVED_LOTTIE.
 */
const lib = require("./lottie-lib");
const { lighten } = lib;

// ── Ícones (fonte e licença por ícone) ───────────────────────────────────────
const ICONS = {
  "twemoji-1f4b5": {
    source: "Twemoji 1f4b5.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#5C913B", d: "M2 11c-2 0-2 2-2 2v21s0 2 2 2h32c2 0 2-2 2-2V13s0-2-2-2H2z" },
      { fill: "#A7D28B", d: "M2 6C0 6 0 8 0 8v20s0 2 2 2h32c2 0 2-2 2-2V8s0-2-2-2H2z" },
      { fill: "#77B255", circle: [25, 18, 6.5] },
      { fill: "#5C913B", d: "M33 28.5H3c-.827 0-1.5-.673-1.5-1.5V9c0-.827.673-1.5 1.5-1.5h30c.827 0 1.5.673 1.5 1.5v18c0 .827-.673 1.5-1.5 1.5zM3 8.5c-.275 0-.5.224-.5.5v18c0 .275.225.5.5.5h30c.275 0 .5-.225.5-.5V9c0-.276-.225-.5-.5-.5H3z" },
      { fill: "#FFE8B6", d: "M14 6h8v24.062h-8z" },
      { fill: "#FFAC33", d: "M14 30h8v6h-8z" },
      { fill: "#5C913B", d: "M11.81 20.023c0-2.979-5.493-2.785-5.493-4.584 0-.871.833-1.296 1.799-1.296 1.625 0 1.914 1.044 2.65 1.044.521 0 .772-.328.772-.696 0-.856-1.296-1.502-2.539-1.726v-.825c0-.515-.417-.932-.932-.932s-.932.418-.932.932v.853c-1.354.31-2.521 1.25-2.521 2.781 0 2.862 5.493 2.746 5.493 4.758 0 .695-.754 1.391-1.992 1.391-1.857 0-2.476-1.257-3.229-1.257-.368 0-.696.309-.696.775 0 .741 1.24 1.631 2.947 1.881l-.001.004v.934c0 .514.418.932.933.932.514-.001.931-.419.931-.932v-.934c0-.01-.005-.019-.006-.028 1.535-.287 2.816-1.286 2.816-3.075z" },
    ],
  },
  "twemoji-2600": {
    source: "Twemoji 2600.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#FFAC33", d: "M16 2s0-2 2-2 2 2 2 2v2s0 2-2 2-2-2-2-2V2zm18 14s2 0 2 2-2 2-2 2h-2s-2 0-2-2 2-2 2-2h2zM4 16s2 0 2 2-2 2-2 2H2s-2 0-2-2 2-2 2-2h2zm5.121-8.707s1.414 1.414 0 2.828-2.828 0-2.828 0L4.878 8.708s-1.414-1.414 0-2.829c1.415-1.414 2.829 0 2.829 0l1.414 1.414zm21 21s1.414 1.414 0 2.828-2.828 0-2.828 0l-1.414-1.414s-1.414-1.414 0-2.828 2.828 0 2.828 0l1.414 1.414zm-.413-18.172s-1.414 1.414-2.828 0 0-2.828 0-2.828l1.414-1.414s1.414-1.414 2.828 0 0 2.828 0 2.828l-1.414 1.414zm-21 21s-1.414 1.414-2.828 0 0-2.828 0-2.828l1.414-1.414s1.414-1.414 2.828 0 0 2.828 0 2.828l-1.414 1.414zM16 32s0-2 2-2 2 2 2 2v2s0 2-2 2-2-2-2-2v-2z" },
      { fill: "#FFAC33", circle: [18, 18, 10] },
    ],
  },
  "twemoji-1f4ca": {
    source: "Twemoji 1f4ca.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#CCD6DD", d: "M31 2H5C3.343 2 2 3.343 2 5v26c0 1.657 1.343 3 3 3h26c1.657 0 3-1.343 3-3V5c0-1.657-1.343-3-3-3z" },
      { fill: "#E1E8ED", d: "M31 1H5C2.791 1 1 2.791 1 5v26c0 2.209 1.791 4 4 4h26c2.209 0 4-1.791 4-4V5c0-2.209-1.791-4-4-4zm0 2c1.103 0 2 .897 2 2v4h-6V3h4zm-4 16h6v6h-6v-6zm0-2v-6h6v6h-6zM25 3v6h-6V3h6zm-6 8h6v6h-6v-6zm0 8h6v6h-6v-6zM17 3v6h-6V3h6zm-6 8h6v6h-6v-6zm0 8h6v6h-6v-6zM3 5c0-1.103.897-2 2-2h4v6H3V5zm0 6h6v6H3v-6zm0 8h6v6H3v-6zm2 14c-1.103 0-2-.897-2-2v-4h6v6H5zm6 0v-6h6v6h-6zm8 0v-6h6v6h-6zm12 0h-4v-6h6v4c0 1.103-.897 2-2 2z" },
      { fill: "#5C913B", d: "M13 33H7V16c0-1.104.896-2 2-2h2c1.104 0 2 .896 2 2v17z" },
      { fill: "#3B94D9", d: "M29 33h-6V9c0-1.104.896-2 2-2h2c1.104 0 2 .896 2 2v24z" },
      { fill: "#DD2E44", d: "M21 33h-6V23c0-1.104.896-2 2-2h2c1.104 0 2 .896 2 2v10z" },
    ],
  },
  "twemoji-1f451": {
    source: "Twemoji 1f451.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#F4900C", d: "M14.174 17.075L6.75 7.594l-3.722 9.481z" },
      { fill: "#F4900C", d: "M17.938 5.534l-6.563 12.389H24.5z" },
      { fill: "#F4900C", d: "M21.826 17.075l7.424-9.481 3.722 9.481z" },
      { fill: "#FFCC4D", d: "M28.669 15.19L23.887 3.523l-5.88 11.668-.007.003-.007-.004-5.88-11.668L7.331 15.19C4.197 10.833 1.28 8.042 1.28 8.042S3 20.75 3 33h30c0-12.25 1.72-24.958 1.72-24.958s-2.917 2.791-6.051 7.148z" },
      { fill: "#5C913B", circle: [17.957, 22, 3.688] },
      { fill: "#981CEB", circle: [26.463, 22, 2.412] },
      { fill: "#DD2E44", circle: [32.852, 22, 1.986] },
      { fill: "#981CEB", circle: [9.45, 22, 2.412] },
      { fill: "#DD2E44", circle: [3.061, 22, 1.986] },
      { fill: "#FFAC33", d: "M33 34H3c-.552 0-1-.447-1-1s.448-1 1-1h30c.553 0 1 .447 1 1s-.447 1-1 1zm0-3.486H3c-.552 0-1-.447-1-1s.448-1 1-1h30c.553 0 1 .447 1 1s-.447 1-1 1z" },
      { fill: "#FFCC4D", circle: [1.447, 8.042, 1.407] },
      { fill: "#F4900C", circle: [6.75, 7.594, 1.192] },
      { fill: "#FFCC4D", circle: [12.113, 3.523, 1.784] },
      { fill: "#FFCC4D", circle: [34.553, 8.042, 1.407] },
      { fill: "#F4900C", circle: [29.25, 7.594, 1.192] },
      { fill: "#FFCC4D", circle: [23.887, 3.523, 1.784] },
      { fill: "#F4900C", circle: [17.938, 5.534, 1.784] },
    ],
  },
  "twemoji-2b50": {
    source: "Twemoji 2b50.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#FFAC33", d: "M27.287 34.627c-.404 0-.806-.124-1.152-.371L18 28.422l-8.135 5.834c-.693.496-1.623.496-2.312-.008-.689-.499-.979-1.385-.721-2.194l3.034-9.792-8.062-5.681c-.685-.505-.97-1.393-.708-2.203.264-.808 1.016-1.357 1.866-1.363L12.947 13l3.179-9.549c.268-.809 1.023-1.353 1.874-1.353.851 0 1.606.545 1.875 1.353L23 13l10.036.015c.853.006 1.606.556 1.867 1.363.263.81-.022 1.698-.708 2.203l-8.062 5.681 3.034 9.792c.26.809-.033 1.695-.72 2.194-.347.254-.753.379-1.16.379z" },
    ],
  },
  "twemoji-1f54a": {
    source: "Twemoji 1f54a.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#5C913B", d: "M.794 16.112c1 0 5.875 1.344 6.5 2.312L6.013 18.3s-3.906-1.25-4.906-1.25c-1.001 0-.313-.938-.313-.938z" },
      { fill: "#99AAB5", d: "M11 2c1 1 3 7 3 10s-2 6 2 8 5.001-1 5.001-5S20 7 19 5s-2 0-2 0-1-4-2-4-1 2-1 2-2-2-3-2 0 1 0 1z" },
      { fill: "#CCD6DD", d: "M10 15c3 0 4 4 6 4s1-3 3-3 10-5 10-11 3-3 3-1c1 0 2 1.586 2 3 0 1 0 2-1 3 1 0 2 2 1 3 1 3-1 6-3 7 0 1-2 3-4 2 0 0-1 3-3 2 0 0 3.052 1.684 4 2 3 1 7 1 7 1s0 1-2 2c0 0 1 1 0 2s-2 1-2 1 1 2-2 1-6-4-6-4-5 1-9-1-6-6-6-8-3-1-4-1 2-2 3-2c0 0 0-2 3-2z" },
      { fill: "#5C913B", d: "M6.95 18.019s5.438 2.625 7.938 6.656c1.9 3.064 2.782 8.656 2.782 8.656s.043.564-.907-2.281c-1-3-2.217-6.288-4.312-8.188-3.344-3.031-4.75-3.5-6.062-4.25-.332-.189.217-.687.561-.593z" },
      { fill: "#5C913B", d: "M16.198 28.54s2.038.103 3.107 2.139c1.068 2.036-.053 4.914-.053 4.914s-2.75-1.268-3.462-2.947c-.712-1.68.408-4.106.408-4.106zm-2.133-4.778s1.274 1.437 3.558 1.705c2.284.269 4.121-1.379 4.121-1.379s-2.144-1.97-3.968-2.033c-1.823-.065-3.711 1.707-3.711 1.707zm-4.047-3.148s-2.015.329-2.85 2.472.425 4.01.425 4.01 2.534-.848 3.055-2.597c.521-1.747-.63-3.885-.63-3.885z" },
    ],
  },
  "twemoji-1f416": {
    source: "Twemoji 1f416.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#F4ABBA", d: "M33.738 20.368c-.799-5.543-5.186-9.78-12.562-9.78-.293 0-.621.012-.964.03-1.479.058-2.961.248-4.399.56-.749.144-1.507.317-2.253.514-.775-1.051-2.342-2.163-2.736-2.163-.512 0-.038 1.871-.006 3.052-.88.349-1.685.742-2.347 1.183-3.177 2.118-3.177 3.177-6.838 3.177-1.632 0-1.588 1.658-1.588 3.705 0 2.046-.044 2.618 1.588 3.707 2.183 1.456 4.731 3.612 7.952 5.386C11.608 32.886 9.91 36 11.648 36c1.226 0 2.807-1.964 3.647-3.944 1.788.474 3.732.769 5.881.769 1.142 0 2.204-.089 3.201-.245.272 1.944-.16 3.42 1.035 3.42 1.555 0 6.998-4.994 8.218-11.29.06-.287.103-.582.142-.882.012-.09.028-.18.038-.271.021-.199.03-.404.041-.608 1.046.275 2.149.693 2.149-.175 0-.705-1.119-1.715-2.262-2.406z" },
      { fill: "#292F33", d: "M10.588 16.941c0 .584-.474 1.059-1.059 1.059-.584 0-1.059-.474-1.059-1.059s.474-1.059 1.059-1.059 1.059.474 1.059 1.059z" },
    ],
  },
  "twemoji-1f3f9": {
    source: "Twemoji 1f3f9.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#C1694F", d: "M21.279 4.28c-9 0-10.5 1.5-13 4s-4 4-4 13c0 11.181-2 14-1 14s3-2 3-4-2-13 5-20h-.001c7-6.999 18-5 20-5s4-2 4-3-2.818 1-13.999 1z" },
      { fill: "#D99E82", d: "M29.5 29.779c0 .276-.224.5-.5.5H3.78c-.276 0-.5-.224-.5-.5s.224-.5.5-.5H29c.276 0 .5.224.5.5zm.279-.279c-.277 0-.5-.225-.5-.5V3.779c0-.276.223-.5.5-.5.275 0 .5.224.5.5V29c0 .275-.224.5-.5.5z" },
      { fill: "#99AAB5", d: "M0 0l2.793 8.52L4.93 4.955l3.52-2.092z" },
      { fill: "#DD2E44", d: "M26.087 27.393c.364 1.897 0 3.564-.812 3.719-.814.156-1.77-1.256-2.133-3.154-.364-1.898-.001-3.564.812-3.721.814-.157 1.769 1.257 2.133 3.156z" },
      { fill: "#F4900C", d: "M26.568 28.465c.365 1.899 0 3.565-.812 3.721-.813.156-1.769-1.258-2.132-3.154-.365-1.9-.001-3.566.811-3.721.814-.157 1.77 1.255 2.133 3.154z" },
      { fill: "#A0041E", d: "M27.958 29.854c.364 1.899 0 3.564-.812 3.721-.813.156-1.77-1.256-2.133-3.154-.364-1.898 0-3.564.812-3.721.814-.157 1.77 1.255 2.133 3.154z" },
      { fill: "#DD2E44", d: "M29.372 31.268c.365 1.898 0 3.566-.812 3.721-.814.156-1.77-1.256-2.133-3.154-.364-1.899 0-3.564.812-3.721.814-.157 1.77 1.257 2.133 3.154zm-1.979-5.181c1.897.364 3.564 0 3.719-.812.156-.814-1.256-1.77-3.154-2.133-1.898-.364-3.564-.001-3.721.812-.157.814 1.257 1.769 3.156 2.133z" },
      { fill: "#F4900C", d: "M28.465 26.568c1.899.365 3.565 0 3.721-.812.156-.813-1.258-1.769-3.154-2.132-1.9-.365-3.566-.001-3.721.811-.157.814 1.255 1.77 3.154 2.133z" },
      { fill: "#A0041E", d: "M29.854 27.958c1.899.364 3.564 0 3.721-.812.156-.813-1.256-1.77-3.154-2.133-1.898-.364-3.564 0-3.721.812-.157.814 1.255 1.77 3.154 2.133z" },
      { fill: "#DD2E44", d: "M31.268 29.372c1.898.365 3.566 0 3.721-.812.156-.814-1.256-1.77-3.154-2.133-1.899-.364-3.564 0-3.721.812-.157.814 1.257 1.77 3.154 2.133z" },
      { fill: "#CCD6DD", d: "M30.385 29c.382.382.382 1.002 0 1.385-.383.382-1.003.382-1.385 0L4.136 5.52c-.382-.382-.382-1.002 0-1.384.382-.382 1.001-.382 1.384 0L30.385 29z" },
    ],
  },
  "twemoji-1f411": {
    source: "Twemoji 1f411.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#FFAC33", d: "M11.983 3.562c4.543-.262 7.824 1.597 8.089 6.826.215 4.19-5.184 6.79-8.046 6.879-2.462.077-1.353-1.852.61-2.334 1.576-.387 4.124-2.413 3.602-4.44-.597-2.32-4.315-2.684-6.351.292-.798 1.167-3.554.873-4.096-.434-.958-2.309 1.211-6.502 6.192-6.789z" },
      { fill: "#E1E8ED", d: "M35.75 21.384c0-7.783-4.495-11.407-14.519-11.407-1.087 0-2.083.051-3.018.137-1.36-2.423-4.845-2.828-8.213-2.828-4.304 0-10 6.145-10 10.839 0 4.608 3.606 4.866 7.811 4.874.233 3.245 1.226 5.647 3.249 7.26C11.337 31.409 12.594 36 15 36c1.353 0 2.099-1.695 2.51-3.417 1.128.136 2.359.209 3.722.209 1.733 0 3.288-.116 4.695-.335C26.017 34.114 26.458 36 28 36c2.317 0 4.273-4.956 4.834-6.521 1.969-1.87 2.916-4.545 2.916-8.095z" },
      { fill: "#292F33", circle: [4.5, 15.786, 1.5] },
      { fill: "#FFCC4D", d: "M17.562 4.339c4.312 1.455 5.74 4.148 4.034 9.099-1.367 3.967-7.345 4.361-10.034 3.375C9.25 15.964 11 14.589 13 14.875c1.606.23 4.727-.698 5-2.773C18.312 9.727 15 8 12 10c-1.177.785-5.774.43-5.5-.958.638-3.226 6.335-6.298 11.062-4.703z" },
    ],
  },
  "twemoji-1fab6": {
    source: "Twemoji 1fab6.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#C1694F", d: "M4.048 29.644c-.811-.558-1.541-4.073-.936-4.404.738-.402.686.835 2.255 2.362 1.569 1.528 6.47.913 7.708 1.326 1.363.455-6.385 2.533-9.027.716z" },
      { fill: "#D99E82", d: "M5.367 27.603C4 22 4.655 18.919 5.433 16.861 6.8 13.24 16.699 5.169 23.8 2.637 25.678 1.967 31.62 1 35 1c.589 2.332-1.174 6.717-1.62 7.518-1.009 1.81-3.564 4.273-8.646 9.482-.252.258-5.119-.46-5.376-.191-.283.296 4.044 1.579 3.755 1.889-.738.79-1.495 1.624-2.268 2.507-.172.196-8.311-.923-8.484-.722-.232.27 7.501 1.862 7.266 2.14-.645.765-1.299 1.564-1.959 2.397-1.725 2.178-12.301 1.583-12.301 1.583z" },
      { fill: "#C1694F", d: "M19.15 12.787c1.588.966 5.331 1.943 8.316 2.422 1.898-1.937 3.299-3.378 4.302-4.529-2.259-.49-5.742-1.3-7.487-2.087l-.816-.403-4.872 4.17.557.427z" },
      { fill: "#662113", d: "M35.088 1.514c-.02-.179-.047-.352-.088-.514-.378 0-.792.014-1.225.036-3.438.178-8.307 1.006-9.975 1.601-.345.123-.702.27-1.059.418-.478.198-.964.416-1.459.654.356 1.481 1.126 3.144 1.807 4.013-1.703 1.323-3.317 2.704-4.836 4.115-5.655 5.248-10.021 10.872-13.005 15.242.04.174.076.344.12.524 0 0 .219.012.589.026 1.482-2.288 5.703-8.239 13.194-14.841 1.565-1.379 3.276-2.786 5.13-4.195 1.745.787 5.228 1.597 7.487 2.087.322-.369.606-.712.849-1.028.316-.412.569-.785.763-1.134.415-.746 1.969-4.594 1.708-7.004z" },
      { fill: "#C1694F", d: "M35 1c-.369 0-.751-.003-1.138-.008-3.915 1.874-7.509 4.194-10.772 6.73-.68-.87-1.451-2.532-1.807-4.013-1.467.708-2.987 1.575-4.484 2.539.309 1.911.852 4.377 1.455 5.589C6.827 22.441.638 34.605.553 34.776c-.124.247-.023.547.224.671.071.036.147.053.223.053.184 0 .36-.102.448-.276.119-.238 12.144-23.883 33.659-33.72-.032-.174-.066-.343-.107-.504z" },
    ],
  },
  "twemoji-1f5e1": {
    source: "Twemoji 1f5e1.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#9AAAB4", d: "M23.378 19.029C22.67 19.736 16.305 31.757.75 36c1.414-1.415 19.54-21.691 19.54-21.691l3.088 4.72z" },
      { fill: "#CCD6DD", d: "M17.72 13.371C17.013 14.078 4.992 20.444.75 36l21.213-21.214-4.243-1.415z" },
      { fill: "#D99E82", d: "M20.549 11.957c-.781.781-.655 2.174.283 3.112l.848.849c.938.937 2.33 1.063 3.112.282l7.778-7.778c.781-.781.654-2.174-.283-3.111l-.848-.848c-.938-.938-2.331-1.064-3.111-.283l-7.779 7.777z" },
      { fill: "#BF6952", d: "M28.892 12.1l-7.071-1.414-1.271 1.271c-.133.133-.23.288-.311.452l6.954 1.391 1.699-1.7zm-7.212 3.818c.938.938 2.331 1.063 3.112.282l.826-.826-5.328-1.065c.131.27.312.529.543.76l.847.849zm8.911-5.518l1.7-1.699-7.071-1.414-1.7 1.699zm2.423-3.793c-.107-.46-.346-.916-.727-1.297l-.848-.848c-.103-.103-.213-.192-.325-.275l-2.11-.422c-.252.084-.483.22-.676.414l-1.242 1.242 5.928 1.186z" },
      { fill: "#8A4633", circle: [31.858, 4.896, 4] },
      { fill: "#FFAC33", d: "M16.306 9.836c.586-.586 1.536-.586 2.121 0l8.839 8.839c.586.586.586 1.536 0 2.121-.586.586-1.535.586-2.121 0l-8.839-8.839c-.586-.584-.586-1.535 0-2.121z" },
      { fill: "#FFAC33", circle: [27.266, 20.796, 2.5] },
      { fill: "#FFAC33", circle: [16.306, 9.836, 2.5] },
      { fill: "#FFCC4D", circle: [27.266, 20.796, 1.5] },
      { fill: "#FFCC4D", circle: [16.306, 9.836, 1.5] },
      { fill: "#FFAC33", d: "M26.566 3.803c.417-.417 1.093-.417 1.509 0l4.865 4.866c.417.417.417 1.092 0 1.509-.417.417-1.092.417-1.509 0l-4.865-4.866c-.417-.416-.417-1.092 0-1.509z" },
    ],
  },
  "twemoji-1f4da": {
    source: "Twemoji 1f4da.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#553788", d: "M15 31c0 2.209-.791 4-3 4H5c-4 0-4-14 0-14h7c2.209 0 3 1.791 3 4v6z" },
      { fill: "#9266CC", d: "M34 33h-1V23h1c.553 0 1-.447 1-1s-.447-1-1-1H10c-4 0-4 14 0 14h24c.553 0 1-.447 1-1s-.447-1-1-1z" },
      { fill: "#CCD6DD", d: "M34.172 33H11c-2 0-2-10 0-10h23.172c1.104 0 1.104 10 0 10z" },
      { fill: "#99AAB5", d: "M11.5 25h23.35c-.135-1.175-.36-2-.678-2H11c-1.651 0-1.938 6.808-.863 9.188C9.745 29.229 10.199 25 11.5 25z" },
      { fill: "#269", d: "M12 8c0 2.209-1.791 4-4 4H4C0 12 0 1 4 1h4c2.209 0 4 1.791 4 4v3z" },
      { fill: "#55ACEE", d: "M31 10h-1V3h1c.553 0 1-.447 1-1s-.447-1-1-1H7C3 1 3 12 7 12h24c.553 0 1-.447 1-1s-.447-1-1-1z" },
      { fill: "#CCD6DD", d: "M31.172 10H8c-2 0-2-7 0-7h23.172c1.104 0 1.104 7 0 7z" },
      { fill: "#99AAB5", d: "M8 5h23.925c-.114-1.125-.364-2-.753-2H8C6.807 3 6.331 5.489 6.562 7.5 6.718 6.142 7.193 5 8 5z" },
      { fill: "#F4900C", d: "M20 17c0 2.209-1.791 4-4 4H6c-4 0-4-9 0-9h10c2.209 0 4 1.791 4 4v1z" },
      { fill: "#FFAC33", d: "M35 19h-1v-5h1c.553 0 1-.447 1-1s-.447-1-1-1H15c-4 0-4 9 0 9h20c.553 0 1-.447 1-1s-.447-1-1-1z" },
      { fill: "#CCD6DD", d: "M35.172 19H16c-2 0-2-5 0-5h19.172c1.104 0 1.104 5 0 5z" },
      { fill: "#99AAB5", d: "M16 16h19.984c-.065-1.062-.334-2-.812-2H16c-1.274 0-1.733 2.027-1.383 3.5.198-.839.657-1.5 1.383-1.5z" },
    ],
  },
  "twemoji-1f9d2": {
    source: "Twemoji 1f9d2.svg (jdecked/twemoji 15.1.0)",
    license: "CC-BY 4.0",
    viewBox: 36,
    elements: [
      { fill: "#FFAC33", d: "M17.119 5.604c-7.604 0-11.421 4.937-12.313 8.588-.653 2.673.337 5.794.639 9.208.267 3.03 2.033 5.574 3.843 6.089 2.603 3.284 5.37 3.143 10.017 3.143 9.073 0 12.472-6.782 12.472-14.579-.001-5.96-4.203-12.449-14.658-12.449z" },
      { fill: "#FFDC5D", d: "M28.259 18.69c-.878-1.216-2.002-2.194-4.466-2.541.924.423 1.809 1.886 1.925 2.695.116.809.231 1.463-.5.655-2.931-3.239-6.122-1.964-9.284-3.942-2.209-1.382-2.882-2.911-2.882-2.911s-.269 2.04-3.619 4.12c-.971.603-2.129 1.945-2.772 3.927-.463 1.424-.411 2.307-.297 3.31C7.546 30.393 11.887 34 18 34c6.107 0 10.442-2.887 11.628-9.573.022-.288.045-.576.045-.869 0-2.501-.413-3.482-1.414-4.868z" },
      { fill: "#C1694F", d: "M22.707 26.293c-.387-.387-.93-.192-1.404-.01-.474.183-1.553.717-3.303.717s-2.829-.534-3.303-.717c-.474-.183-1.017-.377-1.404.01-.391.391-.391 1.023 0 1.414C13.425 27.84 15.229 29 18 29s4.575-1.16 4.707-1.293c.391-.391.391-1.023 0-1.414zM19 25h-2c-.552 0-1-.447-1-1s.448-1 1-1h2c.553 0 1 .447 1 1s-.447 1-1 1z" },
      { fill: "#662113", d: "M14 23c-.552 0-1-.447-1-1v-1c0-.552.448-1 1-1s1 .448 1 1v1c0 .553-.448 1-1 1zm8 0c-.553 0-1-.447-1-1v-1c0-.552.447-1 1-1s1 .448 1 1v1c0 .553-.447 1-1 1z" },
    ],
  },
};

// ── Cores ────────────────────────────────────────────────────────────────────
/** Níveis dos sazonais: x.json = bronze, _t2 = prata, _t3 = ouro. */
const SEASONAL_TIERS = [
  { tier: 1, suffix: "",    metal: [0.804, 0.498, 0.196, 1], spark: [1, 0.75, 0.35, 1] },
  { tier: 2, suffix: "_t2", metal: [0.75, 0.75, 0.78, 1],    spark: [0.85, 0.87, 0.95, 1] },
  { tier: 3, suffix: "_t3", metal: [1, 0.843, 0, 1],         spark: [1, 0.92, 0.4, 1] },
];

/** Cores litúrgicas usadas no disco e no halo dos litúrgicos. */
const LITURGICAL_COLORS = {
  branco:   { disc: [1, 0.98, 0.92, 1], glow: [1, 0.88, 0.45, 1] },
  vermelho: { disc: [0.99, 0.88, 0.86, 1], glow: [0.86, 0.16, 0.2, 1] },
};
const HALO_GOLD = [1, 0.843, 0, 1];

// Medidas (px). O ícone é reduzido para caber dentro da face, sem tocar o anel.
const SEASONAL = { face: 63, ring: 3, rim: 70, maxIcon: 100 };
const LITURGICAL = { face: 62, ring: 5, maxIcon: 88 };
const ICON_MARGIN = 3;
const iconRoom = (m) => m.face - m.ring / 2 - ICON_MARGIN;
const RAY_GOLD = [1, 0.9, 0.5, 1];
const LT_SPARK = [1, 0.95, 0.6, 1];

// ── Tabela do lote 1 ─────────────────────────────────────────────────────────
/**
 * kind: "seasonal" (3 níveis) | "liturgical" (1 nível).
 * icon: chave em ICONS. symbol: o que o elemento representa.
 */
const TROPHIES = [
  // Sazonais
  { id: "seasonal_decimo_terceiro", kind: "seasonal", icon: "twemoji-1f4b5", symbol: "cédula de dinheiro (13º salário)" },
  { id: "seasonal_ferias_verao",    kind: "seasonal", icon: "twemoji-2600",  symbol: "sol de verão" },
  { id: "seasonal_balanco_anual",   kind: "seasonal", icon: "twemoji-1f4ca", symbol: "gráfico de barras (balanço)" },
  // Litúrgicos de janeiro
  { id: "lt_maria_mae_deus",  kind: "liturgical", icon: "twemoji-1f451", color: "branco",   symbol: "coroa de Maria, Rainha e Mãe de Deus" },
  { id: "lt_epifania",        kind: "liturgical", icon: "twemoji-2b50",  color: "branco",   symbol: "estrela de Belém que guiou os Magos" },
  { id: "lt_batismo_senhor",  kind: "liturgical", icon: "twemoji-1f54a", color: "branco",   symbol: "pomba do Espírito Santo no Jordão" },
  { id: "lt_antonio_abade",   kind: "liturgical", icon: "twemoji-1f416", color: "branco",   symbol: "porco, atributo de Santo Antão" },
  { id: "lt_sebastiao",       kind: "liturgical", icon: "twemoji-1f3f9", color: "vermelho", symbol: "arco e flechas do martírio" },
  { id: "lt_ines",            kind: "liturgical", icon: "twemoji-1f411", color: "vermelho", symbol: "cordeiro (Agnes ↔ agnus)" },
  { id: "lt_francisco_sales", kind: "liturgical", icon: "twemoji-1fab6", color: "branco",   symbol: "pena de escrever, patrono dos escritores" },
  { id: "lt_conv_paulo",      kind: "liturgical", icon: "twemoji-1f5e1", color: "branco",   symbol: "espada de São Paulo" },
  { id: "lt_tomas_aquino",    kind: "liturgical", icon: "twemoji-1f4da", color: "branco",   symbol: "livros da Suma Teológica" },
  { id: "lt_joao_bosco",      kind: "liturgical", icon: "twemoji-1f9d2", color: "branco",   symbol: "criança, patrono dos jovens" },
];

// ── Montagem ─────────────────────────────────────────────────────────────────
function buildSeasonal(entry, tier) {
  const icon = ICONS[entry.icon];
  const [cx, cy] = lib.CENTER;
  const m = SEASONAL;
  const main = lib.mainLayer(1, entry.id, [
    ...lib.iconShapes(icon, lib.fitIconSize(icon, iconRoom(m), m.maxIcon)),
    lib.makeRing(cx, cy, m.face, m.ring, lighten(tier.metal, 0.35), "MedalInnerRing"),
    lib.makeEllipse(cx, cy, m.face, m.face, lighten(tier.metal, 0.8), "MedalFace"),
    lib.makeEllipse(cx, cy, m.rim, m.rim, tier.metal, "MedalRim"),
  ]);
  const layers = [main, ...lib.sparkleLayers(2, tier.spark), lib.glowLayer(7, tier.metal)];
  return lib.assemble(`${entry.id}_t${tier.tier}`, layers);
}

function buildLiturgical(entry) {
  const icon = ICONS[entry.icon];
  const col = LITURGICAL_COLORS[entry.color];
  const [cx, cy] = lib.CENTER;
  const m = LITURGICAL;
  const main = lib.mainLayer(1, entry.id, [
    ...lib.iconShapes(icon, lib.fitIconSize(icon, iconRoom(m), m.maxIcon)),
    lib.makeRing(cx, cy, m.face, m.ring, HALO_GOLD, "Aureola"),
    lib.makeEllipse(cx, cy, m.face, m.face, col.disc, "Disc"),
  ]);
  const layers = [main, ...lib.sparkleLayers(2, LT_SPARK), lib.raysLayer(7, RAY_GOLD), lib.glowLayer(8, col.glow)];
  return lib.assemble(entry.id, layers);
}

/** Arquivos de um troféu: [{ suffix, lottie }]. */
function buildTrophy(entry) {
  const id = entry && entry.id;
  if (!ICONS[entry.icon]) throw new Error(`${id}: ícone desconhecido: ${entry.icon}`);
  if (entry.kind === "liturgical" && !LITURGICAL_COLORS[entry.color]) {
    throw new Error(`${id}: cor litúrgica ausente ou desconhecida: ${JSON.stringify(entry.color)} (use ${Object.keys(LITURGICAL_COLORS).join(" | ")})`);
  }
  try {
    if (entry.kind === "seasonal") {
      return SEASONAL_TIERS.map((t) => ({ suffix: t.suffix, lottie: buildSeasonal(entry, t) }));
    }
    if (entry.kind === "liturgical") return [{ suffix: "", lottie: buildLiturgical(entry) }];
  } catch (err) {
    throw new Error(`${id}: ${err.message}`);
  }
  throw new Error(`${id}: kind desconhecido: ${entry.kind}`);
}

function checkUniqueIcons(entries) {
  const seen = new Map();
  for (const e of entries) {
    if (seen.has(e.icon)) throw new Error(`Desenho repetido: ${e.id} e ${seen.get(e.icon)} usam ${e.icon}`);
    seen.set(e.icon, e.id);
  }
}

function main() {
  checkUniqueIcons(TROPHIES);
  const approved = lib.readApprovedIds();
  const blocked = TROPHIES.filter((e) => approved.has(e.id));
  if (blocked.length) {
    console.error(`Recusado: já aprovados em APPROVED_LOTTIE: ${blocked.map((e) => e.id).join(", ")}. Nada foi escrito.`);
    process.exit(1);
  }
  // Monta tudo antes de escrever: um erro não deixa lote pela metade.
  const outputs = TROPHIES.flatMap((entry) =>
    buildTrophy(entry).map(({ suffix, lottie }) => ({ id: entry.id, suffix, lottie })));
  for (const { id, suffix, lottie } of outputs) {
    console.log(`✓ ${lib.writeTrophy(id, suffix, lottie, { approved })}`);
  }
  console.log(`Done: ${outputs.length} arquivos.`);
}

module.exports = { ICONS, TROPHIES, SEASONAL_TIERS, SEASONAL, LITURGICAL, ICON_MARGIN, buildTrophy, checkUniqueIcons };

if (require.main === module) main();
