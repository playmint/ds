# Using this map on another map

To use this map in another map e.g. `maps/croissant` you need to

-   symlink `maps/labyrinth/kinds` to `maps/croissant/labyrinth_kinds`
-   copy `maps/labyrinth/rooms` to `maps/croissant/maps/labyrinth`
-   offset the map by running `./offset.sh ../croissant/maps/labyrinth "[9,-16,7]"`
-   copy `maps/labyrinth/quests` to `maps/croissant/quests/labyrinth`
-   offset the quest by running `./offset.sh ../croissant/quests/labyrinth "[9,-16,7]"`

NOTE: The offset tool doesn't offset the quest task locations!! You need to manually open the quests.yaml and update the location of each task
