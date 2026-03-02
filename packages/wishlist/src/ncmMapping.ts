const NCM_CATEGORY_MAP: Record<string, string> = {
  // Eletrônicos
  "8471": "Computadores e Periféricos",
  "8473": "Acessórios de Informática",
  "8517": "Celulares e Telefones",
  "8518": "Áudio e Headphones",
  "8519": "Reprodutores de Áudio/Vídeo",
  "8521": "Câmeras e Filmadoras",
  "8523": "Mídia de Armazenamento",
  "8525": "Câmeras Digitais",
  "8528": "Monitores e TVs",
  "8543": "Eletrônicos em Geral",
  "8501": "Motores Elétricos",
  "8504": "Transformadores e Carregadores",

  // Eletrodomésticos
  "8415": "Ar Condicionado",
  "8418": "Geladeiras e Freezers",
  "8421": "Purificadores e Filtros",
  "8422": "Máquinas de Lavar Louça",
  "8450": "Máquinas de Lavar Roupa",
  "8451": "Secadoras",
  "8516": "Eletrodomésticos de Cozinha",
  "8509": "Aspiradores e Limpeza",

  // Vestuário
  "6101": "Roupas Masculinas",
  "6102": "Roupas Femininas",
  "6103": "Ternos e Paletós",
  "6109": "Camisetas e Regatas",
  "6110": "Suéteres e Malhas",
  "6203": "Roupas Masculinas Formais",
  "6204": "Roupas Femininas Formais",
  "6401": "Calçados Impermeáveis",
  "6402": "Calçados Esportivos",
  "6403": "Calçados de Couro",
  "6404": "Calçados Têxteis",
  "6406": "Partes de Calçados",

  // Alimentação
  "0901": "Café",
  "1806": "Chocolate e Cacau",
  "1901": "Cereais e Farinhas Preparadas",
  "2009": "Sucos",
  "2201": "Água Mineral",
  "2202": "Refrigerantes",
  "2203": "Cervejas",
  "0201": "Carnes Bovinas",
  "0207": "Frangos",
  "0301": "Peixes",
  "0401": "Leite",

  // Saúde e Beleza
  "3301": "Óleos Essenciais e Perfumes",
  "3302": "Misturas de Substâncias Odoríferas",
  "3303": "Perfumes e Águas de Colônia",
  "3304": "Cosméticos e Maquiagem",
  "3305": "Produtos para Cabelo",
  "3306": "Higiene Bucal",
  "3307": "Desodorantes e Depilação",
  "3401": "Sabões e Detergentes",
  "3004": "Medicamentos",
  "9018": "Equipamentos Médicos",

  // Móveis e Casa
  "9401": "Cadeiras e Assentos",
  "9403": "Móveis em Geral",
  "9404": "Colchões e Acessórios de Cama",
  "9405": "Luminárias e Iluminação",
  "6302": "Cama, Mesa e Banho",
  "7321": "Fogões e Aquecedores",
  "3922": "Artigos Sanitários",

  // Esportes e Lazer
  "9506": "Artigos Esportivos",
  "9507": "Pesca e Caça",
  "9504": "Jogos e Brinquedos Eletrônicos",
  "9503": "Brinquedos",
  "8712": "Bicicletas",

  // Livros e Educação
  "4901": "Livros",
  "4902": "Jornais e Revistas",
  "4903": "Livros Infantis",
  "8469": "Máquinas de Escrever e Impressoras",

  // Veículos
  "8703": "Automóveis de Passeio",
  "8711": "Motocicletas",
  "8714": "Acessórios para Bicicletas",
  "8708": "Peças e Acessórios para Veículos",

  // Ferramentas
  "8201": "Ferramentas Manuais Agrícolas",
  "8202": "Serras",
  "8205": "Ferramentas Manuais",
  "8467": "Ferramentas Pneumáticas e Motorizadas",
};

const EAN_KEYWORD_MAP: Record<string, string> = {
  phone: "Celulares",
  iphone: "Celulares",
  samsung: "Eletrônicos",
  notebook: "Computadores",
  laptop: "Computadores",
  tablet: "Tablets",
  fone: "Áudio",
  headphone: "Áudio",
  airpod: "Áudio",
  tv: "Televisores",
  televisao: "Televisores",
  geladeira: "Eletrodomésticos",
  fogão: "Eletrodomésticos",
  roupa: "Vestuário",
  tênis: "Calçados",
  sapato: "Calçados",
  livro: "Livros",
  book: "Livros",
  suplemento: "Saúde",
  vitamina: "Saúde",
  perfume: "Beleza",
  shampoo: "Higiene",
  sofa: "Móveis",
  sofá: "Móveis",
  mesa: "Móveis",
  cadeira: "Móveis",
  bike: "Esportes",
  bicicleta: "Esportes",
};

export function categoryFromNcm(ncm: string): string | undefined {
  const prefix4 = ncm.replace(/\D/g, "").substring(0, 4);
  const prefix2 = ncm.replace(/\D/g, "").substring(0, 2);
  return NCM_CATEGORY_MAP[prefix4] ?? NCM_CATEGORY_MAP[prefix2];
}

export function categoryFromEan(_ean: string): string | undefined {
  return undefined;
}

export function categoryFromKeywords(name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [keyword, category] of Object.entries(EAN_KEYWORD_MAP)) {
    if (lower.includes(keyword)) return category;
  }
  return undefined;
}

export function resolveCategory(
  ncm?: string,
  ean?: string,
  name?: string,
): string | undefined {
  if (ncm) {
    const cat = categoryFromNcm(ncm);
    if (cat) return cat;
  }
  if (ean) {
    const cat = categoryFromEan(ean);
    if (cat) return cat;
  }
  if (name) {
    const cat = categoryFromKeywords(name);
    if (cat) return cat;
  }
  return undefined;
}
