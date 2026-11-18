const UPGRADE_OPTIONS_TO_SHOW = 3;

const upgrades = [
  {
    name: 'Spear of Achilles',
    description: 'Reduce the spear throw cooldown by 20%.',
    detail: 'FASTER STRIKES',
    apply(state) {
      state.fireRate = Math.max(0.18, state.fireRate * 0.8);
    },
  },
  {
    name: 'Hoplite Salvo',
    description: 'Throw one additional spear with every volley.',
    detail: 'MULTI-SHOT',
    apply(state) {
      state.multiShot = Math.min(5, state.multiShot + 1);
    },
  },
  {
    name: 'Sandals of Hermes',
    description: 'Increase movement speed by 18%.',
    detail: 'MOBILITY',
    apply(state) {
      state.speed *= 1.18;
    },
  },
  {
    name: 'Forged Bronze',
    description: 'Add one point of damage to every spear hit.',
    detail: 'HEAVY IMPACT',
    apply(state) {
      state.dmg += 1;
    },
  },
  {
    name: "Athena's Aegis",
    description: 'Gain 30 maximum health and restore it all.',
    detail: 'DIVINE VIGOR',
    apply(state) {
      state.maxHp += 30;
      state.hp = state.maxHp;
    },
  },
  {
    name: 'Orbital Aegis',
    description: 'Summon a rotating bronze shield that strikes nearby foes.',
    detail: 'AREA DEFENSE',
    apply(state, orbitalGroup) {
      state.hasOrbital = true;
      orbitalGroup.visible = true;
    },
  },
];

function chooseRandomUpgrades(numberOfOptions) {
  const shuffledUpgrades = [...upgrades];

  // Fisher-Yates gives every upgrade the same chance of selection.
  for (let index = shuffledUpgrades.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));

    [shuffledUpgrades[index], shuffledUpgrades[randomIndex]] =
      [shuffledUpgrades[randomIndex], shuffledUpgrades[index]];
  }

  return shuffledUpgrades.slice(0, numberOfOptions);
}

function createUpgradeCard(upgrade, index, onChoose) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'upgrade-card';
  card.setAttribute(
    'aria-label',
    upgrade.name + ': ' + upgrade.description,
  );

  const number = document.createElement('span');
  number.className = 'upgrade-index';
  number.textContent = '0' + (index + 1);

  const detail = document.createElement('span');
  detail.className = 'upgrade-tag';
  detail.textContent = upgrade.detail;

  const title = document.createElement('strong');
  title.textContent = upgrade.name;

  const description = document.createElement('span');
  description.textContent = upgrade.description;

  card.append(number, detail, title, description);
  card.addEventListener('click', onChoose);

  return card;
}

function finishUpgradeSelection(modal, state) {
  modal.classList.remove('is-visible');
  state.paused = false;
}

function renderUpgradeSelection(state, orbitalGroup, refreshHud) {
  const modal = document.getElementById('upgrade-modal');
  const cards = document.getElementById('cards');

  if (!modal || !cards) return;

  cards.replaceChildren();

  const options = chooseRandomUpgrades(UPGRADE_OPTIONS_TO_SHOW);

  options.forEach((upgrade, index) => {
    const chooseUpgrade = () => {
      upgrade.apply(state, orbitalGroup);
      state.upgradeAuraTimer = 8;
      state.pendingUpgrades = Math.max(0, state.pendingUpgrades - 1);

      refreshHud();

      if (state.pendingUpgrades > 0) {
        renderUpgradeSelection(state, orbitalGroup, refreshHud);
        return;
      }

      finishUpgradeSelection(modal, state);
    };

    const card = createUpgradeCard(upgrade, index, chooseUpgrade);
    cards.appendChild(card);
  });

  modal.classList.add('is-visible');
}

/** Pause the game and show the available blessings. */
export function showUpgrades(state, orbitalGroup, resetTouch, refreshHud) {
  resetTouch();
  state.paused = true;
  renderUpgradeSelection(state, orbitalGroup, refreshHud);
}
