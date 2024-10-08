import { allMoves } from "#app/data/move.js";
import { CommandPhase } from "#app/phases";
import GameManager from "#test/utils/gameManager";
import { getMovePosition } from "#test/utils/gameManagerUtils";
import { Abilities } from "#enums/abilities";
import { Moves } from "#enums/moves";
import { Species } from "#enums/species";
import Phaser from "phaser";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SPLASH_ONLY } from "#test/utils/testUtils";

describe("Moves - Rollout", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;
  const TIMEOUT = 20 * 1000;

  beforeAll(() => {
    phaserGame = new Phaser.Game({
      type: Phaser.HEADLESS,
    });
  });

  afterEach(() => {
    game.phaseInterceptor.restoreOg();
  });

  beforeEach(() => {
    game = new GameManager(phaserGame);
    game.override.disableCrits();
    game.override.battleType("single");
    game.override.starterSpecies(Species.RATTATA);
    game.override.ability(Abilities.NONE);
    game.override.enemySpecies(Species.BIDOOF);
    game.override.enemyAbility(Abilities.NONE);
    game.override.startingLevel(100);
    game.override.enemyLevel(100);
    game.override.enemyMoveset(SPLASH_ONLY);
  });

  it("should double it's dmg on sequential uses but reset after 5", async () => {
    game.override.moveset([Moves.ROLLOUT]);
    vi.spyOn(allMoves[Moves.ROLLOUT], "accuracy", "get").mockReturnValue(100); //always hit

    const variance = 5;
    const turns = 6;
    const dmgHistory: number[] = [];

    await game.startBattle();

    const playerPkm = game.scene.getParty()[0];
    vi.spyOn(playerPkm, "stats", "get").mockReturnValue([500000, 1, 1, 1, 1, 1]); // HP, ATK, DEF, SPATK, SPDEF, SPD

    const enemyPkm = game.scene.getEnemyParty()[0];
    vi.spyOn(enemyPkm, "stats", "get").mockReturnValue([500000, 1, 1, 1, 1, 1]); // HP, ATK, DEF, SPATK, SPDEF, SPD
    vi.spyOn(enemyPkm, "getHeldItems").mockReturnValue([]); //no berries

    enemyPkm.hp = enemyPkm.getMaxHp();
    let previousHp = enemyPkm.hp;

    for (let i = 0; i < turns; i++) {
      game.doAttack(getMovePosition(game.scene, 0, Moves.ROLLOUT));
      await game.phaseInterceptor.to(CommandPhase);

      dmgHistory.push(previousHp - enemyPkm.hp);
      previousHp = enemyPkm.hp;
    }

    const [turn1Dmg, turn2Dmg, turn3Dmg, turn4Dmg, turn5Dmg, turn6Dmg] = dmgHistory;

    expect(turn2Dmg).toBeGreaterThanOrEqual(turn1Dmg * 2 - variance);
    expect(turn2Dmg).toBeLessThanOrEqual(turn1Dmg * 2 + variance);
    expect(turn3Dmg).toBeGreaterThanOrEqual(turn2Dmg * 2 - variance);
    expect(turn3Dmg).toBeLessThanOrEqual(turn2Dmg * 2 + variance);
    expect(turn4Dmg).toBeGreaterThanOrEqual(turn3Dmg * 2 - variance);
    expect(turn4Dmg).toBeLessThanOrEqual(turn3Dmg * 2 + variance);
    expect(turn5Dmg).toBeGreaterThanOrEqual(turn4Dmg * 2 - variance);
    expect(turn5Dmg).toBeLessThanOrEqual(turn4Dmg * 2 + variance);
    // reset
    expect(turn6Dmg).toBeGreaterThanOrEqual(turn1Dmg - variance);
    expect(turn6Dmg).toBeLessThanOrEqual(turn1Dmg + variance);
  }, TIMEOUT);
});
