import React from "react";
import { G, Path, Circle, Rect, Line, Polygon } from "react-native-svg";

interface TrophyDecorationProps {
  id?: string;
  color: string;
}

/**
 * Componentes de decoração específicos para tipos de troféus.
 * Segue o SRP ao separar a definição visual da lógica de animação.
 * Cobre 100% dos troféus litúrgicos mapeados.
 */
const LiturgicalDecorations: React.FC<TrophyDecorationProps> = ({ id, color }) => {
  const normalizedId = id?.toLowerCase() || "";

  // 1. Marianos (Manto e Estrelas)
  if (["maria", "nossa_sra", "fatima", "aparecida", "imaculada", "lourdes", "carmo", "natividade_maria", "dores_maria", "rosario", "nsa_gracas", "visitacao", "anunciacao", "maria_rainha", "santana"].some(k => normalizedId.includes(k))) {
    return (
      <G>
        <Path d="M50 20 C35 20 25 45 25 80 L75 80 C75 45 65 20 50 20" fill={color} opacity={0.15} />
        <Path d="M50 22 C38 22 28 45 28 78 L72 78 C72 45 62 22 50 22" fill={color} opacity={0.25} />
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
          <Circle key={deg} cx={50 + 28 * Math.cos(deg * Math.PI / 180)} cy={50 + 28 * Math.sin(deg * Math.PI / 180)} r="1" fill="#FFF" opacity={0.6} />
        ))}
        <Path d="M42 20 L44 14 L50 17 L56 14 L58 20 H42 Z" fill="#FFD700" />
      </G>
    );
  }

  // 2. Cristológicos / Festas Maiores (Luz Divina e Cálice/Pão)
  if (["pascoa", "ascensao", "pentecostes", "corpus_christi", "sagrado_coracao", "cristo_rei", "transfiguracao", "epifania", "batismo_senhor", "ramos", "quinta_santa", "natal"].some(k => normalizedId.includes(k))) {
    return (
      <G>
        {/* Cálice Eucarístico e Hóstia */}
        <Path d="M40 50 Q50 80 60 50 L55 50 Q50 70 45 50 Z" fill={color} opacity={0.4} />
        <Rect x="48" y="70" width="4" height="15" fill={color} opacity={0.5} />
        <Path d="M40 85 H60 V88 H40 Z" fill={color} opacity={0.6} />
        <Circle cx="50" cy="35" r="12" fill="#FFF" opacity={0.8} />
        <Path d="M50 25 V45 M40 35 H60" stroke={color} strokeWidth="1" opacity={0.3} />
      </G>
    );
  }

  // 3. Paixão / Cruz (Cenário do Calvário)
  if (["cruz", "paixao", "sexta", "quaresma", "cinzas", "exaltacao", "cinzas"].some(k => normalizedId.includes(k))) {
    return (
      <G>
        <Path d="M10 90 Q50 60 90 90 Z" fill={color} opacity={0.1} />
        <Path d="M46 15 H54 V38 H72 V46 H54 V82 H46 V46 H28 V38 H46 Z" fill={color} opacity={0.4} />
        <Circle cx="50" cy="40" r="14" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" fill="none" opacity={0.3} />
      </G>
    );
  }

  // 4. Apóstolos e Evangelistas (Livro e Espada/Chave)
  if (["pedro", "paulo", "andre", "tiago", "evangelista", "bartolomeu", "mateus", "tome", "matias", "simao", "judas", "marcos", "lucas", "barnabe"].some(k => normalizedId.includes(k))) {
    return (
      <G>
        {/* Livro Aberto */}
        <Path d="M25 60 Q35 50 50 55 Q65 50 75 60 V75 Q65 65 50 70 Q35 65 25 75 Z" fill={color} opacity={0.3} />
        <Path d="M50 55 V70" stroke={color} strokeWidth="1" opacity={0.5} />
        {/* Espada/Chave (Símbolo de autoridade apostólica) */}
        <Path d="M70 20 L30 60 L35 65 L75 25 Z" fill={color} opacity={0.2} />
        <Circle cx="75" cy="20" r="5" stroke={color} strokeWidth="2" fill="none" opacity={0.4} />
      </G>
    );
  }

  // 5. Doutores da Igreja (Pena, Tinteiro e Livro)
  if (["tomas_aquino", "agostinho", "ambrosio", "jeronimo", "gregorio", "avila", "teresinha", "sena", "bernardo", "sales", "isidoro_sevilha"].some(k => normalizedId.includes(k))) {
    return (
      <G>
        <Path d="M30 65 H70 V75 H30 Z" fill={color} opacity={0.2} />
        {/* Pena */}
        <Path d="M60 20 C50 30 40 50 40 60 C35 55 40 40 50 25 Z" fill={color} opacity={0.5} />
        <Path d="M60 20 L40 60" stroke="#FFF" strokeWidth="0.5" opacity={0.8} />
      </G>
    );
  }

  // 6. Fundadores e Monásticos (Cruz Tau e Elementos da Natureza/Cajado)
  if (["bento", "assis", "francisco", "abade", "inacio", "domingos", "charbel", "clara", "bosco", "lasalle", "antonio", "gonzaga", "xavier", "cruz"].some(k => normalizedId.includes(k))) {
    return (
      <G>
        {/* Hábito / Cruz Tau */}
        <Path d="M35 30 H65 V40 H55 V80 H45 V40 H35 Z" fill={color} opacity={0.3} />
        {/* Cordão franciscano / monástico com 3 nós */}
        <Path d="M60 45 Q70 60 65 80" stroke={color} strokeWidth="1.5" fill="none" opacity={0.5} />
        <Circle cx="67" cy="55" r="1.5" fill={color} />
        <Circle cx="68" cy="65" r="1.5" fill={color} />
        <Circle cx="65" cy="75" r="1.5" fill={color} />
      </G>
    );
  }

  // 7. Mártires e Soldados (Palma do Martírio e Escudo/Coroa)
  if (["sebastiao", "ines", "agueda", "luzia", "estevao", "lourenco", "jorge", "fisher", "moro", "perpetua", "felicidade", "kolbe", "martirio", "inocentes", "cosme", "damiao"].some(k => normalizedId.includes(k))) {
    return (
      <G>
        {/* Ramo de Palma (Vitória do Martírio) */}
        <Path d="M30 80 Q50 50 70 20 Q60 40 45 80" fill={color} opacity={0.4} />
        {[1,2,3,4,5,6].map(i => (
          <Path key={i} d={`M${30 + i*6} ${80 - i*10} L${25 + i*6} ${70 - i*10}`} stroke={color} strokeWidth="1.5" opacity={0.4} />
        ))}
        {/* Coroa do Martírio */}
        <Circle cx="50" cy="50" r="35" stroke={color} strokeWidth="1" strokeDasharray="3 5" fill="none" opacity={0.6} />
      </G>
    );
  }

  // 8. Modernos e Contemporâneos (Carlo Acutis, Pio, JPII)
  if (["carlo", "acutis", "paulo_ii", "pio"].some(k => normalizedId.includes(k))) {
    return (
      <G>
        <Circle cx="50" cy="50" r="40" stroke={color} strokeWidth="1" strokeDasharray="2 6" opacity={0.6} />
        <Rect x="20" y="20" width="4" height="4" fill={color} opacity={0.4} />
        <Rect x="75" y="70" width="4" height="4" fill={color} opacity={0.4} />
        <Rect x="70" y="25" width="3" height="3" fill={color} opacity={0.3} />
        <Path d="M40 30 H60 V70 H40 Z" fill={color} opacity={0.1} />
        {/* Rosário digital/moderno estilizado */}
        <Circle cx="50" cy="75" r="10" stroke={color} strokeWidth="1" fill="none" opacity={0.5} />
        <Path d="M50 85 V95 M45 90 H55" stroke={color} strokeWidth="1" opacity={0.5} />
      </G>
    );
  }

  // 9. Anjos e Arcanjos (Asas de Luz)
  if (["arcanjos", "anjos", "miguel", "gabriel", "rafael", "guarda"].some(k => normalizedId.includes(k))) {
    return (
      <G>
        {/* Asas estilizadas */}
        <Path d="M50 40 Q20 20 10 50 Q25 60 50 45" fill={color} opacity={0.2} />
        <Path d="M50 40 Q80 20 90 50 Q75 60 50 45" fill={color} opacity={0.2} />
        <Path d="M50 45 Q25 40 15 65 Q30 70 50 55" fill={color} opacity={0.15} />
        <Path d="M50 45 Q75 40 85 65 Q70 70 50 55" fill={color} opacity={0.15} />
        {/* Espada de fogo (São Miguel) central */}
        <Path d="M48 20 H52 V80 L50 85 L48 80 Z" fill={color} opacity={0.3} />
      </G>
    );
  }

  // 10. Serviço, Caridade e Família (Mãos e Pão)
  if (["vicente", "porres", "claver", "hungria", "cassia", "vianney", "borromeu", "bras", "patricio", "jose", "lavrador", "marta", "monica", "nicolau", "isabel"].some(k => normalizedId.includes(k))) {
    return (
      <G>
        {/* Mãos oferecendo pão/doação */}
        <Path d="M30 70 Q40 80 50 75 Q60 80 70 70" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" opacity={0.4} />
        <Circle cx="50" cy="55" r="12" fill={color} opacity={0.3} />
        <Path d="M45 55 H55 M50 50 V60" stroke="#FFF" strokeWidth="1" opacity={0.6} />
      </G>
    );
  }

  // Padrão Litúrgico Geral (Ostensório / Custódia)
  return (
    <G>
      <Circle cx="50" cy="50" r="35" stroke={color} strokeWidth="0.5" strokeDasharray="4 4" opacity={0.4} />
      {/* Fine texture lines */}
      <Path d="M30 30 L70 70 M30 70 L70 30" stroke={color} strokeWidth="0.2" opacity={0.2} />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
        <Line 
          key={deg}
          x1={50 + 38 * Math.cos(deg * Math.PI / 180)}
          y1={50 + 38 * Math.sin(deg * Math.PI / 180)}
          x2={50 + 45 * Math.cos(deg * Math.PI / 180)}
          y2={50 + 45 * Math.sin(deg * Math.PI / 180)}
          stroke={color}
          strokeWidth={deg % 90 === 0 ? "1.5" : "0.5"}
          opacity={0.3}
        />
      ))}
    </G>
  );
};

/**
 * Cobre 100% dos troféus sazonais mapeados.
 */
const SeasonalDecorations: React.FC<TrophyDecorationProps> = ({ id, color }) => {
  const normalizedId = id?.toLowerCase() || "";

  // 1. Renovação e Ano Novo (Fogos de Artifício e Brinde)
  if (["ano_novo", "recomeco", "queima_velhos", "balanco_anual"].some(k => normalizedId.includes(k))) {
    return (
      <G opacity={0.4}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
          <Rect key={angle} x="49" y="15" width="2" height="15" fill={color} transform={`rotate(${angle} 50 50)`} rx="1" />
        ))}
        <Circle cx="50" cy="50" r="8" fill="none" stroke={color} strokeWidth="1" />
      </G>
    );
  }

  // 2. Finanças, Planejamento e Consumo (Gráficos e Cifrão)
  if (["planejamento", "arquiteto", "consumidor", "boleto", "liquidacao", "black_friday", "decimo_terceiro", "independencia", "imposto"].some(k => normalizedId.includes(k))) {
    return (
      <G>
        <Rect x="25" y="60" width="10" height="20" rx="2" fill={color} opacity={0.2} />
        <Rect x="45" y="40" width="10" height="40" rx="2" fill={color} opacity={0.3} />
        <Rect x="65" y="20" width="10" height="60" rx="2" fill={color} opacity={0.4} />
        <Path d="M25 60 L45 40 L65 20" stroke="#FFF" strokeWidth="1.5" fill="none" opacity={0.6} />
      </G>
    );
  }

  // 3. Cultura e História (Bandeira/Bandeirolas e Máscaras)
  if (["carnaval", "tiradentes", "descobrimento", "abolicao", "festa_junina", "halloween", "consciencia_negra"].some(k => normalizedId.includes(k))) {
    return (
      <G>
        {/* Bandeirolas de festa */}
        <Path d="M20 30 L30 50 L40 30 Z" fill={color} opacity={0.2} />
        <Path d="M40 30 L50 50 L60 30 Z" fill={color} opacity={0.3} />
        <Path d="M60 30 L70 50 L80 30 Z" fill={color} opacity={0.4} />
        <Path d="M15 30 Q50 40 85 30" stroke={color} strokeWidth="1" fill="none" opacity={0.5} />
      </G>
    );
  }

  // 4. Família e Amor (Corações em camadas)
  if (["valentine", "mulher", "maes", "namorados", "avos", "pais", "criancas", "familia"].some(k => normalizedId.includes(k))) {
    return (
      <G>
        <Path d="M50 70 L30 50 A 15 15 0 0 1 50 35 A 15 15 0 0 1 70 50 Z" fill={color} opacity={0.2} />
        <Path d="M50 75 L25 50 A 18 18 0 0 1 50 30 A 18 18 0 0 1 75 50 Z" stroke={color} strokeWidth="1" fill="none" opacity={0.4} />
      </G>
    );
  }

  // 5. Educação e Volta às Aulas (Livros empilhados e Lápis)
  if (["estudante", "volta_aulas", "prep_crianca", "livro", "escola"].some(k => normalizedId.includes(k))) {
    return (
      <G>
        {/* Livros empilhados */}
        <Polygon points="25,65 50,75 75,65 50,55" fill={color} opacity={0.2} />
        <Polygon points="25,55 50,65 75,55 50,45" fill={color} opacity={0.3} />
        <Polygon points="25,45 50,55 75,45 50,35" fill={color} opacity={0.4} />
        <Path d="M50 35 L75 45 M25 45 L50 55" stroke="#FFF" strokeWidth="0.5" opacity={0.6} />
      </G>
    );
  }

  // 6. Estações do ano e Férias (Sol, Folha, Floco de Neve)
  if (["outono", "inverno", "primavera", "verao", "ferias"].some(k => normalizedId.includes(k))) {
    return (
      <G>
        <Circle cx="50" cy="50" r="20" fill={color} opacity={0.15} />
        {[0, 60, 120, 180, 240, 300].map(deg => (
          <Path 
            key={deg}
            d="M50 20 L53 30 H47 Z" 
            fill={color} 
            opacity={0.3}
            transform={`rotate(${deg} 50 50)`} 
          />
        ))}
        <Circle cx="50" cy="50" r="10" stroke={color} strokeWidth="2" fill="none" opacity={0.4} />
      </G>
    );
  }

  // 7. Saúde, Segurança e Meio Ambiente (Cruzes de Saúde e Folhas Verdes)
  if (["coracao", "fumo", "meio_ambiente", "rosa", "azul", "transito", "saude"].some(k => normalizedId.includes(k))) {
    return (
      <G>
        {/* Símbolo cruz de saúde com folhas orgânicas */}
        <Rect x="42" y="25" width="16" height="50" rx="3" fill={color} opacity={0.2} />
        <Rect x="25" y="42" width="50" height="16" rx="3" fill={color} opacity={0.2} />
        <Path d="M60 40 Q75 25 85 40 Q75 55 60 40" fill={color} opacity={0.3} />
        <Path d="M40 60 Q25 75 15 60 Q25 45 40 60" fill={color} opacity={0.3} />
      </G>
    );
  }

  // 8. Preparação Religiosa Sazonal (Árvore de Natal e Ramos)
  if (["reis", "prep_pascoa", "quaresma", "prep_natal", "dezembro"].some(k => normalizedId.includes(k))) {
    return (
      <G>
        <Path d="M50 15 L25 65 H75 Z" fill={color} opacity={0.15} />
        <Path d="M50 25 L35 55 H65 Z" fill={color} opacity={0.25} />
        <Circle cx="50" cy="15" r="4" fill="#FFD700" opacity={0.8} />
      </G>
    );
  }

  // 9. Trabalho (Ferramentas)
  if (["trabalho", "operario"].some(k => normalizedId.includes(k))) {
    return (
      <G>
        <Rect x="35" y="40" width="30" height="6" fill={color} transform="rotate(-45 50 50)" opacity={0.4} rx="2" />
        <Rect x="47" y="30" width="6" height="40" fill={color} opacity={0.3} rx="2" />
        <Circle cx="50" cy="50" r="15" stroke={color} strokeWidth="1" fill="none" strokeDasharray="3 3" opacity={0.5} />
      </G>
    );
  }

  // Padrão Sazonal Geral (Geometria Dinâmica de Moedas)
  return (
    <G>
      <Circle cx="50" cy="50" r="30" stroke={color} strokeWidth="1.5" opacity={0.3} fill="none" />
      <Circle cx="50" cy="50" r="25" stroke={color} strokeWidth="1" strokeDasharray="5 5" opacity={0.4} fill="none" />
      {/* Decorative dots/particles */}
      <Circle cx="35" cy="35" r="5" fill={color} opacity={0.2} />
      <Circle cx="65" cy="65" r="8" fill={color} opacity={0.2} />
      <Circle cx="20" cy="50" r="2" fill={color} opacity={0.3} />
      <Circle cx="80" cy="50" r="2" fill={color} opacity={0.3} />
    </G>
  );
};

export const TrophyDecorationFactory: React.FC<TrophyDecorationProps & { isLiturgical: boolean }> = ({ 
  isLiturgical, 
  ...props 
}) => {
  return isLiturgical ? <LiturgicalDecorations {...props} /> : <SeasonalDecorations {...props} />;
};
