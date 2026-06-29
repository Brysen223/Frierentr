const IMAGE_ROOT = "assets/images";

export const ASSETS = Object.freeze({
  backgrounds: Object.freeze({
    overworld: Object.freeze({
      forestBack: `${IMAGE_ROOT}/backgrounds/overworld/forest-back-trees.png`,
      forestMiddle: `${IMAGE_ROOT}/backgrounds/overworld/forest-middle-trees.png`,
      forestFront: `${IMAGE_ROOT}/backgrounds/overworld/forest-front-trees.png`,
      forestLights: `${IMAGE_ROOT}/backgrounds/overworld/forest-lights.png`,
    }),
    dungeons: Object.freeze({
      cryptMoon: `${IMAGE_ROOT}/backgrounds/dungeons/crypt-moon.png`,
      cryptMountains: `${IMAGE_ROOT}/backgrounds/dungeons/crypt-mountains.png`,
      cryptGraveyard: `${IMAGE_ROOT}/backgrounds/dungeons/crypt-graveyard.png`,
      castleHallPanels: `${IMAGE_ROOT}/backgrounds/dungeons/castle-hall-panels.png`,
    }),
  }),
  characters: Object.freeze({
    frieren: Object.freeze({
      packed: `${IMAGE_ROOT}/characters/frieren-sprite-sheet-packed.png`,
    }),
    fern: Object.freeze({
      idle: `${IMAGE_ROOT}/characters/fern_idle.png`,
      run: `${IMAGE_ROOT}/characters/fern_run.png`,
      jump: `${IMAGE_ROOT}/characters/fern_jump.png`,
      cast: `${IMAGE_ROOT}/characters/fern_cast.png`,
    }),
    stark: Object.freeze({
      idle: `${IMAGE_ROOT}/characters/stark_idle.png`,
      run: `${IMAGE_ROOT}/characters/stark_run.png`,
      jump: `${IMAGE_ROOT}/characters/stark_jump.png`,
      attack: `${IMAGE_ROOT}/characters/stark_attack.png`,
    }),
    himmel: Object.freeze({
      idle: `${IMAGE_ROOT}/characters/himmel_idle.png`,
      run: `${IMAGE_ROOT}/characters/himmel_run.png`,
      attack: `${IMAGE_ROOT}/characters/himmel_attack.png`,
    }),
  }),
  enemies: Object.freeze({
    ghostFrame: (frame) => `${IMAGE_ROOT}/enemies/ghost/ghost-${frame}.png`,
    skeletonFrame: (frame) => `${IMAGE_ROOT}/enemies/skeleton/skeleton-${frame}.png`,
    clothedSkeletonFrame: (frame) =>
      `${IMAGE_ROOT}/enemies/skeleton-clothed/skeleton-clothed-${frame}.png`,
  }),
});
