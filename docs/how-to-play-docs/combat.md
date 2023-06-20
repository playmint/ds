# Combat

When a Unit attacks a building it begins a combat session. This will continue until one side has 0 life remaining. 

## Combat Stats

### **********Units**********

- Each Unit begins with 50 life, 30 attack and 23 defence.
- The number of atoms they have in equipable items will increase this value
    - Equipable items are non-stackable (i.e. you can only have one per slot)

### Buildings

- The construction costs of a building will dictate its stats. Atoms have the same value as they do on Units
- When a building is deployed it will require a minimum number of each atom. This is so it can’t be destroyed by an aggressive fly.

## Combat Session Flow

- The combat will session will “tick” every few blocks
- Each tick, the combatants on each side will attack a random participant on the other side.
- Damage is worked out with the calculation:

```
Defender's Life -= 1 + (All Attacker's ATK - Defender's DEF)
```

- When a combatant has lost all of their life they are no longer affect the session
    - They do not do any damage
    - They are not chosen as a target to attack

## Leaving Combat

If a participant walk off the combat tile, they are removed from the battle (their life is treated as 0). If they return before the end of combat, their life is restored to its value before they left.

## Rewards and Penalites

### **********Units**********

- In this version of the game, there is no penalty for a Unit losing in combat.
- Each combat session is treated independantly, and any life will be restored for a new session

### Buildings

- If a building is on the losing side of a combat session, the building is destroyed
    - Map enemies are technically buildings!
- The construction costs of the building are shared amongst all winners, based on the percentage damage they contributed
    - For example, if a building cost 100 gold coins to construct and you did 60% of the damage in battle, you will receive 60 gold coins.
