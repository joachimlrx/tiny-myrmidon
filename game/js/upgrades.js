export const upgrades = [
  {
    name: 'Spear of Achilles',
    desc: '+25% Attack Speed',
    apply: (state) => { state.fireRate *= 0.75; },
  },
  {
    name: 'Hoplite Salvo',
    desc: '+1 Simultaneous Spear',
    apply: (state) => { state.multiShot += 1; },
  },
  {
    name: 'Sandals of Hermes',
    desc: '+20% Movement Speed',
    apply: (state) => { state.speed *= 1.2; },
  },
  {
    name: 'Forged Bronze',
    desc: '+1 Damage Per Impact',
    apply: (state) => { state.dmg += 1; },
  },
  {
    name: "Athena's Aegis",
    desc: '+30 Max HP & Full Heal',
    apply: (state) => {
      state.maxHp += 30;
      state.hp = state.maxHp;
    },
  },
  {
    name: 'Orbital Shield',
    desc: 'Rotating Aegis barrier crushing nearby foes',
    apply: (state, orbitalGroup) => {
      state.hasOrbital = true;
      orbitalGroup.visible = true;
    },
  },
];

export function showUpgrades(state, orbitalGroup, resetTouch, updateHud) {
  resetTouch();
  state.paused = true;

  const modal = document.getElementById('upgrade-modal');
  const cards = document.getElementById('cards');
  cards.replaceChildren();

  [...upgrades]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .forEach((u) => {
      const div = document.createElement('div');
      div.className = 'card';

      const title = document.createElement('h3');
      title.textContent = u.name;

      const description = document.createElement('p');
      description.textContent = u.desc;

      div.append(title, description);
      div.onclick = () => {
        u.apply(state, orbitalGroup);
        modal.style.display = 'none';
        state.paused = false;
        updateHud(state);
      };
      cards.appendChild(div);
    });

  modal.style.display = 'flex';
}