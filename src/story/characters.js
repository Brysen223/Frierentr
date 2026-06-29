export const CHARACTERS = {
  frieren: {
    name: "Frieren",
    title: "Elven Mage",
    blurb: "A thousand-year-old elf mage. Wields Zoltraak at range and slowly masters Flugmagie flight.",
    apply(p) {
      p.maxHp = 100; p.hp = 100;
      p.maxStamina = 100; p.stamina = 100;
      p.maxMana = 70; p.mana = 70;
      p.spells.zoltraak.known = true;
      p.spells.zoltraak.power = 24;
      p.spells.zoltraak.range = 260;
      p.spells.zoltraak.cost = 14;
      p.spells.zoltraak.speed = 620;
      p.spells.zoltraak.castCooldown = 0.34;
      p.spells.zoltraak.name = "Zoltraak";
    },
  },
  fern: {
    name: "Fern",
    title: "Apprentice Mage",
    blurb: "Frieren's apprentice. Casts a lighter, faster Zoltraak variant and conceals her mana well.",
    apply(p) {
      p.maxHp = 88; p.hp = 88;
      p.maxStamina = 100; p.stamina = 100;
      p.maxMana = 92; p.mana = 92;
      p.spells.zoltraak.known = true;
      p.spells.zoltraak.power = 19;
      p.spells.zoltraak.range = 230;
      p.spells.zoltraak.cost = 10;
      p.spells.zoltraak.speed = 700;
      p.spells.zoltraak.castCooldown = 0.2;
      p.spells.zoltraak.name = "Fernsturm";
    },
  },
  stark: {
    name: "Stark",
    title: "Vanguard Warrior",
    blurb: "Trained by Eisen. No spells, but a heavy axe swing (Cleaving Light) that hits hard and far, and the toughest body in the party.",
    apply(p) {
      p.maxHp = 320; p.hp = 320;
      p.maxStamina = 140; p.stamina = 140;
      p.maxMana = 0; p.mana = 0;
      p.spells.zoltraak.known = false;
      p.spells.sturmklinge.known = true;
      p.spells.sturmklinge.power = 65;
      p.spells.sturmklinge.range = 150;
    },
  },
};

