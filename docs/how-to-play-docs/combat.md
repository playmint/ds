---
sidebar_position: 3
---

# Combat

When a Unit attacks a Building it begins a combat session. This will continue until one side has 0 life remaining. 

## Combat Stats

### **********Units**********

- Each Unit begins with 500 life, 30 attack and 23 defence.
- The number of goo they have in equipable items will increase these values
    - Equipable items are non-stackable (i.e. you can only have one per slot)
    - 1x Green Goo = +10 Life
    - 1x Blue Goo = +1 Defense
    - 1x Red Goo = +1 Attack

### Buildings

- The construction costs of a Building will dictate its stats. The goo structure of the building materials will define its life/defense/attack.
- When a Building is deployed it will require a minimum number of each color goo. This is so it can’t be destroyed by an aggressive fly.

## Combat Session Flow

- The combat will session will “tick” every few blocks
- Each tick, the combatants on each side will attack a random participant on the other side
- Damage is worked out with the calculation:

```
Defender's Life -= 1 + (All Attacker's ATK - Defender's DEF)
```

- When a combatant has lost all of their life they are no longer affect the session
    - They do not do any damage
    - They are not chosen as a target to attack

## Leaving Combat

If a participant moves off the combat tile, they are removed from the battle (their life is treated as 0). If they return before the end of combat, their life is restored to its value before they left.

Note: A transaction needs to be sent to "End" the combat session. We're working on tidying this up and improving the UX, but at the moment a user will need to view the combat session and click the "End Combat" button

## Rewards and Penalties

### **********Units**********

- In this version of the game, there is no penalty for a Unit losing in combat.
- Each combat session is treated independently, and any life will be restored for a new session

### Buildings

- If a building is on the losing side of a combat session, the building is destroyed
    - Map enemies are technically buildings!
- The construction costs of the building are shared amongst all winners, based on the percentage damage they contributed
    - For example, if a building cost 100 gold coins to construct and you did 60% of the damage in battle, you will receive 60 gold coins.
