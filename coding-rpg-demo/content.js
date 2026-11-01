// Generated from coding-rpg/src/main/resources/content/area1.json. Edit that file, then rerun build-data.sh.
window.CONTENT = {
  "monsters": [
    {
      "id": "precedence-slime",
      "name": "Precedence Slime",
      "intro": "A Precedence Slime oozes out! It loves doing sums in the wrong order.",
      "sprite": { "sheet": "sprites/Slime 01_idle (16x16).png", "frameWidth": 16, "frameHeight": 16, "frames": 4 },
      "hp": 2,
      "boss": false,
      "questions": ["arith-precedence", "arith-int-div", "arith-mod", "arith-mixed", "arith-double-div", "arith-left-to-right", "arith-negative-div"]
    },
    {
      "id": "boolean-mushy",
      "name": "Boolean Mushy",
      "intro": "A Boolean Mushy pops up! It only ever says true or false.",
      "sprite": { "sheet": "sprites/Mushy 01_idle (16x16).png", "frameWidth": 16, "frameHeight": 16, "frames": 4 },
      "hp": 2,
      "boss": false,
      "questions": ["bool-and-before-or", "bool-not", "bool-range", "bool-de-morgan", "bool-short-circuit", "bool-int-double"]
    },
    {
      "id": "syntax-skeleton",
      "name": "Syntax Skeleton",
      "intro": "A Syntax Skeleton rattles out! Its code never compiles.",
      "sprite": { "sheet": "sprites/Skeleton 01_idle.png", "frameWidth": 16, "frameHeight": 16, "frames": 4 },
      "hp": 2,
      "boss": false,
      "questions": ["syntax-semicolon", "syntax-type", "syntax-brace", "syntax-int-case", "syntax-true-case", "syntax-redeclare", "syntax-assign-in-if"]
    },
    {
      "id": "branching-ogre",
      "name": "Branching Ogre",
      "intro": "The Branching Ogre blocks the way! \"Every path leads to me,\" it growls.",
      "sprite": { "sheet": "sprites/Ogre_idle.png", "frameWidth": 32, "frameHeight": 32, "frames": 4 },
      "hp": 5,
      "boss": true,
      "questions": ["if-else-value", "if-fizzbuzz", "if-else-if-skipped", "if-dangling-else", "if-grade-order", "if-or-not", "arith-div-then-mul"]
    }
  ],

  "questions": [
    {
      "id": "arith-precedence",
      "topic": "Arithmetic and precedence",
      "prompt": "What is the value of this expression?",
      "code": "2 + 3 * 4",
      "choices": ["14", "20", "24", "9"],
      "answer": 0,
      "explanation": "* happens before +, so it is 2 + 12 = 14."
    },
    {
      "id": "arith-int-div",
      "topic": "Arithmetic and precedence",
      "prompt": "What is stored in x?",
      "code": "int x = 7 / 2;",
      "choices": ["3", "3.5", "4", "3.0"],
      "answer": 0,
      "explanation": "Both 7 and 2 are ints, so this is integer division: the .5 is thrown away, giving 3."
    },
    {
      "id": "arith-mod",
      "topic": "Arithmetic and precedence",
      "prompt": "What is the value of this expression?",
      "code": "17 % 5",
      "choices": ["2", "3", "3.4", "12"],
      "answer": 0,
      "explanation": "% gives the remainder: 17 = 3 * 5 + 2, so the remainder is 2."
    },
    {
      "id": "arith-mixed",
      "topic": "Arithmetic and precedence",
      "prompt": "What is the value of this expression?",
      "code": "(2 + 3) * 4 - 10 / 4",
      "choices": ["18", "17.5", "15", "20"],
      "answer": 0,
      "explanation": "Brackets first: 5 * 4 = 20. Then 10 / 4 is integer division, so 2. 20 - 2 = 18."
    },
    {
      "id": "arith-double-div",
      "topic": "Arithmetic and precedence",
      "prompt": "What is stored in d?",
      "code": "double d = 7 / 2;",
      "choices": ["3.0", "3.5", "3", "It doesn't compile"],
      "answer": 0,
      "explanation": "7 / 2 is worked out first, as int division, giving 3. Only then is it stored in a double, so d is 3.0."
    },
    {
      "id": "arith-left-to-right",
      "topic": "Arithmetic and precedence",
      "prompt": "What is the value of this expression?",
      "code": "10 - 4 - 3",
      "choices": ["3", "9", "11", "-3"],
      "answer": 0,
      "explanation": "Operators with the same precedence go left to right: (10 - 4) - 3 = 3."
    },
    {
      "id": "arith-negative-div",
      "topic": "Arithmetic and precedence",
      "prompt": "What is the value of this expression?",
      "code": "-7 / 2",
      "choices": ["-3", "-4", "-3.5", "3"],
      "answer": 0,
      "explanation": "Integer division in Java drops the fraction (rounds towards zero), so -3.5 becomes -3, not -4."
    },
    {
      "id": "arith-div-then-mul",
      "topic": "Arithmetic and precedence",
      "prompt": "What is stored in s?",
      "code": "int s = 10 / 4 * 4;",
      "choices": ["8", "10", "0", "40"],
      "answer": 0,
      "explanation": "/ and * have the same precedence, so left to right: 10 / 4 = 2 (integer division), then 2 * 4 = 8."
    },

    {
      "id": "bool-and-before-or",
      "topic": "Boolean logic",
      "prompt": "What is the value of this expression?",
      "code": "true || false && false",
      "choices": ["true", "false", "It doesn't compile"],
      "answer": 0,
      "explanation": "&& binds tighter than ||, so it is true || (false && false) = true || false = true."
    },
    {
      "id": "bool-not",
      "topic": "Boolean logic",
      "prompt": "What is the value of this expression?",
      "code": "!(5 > 3) || 2 == 2",
      "choices": ["true", "false", "It doesn't compile"],
      "answer": 0,
      "explanation": "5 > 3 is true, so !(5 > 3) is false. 2 == 2 is true. false || true = true."
    },
    {
      "id": "bool-range",
      "topic": "Boolean logic",
      "prompt": "x is 4. What is the value of this expression?",
      "code": "x > 2 && x < 4",
      "choices": ["false", "true", "It doesn't compile"],
      "answer": 0,
      "explanation": "4 > 2 is true, but 4 < 4 is false (4 is not less than itself). true && false = false."
    },
    {
      "id": "bool-de-morgan",
      "topic": "Boolean logic",
      "prompt": "Which expression always gives the same result as this one?",
      "code": "!(a && b)",
      "choices": ["!a || !b", "!a && !b", "a || b", "!a && b"],
      "answer": 0,
      "explanation": "\"Not both\" means at least one is false: !a || !b. This is one of De Morgan's laws."
    },
    {
      "id": "bool-short-circuit",
      "topic": "Boolean logic",
      "prompt": "x is 0. What happens when this runs?",
      "code": "boolean big = x != 0 && 10 / x > 1;",
      "choices": ["big is false", "big is true", "It crashes: division by zero", "It doesn't compile"],
      "answer": 0,
      "explanation": "x != 0 is false, and && stops as soon as the left side is false, so 10 / x never runs. big is false."
    },
    {
      "id": "bool-int-double",
      "topic": "Boolean logic",
      "prompt": "What is the value of this expression?",
      "code": "5 == 5.0",
      "choices": ["true", "false", "It doesn't compile"],
      "answer": 0,
      "explanation": "The int 5 is widened to the double 5.0 before comparing, so they are equal."
    },

    {
      "id": "syntax-semicolon",
      "topic": "Syntax errors",
      "prompt": "This doesn't compile. Which line has the error?",
      "code": "int count = 5\ncount = count + 1;",
      "choices": ["Line 1", "Line 2", "Neither: it compiles"],
      "answer": 0,
      "explanation": "Line 1 is missing a semicolon at the end. (The compiler may report it at the start of line 2.)"
    },
    {
      "id": "syntax-type",
      "topic": "Syntax errors",
      "prompt": "Why doesn't this compile?",
      "code": "int total = \"10\";",
      "choices": ["A String can't be stored in an int", "It is missing a semicolon", "total is a reserved word", "It does compile"],
      "answer": 0,
      "explanation": "\"10\" in quotes is a String, not a number. An int variable can only hold int values."
    },
    {
      "id": "syntax-brace",
      "topic": "Syntax errors",
      "prompt": "What is wrong with this code?",
      "code": "if (x > 3) {\n    System.out.println(\"big\");",
      "choices": ["The closing } is missing", "There should be no ( ) around x > 3", "println should be print", "Nothing: it compiles"],
      "answer": 0,
      "explanation": "Every { needs a matching }. The block opened on line 1 is never closed."
    },
    {
      "id": "syntax-int-case",
      "topic": "Syntax errors",
      "prompt": "Why doesn't this compile?",
      "code": "Int score = 10;",
      "choices": ["Java is case-sensitive: the type is int", "score must start with a capital", "10 needs a decimal point", "It does compile"],
      "answer": 0,
      "explanation": "Java is case-sensitive. The type is int (lower case); Int doesn't exist."
    },
    {
      "id": "syntax-true-case",
      "topic": "Syntax errors",
      "prompt": "Why doesn't this compile?",
      "code": "boolean done = True;",
      "choices": ["The value is true, in lower case", "boolean should be Boolean", "done is a reserved word", "It does compile"],
      "answer": 0,
      "explanation": "The boolean values are true and false, in lower case. True is not a value Java knows."
    },
    {
      "id": "syntax-redeclare",
      "topic": "Syntax errors",
      "prompt": "This doesn't compile. Why?",
      "code": "int x = 3;\nint x = 4;",
      "choices": ["x is declared twice", "You can't change a variable", "4 is too big for an int", "It does compile"],
      "answer": 0,
      "explanation": "Line 2 declares a second variable called x. To change x, drop the type: x = 4;"
    },
    {
      "id": "syntax-assign-in-if",
      "topic": "Syntax errors",
      "prompt": "x is an int. Why doesn't this compile?",
      "code": "if (x = 5) {\n    System.out.println(\"five\");\n}",
      "choices": ["= assigns; comparing needs ==", "The braces are wrong", "println needs a semicolon outside the braces", "It does compile"],
      "answer": 0,
      "explanation": "x = 5 stores 5 in x and gives an int, but if needs a boolean. To compare, use x == 5."
    },

    {
      "id": "if-else-value",
      "topic": "if/else",
      "prompt": "What is x after this runs?",
      "code": "int x = 7;\nif (x > 5) {\n    x = x - 5;\n} else {\n    x = x + 5;\n}",
      "choices": ["2", "12", "7", "-3"],
      "answer": 0,
      "explanation": "7 > 5 is true, so only the first block runs: x = 7 - 5 = 2. The else block is skipped."
    },
    {
      "id": "if-fizzbuzz",
      "topic": "if/else",
      "prompt": "What does this print?",
      "code": "int n = 15;\nif (n % 3 == 0) System.out.print(\"Fizz\");\nif (n % 5 == 0) System.out.print(\"Buzz\");",
      "choices": ["FizzBuzz", "Fizz", "Buzz", "Nothing"],
      "answer": 0,
      "explanation": "These are two separate ifs, not if/else, so both are checked. 15 divides by 3 and by 5: FizzBuzz."
    },
    {
      "id": "if-else-if-skipped",
      "topic": "if/else",
      "prompt": "What is a after this runs?",
      "code": "int a = 3;\nif (a > 1) {\n    a = a * 2;\n} else if (a > 4) {\n    a = a * 10;\n}",
      "choices": ["6", "60", "3", "30"],
      "answer": 0,
      "explanation": "3 > 1, so a becomes 6. Because the first branch ran, the else if is never checked, even though 6 > 4."
    },
    {
      "id": "if-dangling-else",
      "topic": "if/else",
      "prompt": "What does this print? (Look carefully: the indentation doesn't matter to Java.)",
      "code": "int t = 10;\nif (t > 5)\n    if (t > 20) System.out.print(\"A\");\n    else System.out.print(\"B\");",
      "choices": ["B", "A", "Nothing", "AB"],
      "answer": 0,
      "explanation": "An else belongs to the nearest if, here if (t > 20). t > 5 is true, t > 20 is false, so B is printed."
    },
    {
      "id": "if-grade-order",
      "topic": "if/else",
      "prompt": "What is grade after this runs?",
      "code": "int score = 85;\nString grade = \"F\";\nif (score >= 50) {\n    grade = \"P\";\n} else if (score >= 85) {\n    grade = \"HD\";\n}",
      "choices": ["P", "HD", "F", "PHD"],
      "answer": 0,
      "explanation": "The first true branch wins. 85 >= 50, so grade is P and the HD branch is never reached. Check the biggest case first."
    },
    {
      "id": "if-or-not",
      "topic": "if/else",
      "prompt": "What does this print?",
      "code": "boolean raining = false;\nboolean cold = true;\nif (raining || !cold) {\n    System.out.print(\"stay in\");\n} else {\n    System.out.print(\"go out\");\n}",
      "choices": ["go out", "stay in", "stay ingo out", "Nothing"],
      "answer": 0,
      "explanation": "raining is false and !cold is false, so false || false is false. The else runs: go out."
    }
  ],

  "library": [
    "Welcome to the library! This area is about the basics: arithmetic, boolean logic, syntax errors and if/else.",
    "Arithmetic: * / % happen before + -. Same precedence goes left to right. int / int throws away the fraction: 7 / 2 is 3, and -7 / 2 is -3. % is the remainder: 17 % 5 is 2.",
    "Boolean logic: ! first, then &&, then ||. && and || stop early: in a && b, if a is false, b is never looked at. !(a && b) is the same as !a || !b.",
    "Syntax errors: Java is case-sensitive (int, true). Every statement ends with ;. Every { needs a }. = stores a value; == compares. A variable is declared once.",
    "if/else: in an if / else if / else chain, only the first true branch runs. An else belongs to the nearest if. Two separate ifs are both checked.",
    "The Branching Ogre guards the east. It will only fight you once you've answered most of this area's questions correctly at least once."
  ]
}
;
