# Books Library

A personal ebook collection (PDFs). Not a code repository.

## Layout

```
books/
└── Humble Bundles/
    └── No Starch Press/   # 35 PDFs, ~512 MB, flat folder, files named "<Title>.pdf"
```

## Catalogue: Humble Bundles / No Starch Press

Authors are from general knowledge; the PDFs carry no author metadata. Page counts are from the PDF files.

### Programming Languages
| Title | Author(s) | Pages |
|---|---|---|
| Effective C, 2nd Edition | Robert C. Seacord | 314 |
| The Rust Programming Language, 3rd Edition | Steve Klabnik, Carol Nichols, Chris Krycho | 626 |
| Total TypeScript | Matt Pocock | 435 |
| Learn You a Haskell for Great Good! | Miran Lipovača | 400 |
| Land of Lisp | Conrad Barski | 508 |
| Practical Julia | Lee Phillips | 530 |
| The Art of R Programming | Norman Matloff | 402 |
| The Book of R | Tilman M. Davies | 835 |

### Python Projects
| Title | Author(s) | Pages |
|---|---|---|
| Impractical Python Projects | Lee Vaughan | 428 |
| Real-World Python | Lee Vaughan | 362 |

### Algorithms, Data Structures & Problem Solving
| Title | Author(s) | Pages |
|---|---|---|
| Algorithmic Thinking, 2nd Edition | Daniel Zingaro | 482 |
| Dive Into Algorithms | Bradford Tuckfield | 249 |
| Data Structures and Algorithms in JavaScript | Federico Kereki | 595 |
| Think Like a Programmer | V. Anton Spraul | 259 |

### Computer Systems, Architecture & Low-Level
| Title | Author(s) | Pages |
|---|---|---|
| Computer Architecture | Charles Fox | 499 |
| Introduction to Computer Organization - ARM Edition | Robert G. Plantz | 520 |
| The Art of ARM Assembly, Volume 1 | Randall Hyde | 1066 |
| Write Great Code, Volume 2, 2nd Edition | Randall Hyde | 656 |
| How Computers Really Work | Matthew Justice | 393 |
| The Secret Life of Programs | Jonathan E. Steinhart | 507 |
| How Software Works | V. Anton Spraul | 217 |
| Writing a C Compiler | Nora Sandler | 904 |
| Quantum Computing | — | 427 |

### Machine Learning & AI
| Title | Author(s) | Pages |
|---|---|---|
| Deep Learning - A Visual Approach | Andrew Glassner | 1015 |
| Practical Deep Learning | Ronald T. Kneusel | 464 |
| Math for Deep Learning | Ronald T. Kneusel | 347 |
| How AI Works | Ronald T. Kneusel | 195 |
| The Art of Machine Learning | Norman Matloff | 272 |
| Machine Learning Q and AI | Sebastian Raschka | 267 |

### Math, Statistics & Data Science
| Title | Author(s) | Pages |
|---|---|---|
| Math for Programming | Ronald T. Kneusel | 507 |
| The Art of Randomness | Ronald T. Kneusel | 402 |
| Bayesian Statistics the Fun Way | Will Kurt | 290 |
| Dive into Data Science | Bradford Tuckfield | 290 |
| The Shape of Data | Colleen M. Farrelly, Yaé Ulrich Gaba | 266 |

### Graphics
| Title | Author(s) | Pages |
|---|---|---|
| Computer Graphics from Scratch | Gabriel Gambetta | 252 |

## Notes for Claude
- Keep this catalogue in sync when books are added, removed or moved: add new rows under the closest category, with a page count from `mdls -raw -name kMDItemNumberOfPages "<file>"`.
- New bundles or publishers go in their own folder under `Humble Bundles/` (or a new top-level folder) and get their own catalogue section here.
- `pdftotext`/`pypdf` are not installed; Spotlight (`mdls`) gives titles and page counts but not authors.
