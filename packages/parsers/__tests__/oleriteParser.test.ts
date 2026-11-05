import { describe, it, expect, vi } from "vitest";
import {
  parseOleriteFromOCR,
  parseOleriteFromImage,
} from "../src/oleriteParser";
import type { OCRAdapter } from "../src/types";
import {
  createInitialState,
  domainReducer,
  createOleriteReadingEvent,
  getChronologicalOleriteReadings,
  calculateAverageOleriteConsumption,
  getOleriteEvolutionSeries,
} from "../../domain";
import { EVENT_TYPES } from "../../events";

describe("parseOleriteFromOCR", () => {
  it("extrai valor decimal com vírgula e unidade L ('Medidor 1234,5 L')", () => {
    const fixedDate = new Date("2026-11-05T10:00:00.000Z");
    const result = parseOleriteFromOCR("Medidor 1234,5 L", {
      confidence: 0.92,
      imageUri: "file:///meter1.jpg",
      timestamp: fixedDate,
      location: "Tanque Principal",
    });

    expect(result).not.toBeNull();
    expect(result!.value).toBe(1234.5);
    expect(result!.unit).toBe("L");
    expect(result!.confidence).toBe(0.92);
    expect(result!.imageUri).toBe("file:///meter1.jpg");
    expect(result!.timestamp).toBe(fixedDate);
    expect(result!.location).toBe("Tanque Principal");
  });

  it("extrai padrão prefixado com ponto decimal e unidade ml ('Vol: 45.2 ml')", () => {
    const result = parseOleriteFromOCR("Vol: 45.2 ml");

    expect(result).not.toBeNull();
    expect(result!.value).toBe(45.2);
    expect(result!.unit).toBe("ml");
  });

  it("extrai padrão numérico de medidor com ponto e m3 ('123.456 m3')", () => {
    const result = parseOleriteFromOCR("123.456 m3");

    expect(result).not.toBeNull();
    expect(result!.value).toBe(123.456);
    expect(result!.unit).toBe("m³");
  });

  it("extrai unidade Unicode 'm³' diretamente ('Leitura: 89,4 m³')", () => {
    const result = parseOleriteFromOCR("Leitura: 89,4 m³");

    expect(result).not.toBeNull();
    expect(result!.value).toBe(89.4);
    expect(result!.unit).toBe("m³");
  });

  it("prioriza leitura decimal válida sobre números de série e ignora datas/horas ('14/02/2026 15:30\\nSérie 10\\n00450,8')", () => {
    const result = parseOleriteFromOCR("14/02/2026 15:30\nSérie 10\n00450,8");

    expect(result).not.toBeNull();
    expect(result!.value).toBe(450.8);
    expect(result!.unit).toBe("L");
  });

  it("extrai padrão numérico isolado sem unidade assumindo 'L' como padrão ('123.456')", () => {
    const result = parseOleriteFromOCR("123.456");

    expect(result).not.toBeNull();
    expect(result!.value).toBe(123.456);
    expect(result!.unit).toBe("L");
  });

  it("normaliza separador de milhar e decimal brasileiro ('Leitura: 1.234,56 L')", () => {
    const result = parseOleriteFromOCR("Leitura: 1.234,56 L");

    expect(result).not.toBeNull();
    expect(result!.value).toBe(1234.56);
    expect(result!.unit).toBe("L");
  });

  it("remove zeros à esquerda e preserva casas decimais ('Leitura: 00128,4 m3')", () => {
    const result = parseOleriteFromOCR("Leitura: 00128,4 m3");

    expect(result).not.toBeNull();
    expect(result!.value).toBe(128.4);
    expect(result!.unit).toBe("m³");
  });

  it("retorna null para texto vazio ou sem números válidos", () => {
    expect(parseOleriteFromOCR("")).toBeNull();
    expect(parseOleriteFromOCR("   ")).toBeNull();
    expect(parseOleriteFromOCR("SEM LEITURA NO VISOR")).toBeNull();
  });

  it("retorna null para valores zero, negativos ou fora da faixa permitida", () => {
    expect(parseOleriteFromOCR("0,00")).toBeNull();
    expect(parseOleriteFromOCR("-45 L")).toBeNull();
    expect(parseOleriteFromOCR("Medidor -45 L")).toBeNull();
    expect(parseOleriteFromOCR("Vol: -12,5 ml")).toBeNull();
    expect(parseOleriteFromOCR("1,234,5")).toBeNull();
    expect(parseOleriteFromOCR("9999999,99 L")).toBeNull();
  });
});

describe("parseOleriteFromImage", () => {
  it("invoca OCRAdapter e retorna OleriteReading preenchido com imageUri e confidence", async () => {
    const mockAdapter: OCRAdapter = {
      recognizeText: vi.fn().mockResolvedValue({
        text: "VISOR MEDIDOR\nVol: 540,75 L",
        confidence: 0.88,
      }),
    };

    const reading = await parseOleriteFromImage(
      "file:///captura-medidor.jpg",
      mockAdapter,
      { location: "Gerador" },
    );

    expect(mockAdapter.recognizeText).toHaveBeenCalledWith(
      "file:///captura-medidor.jpg",
    );
    expect(reading).not.toBeNull();
    expect(reading!.value).toBe(540.75);
    expect(reading!.unit).toBe("L");
    expect(reading!.confidence).toBe(0.88);
    expect(reading!.imageUri).toBe("file:///captura-medidor.jpg");
    expect(reading!.location).toBe("Gerador");
  });

  it("retorna null quando o OCR não encontra leitura válida na imagem", async () => {
    const mockAdapter: OCRAdapter = {
      recognizeText: vi.fn().mockResolvedValue({
        text: "IMAGEM ILEGIVEL",
        confidence: 0.2,
      }),
    };

    const reading = await parseOleriteFromImage(
      "file:///ilegivel.jpg",
      mockAdapter,
    );
    expect(reading).toBeNull();
  });
});

describe("Domínio e Event Sourcing de Olerite", () => {
  it("armazena leitura no AppState via OLERITE_READING_ADDED no domainReducer", () => {
    const initialState = createInitialState();
    expect(initialState.oleriteReadings).toEqual({});

    const event = createOleriteReadingEvent(
      {
        id: "read-1",
        value: 100,
        unit: "L",
        confidence: 0.95,
        imageUri: "file:///r1.jpg",
        timestamp: new Date("2026-01-10T10:00:00.000Z"),
        location: "Caldeira",
      },
      "device-test",
    );

    expect(event.type).toBe(EVENT_TYPES.OLERITE_READING_ADDED);

    const nextState = domainReducer(initialState, event);
    expect(nextState.oleriteReadings["read-1"]).toEqual({
      id: "read-1",
      value: 100,
      unit: "L",
      confidence: 0.95,
      imageUri: "file:///r1.jpg",
      timestamp: "2026-01-10T10:00:00.000Z",
      location: "Caldeira",
    });
  });

  it("retorna consumo médio 0 quando há 0 ou 1 leitura registrada", () => {
    const emptyState = createInitialState();
    expect(calculateAverageOleriteConsumption(emptyState.oleriteReadings)).toBe(0);

    const singleEvent = createOleriteReadingEvent({
      id: "r1",
      value: 100,
      unit: "L",
      timestamp: "2026-01-01T10:00:00.000Z",
    });
    const oneReadingState = domainReducer(emptyState, singleEvent);
    expect(
      calculateAverageOleriteConsumption(oneReadingState.oleriteReadings),
    ).toBe(0);
  });

  it("ordena leituras cronologicamente e calcula variações [+50, +60] e média 55 para [100, 150, 210]", () => {
    let state = createInitialState();

    // Inseridos fora de ordem cronológica propositalmente
    const ev2 = createOleriteReadingEvent({
      id: "r2",
      value: 150,
      unit: "L",
      timestamp: "2026-02-01T10:00:00.000Z",
    });
    const ev1 = createOleriteReadingEvent({
      id: "r1",
      value: 100,
      unit: "L",
      timestamp: "2026-01-01T10:00:00.000Z",
    });
    const ev3 = createOleriteReadingEvent({
      id: "r3",
      value: 210,
      unit: "L",
      timestamp: "2026-03-01T10:00:00.000Z",
    });

    state = domainReducer(state, ev2);
    state = domainReducer(state, ev1);
    state = domainReducer(state, ev3);

    const ordered = getChronologicalOleriteReadings(state.oleriteReadings);
    expect(ordered.map((r) => r.value)).toEqual([100, 150, 210]);

    const avg = calculateAverageOleriteConsumption(state.oleriteReadings);
    expect(avg).toBe(55);

    const series = getOleriteEvolutionSeries(state.oleriteReadings);
    expect(series.map((s) => ({ id: s.id, value: s.value, delta: s.delta }))).toEqual([
      { id: "r1", value: 100, delta: null },
      { id: "r2", value: 150, delta: 50 },
      { id: "r3", value: 210, delta: 60 },
    ]);
  });

  it("ignora deltas entre leituras consecutivas com unidades diferentes", () => {
    let state = createInitialState();

    state = domainReducer(
      state,
      createOleriteReadingEvent({
        id: "r1",
        value: 100,
        unit: "L",
        timestamp: "2026-01-01T10:00:00.000Z",
      }),
    );
    state = domainReducer(
      state,
      createOleriteReadingEvent({
        id: "r2",
        value: 140,
        unit: "L",
        timestamp: "2026-02-01T10:00:00.000Z",
      }),
    );
    state = domainReducer(
      state,
      createOleriteReadingEvent({
        id: "r3",
        value: 500,
        unit: "m³",
        timestamp: "2026-03-01T10:00:00.000Z",
      }),
    );

    const series = getOleriteEvolutionSeries(state.oleriteReadings);
    expect(series.map((s) => ({ id: s.id, delta: s.delta }))).toEqual([
      { id: "r1", delta: null },
      { id: "r2", delta: 40 },
      { id: "r3", delta: null },
    ]);

    expect(calculateAverageOleriteConsumption(state.oleriteReadings)).toBe(40);
  });
});
