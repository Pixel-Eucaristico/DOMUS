import { describe, it, expect } from "vitest";
import { computeTipPlacement, TIP_MARGIN, TIP_MAX_WIDTH, TIP_ARROW } from "../infoTipPlacement";

const SCREEN_W = 400;
const SCREEN_H = 800;
const icon = (x: number, y: number) => ({ x, y, width: 16, height: 16 });

describe("computeTipPlacement", () => {
  it("abre abaixo do ícone quando cabe", () => {
    const p = computeTipPlacement(icon(100, 100), SCREEN_W, SCREEN_H, 140);
    expect(p.above).toBe(false);
    expect(p.top).toBe(100 + 16 + TIP_ARROW);
    expect(p.width).toBe(TIP_MAX_WIDTH);
  });

  it("abre acima quando não cabe abaixo e cabe acima", () => {
    const p = computeTipPlacement(icon(100, 700), SCREEN_W, SCREEN_H, 140);
    expect(p.above).toBe(true);
    expect(p.bottom).toBe(SCREEN_H - 700 + TIP_ARROW);
  });

  it("usa a altura real: balão alto abaixo de ícone no meio vai para o lado maior", () => {
    const p = computeTipPlacement(icon(100, 500), SCREEN_W, SCREEN_H, 400);
    expect(p.above).toBe(true);
    expect(p.maxHeight).toBe(500 - TIP_ARROW - TIP_MARGIN);
  });

  it("nenhum lado cabe: escolhe o maior e limita a altura", () => {
    const p = computeTipPlacement(icon(100, 300), SCREEN_W, SCREEN_H, 900);
    expect(p.above).toBe(false);
    expect(p.maxHeight).toBe(SCREEN_H - 316 - TIP_ARROW - TIP_MARGIN);
  });

  it("não sai pelas bordas e a seta aponta o ícone", () => {
    const leftEdge = computeTipPlacement(icon(0, 100), SCREEN_W, SCREEN_H, 100);
    expect(leftEdge.left).toBe(TIP_MARGIN);
    expect(leftEdge.arrowLeft).toBeGreaterThanOrEqual(12);
    const rightEdge = computeTipPlacement(icon(390, 100), SCREEN_W, SCREEN_H, 100);
    expect(rightEdge.left + rightEdge.width).toBeLessThanOrEqual(SCREEN_W - TIP_MARGIN);
    expect(rightEdge.arrowLeft).toBeLessThanOrEqual(rightEdge.width - 12 - TIP_ARROW * 2);
  });

  it("tela estreita: largura cabe nas margens", () => {
    const p = computeTipPlacement(icon(50, 100), 280, SCREEN_H, 100);
    expect(p.width).toBe(280 - TIP_MARGIN * 2);
    expect(p.left).toBe(TIP_MARGIN);
  });
});
