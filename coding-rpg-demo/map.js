// Generated from coding-rpg/src/main/resources/maps/area1.json. Edit that file, then rerun build-data.sh.
window.MAP = {
  "ground": [
    "....................",
    "....................",
    "....................",
    "...............,,,..",
    "...............,,,..",
    "...............,,,..",
    "...............,,,..",
    "....................",
    "===================X",
    "===================X",
    "........,,,,,,,,,...",
    "..~~~~..,,,,,,,,,...",
    "........,,,,,,,,,...",
    "....................",
    "...................."
  ],
  "props": [
    { "image": "tiles/Tree_medium_1.png", "x": 0, "y": 0, "solidRows": 0 },
    { "image": "tiles/Tree_small_1.png", "x": 2, "y": 0, "solidRows": 0 },
    { "image": "tiles/Tree_medium_1.png", "x": 4, "y": 0, "solidRows": 0 },
    { "image": "tiles/Tree_medium_1.png", "x": 6, "y": 0, "solidRows": 0 },
    { "image": "tiles/Tree_small_1.png", "x": 8, "y": 0, "solidRows": 0 },
    { "image": "tiles/Tree_medium_1.png", "x": 10, "y": 0, "solidRows": 0 },
    { "image": "tiles/Tree_medium_1.png", "x": 12, "y": 0, "solidRows": 0 },
    { "image": "tiles/Tree_small_1.png", "x": 14, "y": 0, "solidRows": 0 },
    { "image": "tiles/Tree_medium_1.png", "x": 16, "y": 0, "solidRows": 0 },
    { "image": "tiles/Tree_medium_1.png", "x": 18, "y": 0, "solidRows": 0 },
    { "image": "tiles/Tree_medium_1.png", "x": 18, "y": 2, "solidRows": 0 },
    { "image": "tiles/Tree_small_1.png", "x": 18, "y": 4, "solidRows": 0 },
    { "image": "tiles/Tree_medium_1.png", "x": 18, "y": 6, "solidRows": 0 },
    { "image": "tiles/Tree_medium_1.png", "x": 18, "y": 10, "solidRows": 0 },
    { "image": "tiles/Tree_medium_1.png", "x": 0, "y": 13, "solidRows": 0 },
    { "image": "tiles/Tree_small_1.png", "x": 2, "y": 13, "solidRows": 0 },
    { "image": "tiles/Tree_medium_1.png", "x": 4, "y": 13, "solidRows": 0 },
    { "image": "tiles/Tree_medium_1.png", "x": 6, "y": 13, "solidRows": 0 },
    { "image": "tiles/Tree_small_1.png", "x": 8, "y": 13, "solidRows": 0 },
    { "image": "tiles/Tree_medium_1.png", "x": 10, "y": 13, "solidRows": 0 },
    { "image": "tiles/Tree_medium_1.png", "x": 12, "y": 13, "solidRows": 0 },
    { "image": "tiles/Tree_small_1.png", "x": 14, "y": 13, "solidRows": 0 },
    { "image": "tiles/Tree_medium_1.png", "x": 16, "y": 13, "solidRows": 0 },
    { "image": "tiles/Tree_medium_1.png", "x": 18, "y": 13, "solidRows": 0 },

    { "image": "tiles/House_1 (closed).png", "x": 1, "y": 3, "solidRows": 0 },
    { "image": "tiles/House_big_1 (closed).png", "x": 8, "y": 2, "solidRows": 0 },
    { "image": "tiles/Well_1.png", "x": 6, "y": 5, "solidRows": 1 },

    { "image": "tiles/Bush.png", "x": 0, "y": 7, "solidRows": 0 },
    { "image": "tiles/Bush.png", "x": 15, "y": 7, "solidRows": 0 },
    { "image": "tiles/Rock_1.png", "x": 7, "y": 11, "solidRows": 0 },
    { "image": "tiles/Rock_1.png", "x": 17, "y": 11, "solidRows": 0 },
    { "image": "tiles/Flower_1.png", "x": 0, "y": 2, "solidRows": -1 },
    { "image": "tiles/Flower_2.png", "x": 6, "y": 3, "solidRows": -1 },
    { "image": "tiles/Flower_1.png", "x": 14, "y": 3, "solidRows": -1 },
    { "image": "tiles/Flower_2.png", "x": 0, "y": 10, "solidRows": -1 },
    { "image": "tiles/Flower_1.png", "x": 7, "y": 12, "solidRows": -1 }
  ],
  "npcs": [
    {
      "name": "Healer",
      "sprite": { "sheet": "sprites/NPC 06_idle (16x24).png", "frameWidth": 16, "frameHeight": 24, "frames": 4 },
      "x": 3, "y": 8, "facing": "DOWN", "action": "heal",
      "lines": ["Healer: You look worn out. Rest a moment...", "Your life is fully restored!"]
    },
    {
      "name": "Librarian",
      "sprite": { "sheet": "sprites/NPC 12_idle (16x24).png", "frameWidth": 16, "frameHeight": 24, "frames": 4 },
      "x": 11, "y": 8, "facing": "DOWN", "action": "library",
      "lines": []
    }
  ],
  "boss": { "monster": "branching-ogre", "x": 17, "y": 8 },
  "start": { "x": 6, "y": 9 },
  "town": { "x": 3, "y": 9 },
  "exitLines": ["The road east leads to Area 2: loops and arrays.", "It isn't built yet. Come back soon!"]
}
;
